import "server-only";
import { prisma } from "@/lib/prisma";

const MAX_BODY = 64 * 1024; // 64 KB

function truncate(s: string | null | undefined): string | null {
  if (s == null) return null;
  return s.length > MAX_BODY ? s.slice(0, MAX_BODY) + "\n…[truncado]" : s;
}

export interface LogInput {
  mockId?: string | null;
  responseId?: string | null;
  method: string;
  path: string;
  statusCode: number;
  ip?: string | null;
  requestHeaders?: Record<string, string> | null;
  requestBody?: string | null;
  requestQuery?: Record<string, string | string[]> | null;
  responseHeaders?: Record<string, string> | null;
  responseBody?: string | null;
  responseBytes?: number | null;
  durationMs: number;
  matchedByRules?: boolean;
  scriptError?: string | null;
}

// Gravação assíncrona (não bloqueia a resposta ao cliente).
export function logRequest(input: LogInput): void {
  void prisma.requestLog
    .create({
      data: {
        mockId: input.mockId ?? null,
        responseId: input.responseId ?? null,
        method: input.method,
        path: input.path.slice(0, 1024),
        statusCode: input.statusCode,
        ip: input.ip ?? null,
        requestHeaders: input.requestHeaders ?? undefined,
        requestBody: truncate(input.requestBody),
        requestQuery: input.requestQuery ?? undefined,
        responseHeaders: input.responseHeaders ?? undefined,
        responseBody: truncate(input.responseBody),
        responseBytes: input.responseBytes ?? null,
        durationMs: input.durationMs,
        matchedByRules: input.matchedByRules ?? false,
        scriptError: input.scriptError ?? null,
      },
    })
    .catch((e) => {
      console.error("[log-service] falha ao gravar log:", e?.message);
    });
}
