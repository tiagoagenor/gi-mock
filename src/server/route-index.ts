import "server-only";
import type { Mock, MockResponse, Rule } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CompiledResponse = MockResponse & { rules: Rule[] };
export interface BoundMiddleware {
  order: number;
  middleware: { id: string; name: string; code: string; isEnabled: boolean };
}
export type MockWithResponses = Mock & {
  responses: CompiledResponse[];
  middlewares: BoundMiddleware[];
};

export interface MockEntry {
  mock: MockWithResponses;
  paramNames: string[];
}

interface TemplateEntry extends MockEntry {
  method: string;
  regex: RegExp;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compilePath(path: string): { regex: RegExp; paramNames: string[]; isStatic: boolean } {
  const parts = path.split("/");
  const paramNames: string[] = [];
  const regexParts = parts.map((p) => {
    if (p.startsWith(":")) {
      paramNames.push(p.slice(1));
      return "([^/]+)";
    }
    if (p === "*" || p === "**") {
      paramNames.push("wildcard");
      return "(.*)";
    }
    return escapeRegex(p);
  });
  return {
    regex: new RegExp("^" + regexParts.join("/") + "$"),
    paramNames,
    isStatic: paramNames.length === 0,
  };
}

class RouteIndex {
  private byExact: Map<string, MockEntry> = new Map();
  private byTemplate: TemplateEntry[] = [];
  private cold = true;
  private building: Promise<void> | null = null;

  seqCursor: Map<string, number> = new Map();
  reqCounter: Map<string, number> = new Map();

  invalidate() {
    this.cold = true;
  }

  private async build() {
    const mocks = (await prisma.mock.findMany({
      where: { isEnabled: true },
      include: {
        responses: {
          orderBy: { order: "asc" },
          include: { rules: { orderBy: { order: "asc" } } },
        },
        middlewares: {
          where: { middleware: { isEnabled: true } },
          orderBy: { order: "asc" },
          include: {
            middleware: { select: { id: true, name: true, code: true, isEnabled: true } },
          },
        },
      },
    })) as MockWithResponses[];

    const byExact = new Map<string, MockEntry>();
    const byTemplate: TemplateEntry[] = [];

    for (const mock of mocks) {
      const { regex, paramNames, isStatic } = compilePath(mock.path);
      const entry: MockEntry = { mock, paramNames };
      if (isStatic) {
        byExact.set(`${mock.method} ${mock.path}`, entry);
      } else {
        byTemplate.push({ ...entry, method: mock.method, regex });
      }
    }

    // Mais específico primeiro: menos params, path mais longo.
    byTemplate.sort((a, b) => {
      if (a.paramNames.length !== b.paramNames.length) {
        return a.paramNames.length - b.paramNames.length;
      }
      return b.mock.path.length - a.mock.path.length;
    });

    this.byExact = byExact;
    this.byTemplate = byTemplate;
    this.cold = false;
  }

  private async ensureBuilt() {
    if (!this.cold) return;
    if (!this.building) {
      this.building = this.build().finally(() => {
        this.building = null;
      });
    }
    await this.building;
  }

  async resolve(
    method: string,
    path: string,
  ): Promise<{ entry: MockEntry; params: Record<string, string> } | null> {
    await this.ensureBuilt();

    const exact = this.byExact.get(`${method} ${path}`);
    if (exact) return { entry: exact, params: {} };

    for (const t of this.byTemplate) {
      if (t.method !== method) continue;
      const m = t.regex.exec(path);
      if (m) {
        const params: Record<string, string> = {};
        t.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(m[i + 1] ?? "");
        });
        return { entry: t, params };
      }
    }
    return null;
  }

  nextSequential(mockId: string, length: number): number {
    const i = this.seqCursor.get(mockId) ?? 0;
    this.seqCursor.set(mockId, length > 0 ? (i + 1) % length : 0);
    return length > 0 ? i % length : 0;
  }

  bumpRequestNumber(mockId: string): number {
    const n = (this.reqCounter.get(mockId) ?? 0) + 1;
    this.reqCounter.set(mockId, n);
    return n;
  }
}

const globalForIndex = globalThis as unknown as { __routeIndex?: RouteIndex };
export const routeIndex = globalForIndex.__routeIndex ?? (globalForIndex.__routeIndex = new RouteIndex());
