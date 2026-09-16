import "server-only";
import { Worker } from "node:worker_threads";
import path from "node:path";
import { env } from "@/lib/env";

export interface SandboxLib {
  name: string;
  kind: "NPM_WHITELISTED" | "UTILITY";
  packageName?: string | null;
  sourceCode?: string | null;
}

export interface SandboxCtxData {
  request: { method: string; url: string; ip: string | null };
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  body: unknown;
  vars?: Record<string, string>;
  state?: Record<string, unknown>;
}

export interface SandboxLogLine {
  level: string;
  message: string;
}

export interface SandboxResult {
  ok: boolean;
  result?: {
    status?: number;
    headers?: Record<string, string>;
    body?: unknown;
  };
  error?: { message: string; stack?: string | null };
  logs: SandboxLogLine[];
  durationMs: number;
  timedOut?: boolean;
}

interface PendingJob {
  resolve: (r: SandboxResult) => void;
  startedAt: number;
  timer: NodeJS.Timeout;
}

interface WorkerMessage {
  id: number;
  ok: boolean;
  result?: SandboxResult["result"];
  error?: SandboxResult["error"];
  logs?: SandboxLogLine[];
}

const WORKER_PATH = path.join(process.cwd(), "sandbox", "worker.mjs");

class SandboxRunner {
  private worker: Worker | null = null;
  private pending: Map<number, PendingJob> = new Map();
  private seq = 0;
  private chain: Promise<unknown> = Promise.resolve();

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(WORKER_PATH, {
      execArgv: ["--experimental-vm-modules", "--no-warnings"],
      resourceLimits: {
        maxOldGenerationSizeMb: env.SANDBOX_MEMORY_MB(),
      },
    });
    worker.on("message", (msg: WorkerMessage) => {
      const job = this.pending.get(msg.id);
      if (!job) return;
      clearTimeout(job.timer);
      this.pending.delete(msg.id);
      const durationMs = Date.now() - job.startedAt;
      if (msg.ok) {
        job.resolve({ ok: true, result: msg.result, logs: msg.logs ?? [], durationMs });
      } else {
        job.resolve({ ok: false, error: msg.error, logs: msg.logs ?? [], durationMs });
      }
    });
    worker.on("error", (err) => this.crash(err));
    worker.on("exit", (code) => {
      if (code !== 0) this.crash(new Error(`worker saiu com código ${code}`));
    });
    this.worker = worker;
    return worker;
  }

  private crash(err: Error) {
    for (const [, job] of this.pending) {
      clearTimeout(job.timer);
      job.resolve({
        ok: false,
        error: { message: `Sandbox falhou: ${err.message}` },
        logs: [],
        durationMs: Date.now() - job.startedAt,
      });
    }
    this.pending.clear();
    if (this.worker) {
      this.worker.terminate().catch(() => {});
      this.worker = null;
    }
  }

  private execute(
    code: string,
    ctxData: SandboxCtxData,
    enabledLibs: SandboxLib[],
    timeoutMs: number,
  ): Promise<SandboxResult> {
    return new Promise<SandboxResult>((resolve) => {
      const worker = this.ensureWorker();
      const id = ++this.seq;
      const startedAt = Date.now();
      const timer = setTimeout(() => {
        const job = this.pending.get(id);
        if (!job) return;
        this.pending.delete(id);
        // Loop infinito / trava: mata o worker e recria.
        if (this.worker) {
          this.worker.terminate().catch(() => {});
          this.worker = null;
        }
        resolve({
          ok: false,
          error: { message: `Tempo de execução excedido (${timeoutMs}ms).` },
          logs: [],
          durationMs: Date.now() - startedAt,
          timedOut: true,
        });
      }, timeoutMs + 200);

      this.pending.set(id, { resolve, startedAt, timer });
      worker.postMessage({ id, code, ctxData, enabledLibs, timeoutMs });
    });
  }

  // Serializa as execuções (concorrência 1) para simplificar o timeout/kill.
  runScript(
    code: string,
    ctxData: SandboxCtxData,
    enabledLibs: SandboxLib[],
    timeoutMs = env.SANDBOX_TIMEOUT_MS(),
  ): Promise<SandboxResult> {
    const run = () => this.execute(code, ctxData, enabledLibs, timeoutMs);
    const result = this.chain.then(run, run);
    this.chain = result.catch(() => {});
    return result;
  }
}

const globalForSandbox = globalThis as unknown as {
  __sandboxRunner?: SandboxRunner;
};

export const sandboxRunner =
  globalForSandbox.__sandboxRunner ?? (globalForSandbox.__sandboxRunner = new SandboxRunner());
