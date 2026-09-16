import "server-only";
import type { Mock, MockResponse, Rule } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildPrefixMap, effectivePath } from "@/server/folder-runtime";

export type CompiledResponse = MockResponse & { rules: Rule[] };
export interface BoundMiddleware {
  order: number;
  middleware: { id: string; name: string; code: string; isEnabled: boolean };
}
export interface EffectiveMiddleware {
  name: string;
  code: string;
}
export type MockWithResponses = Mock & {
  responses: CompiledResponse[];
  middlewares: BoundMiddleware[];
};

export interface MockEntry {
  mock: MockWithResponses;
  paramNames: string[];
  effectivePath: string;
  middlewares: EffectiveMiddleware[];
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
    const [mocks, folders] = await Promise.all([
      prisma.mock.findMany({
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
      }),
      prisma.folder.findMany({
        select: {
          id: true,
          parentId: true,
          prefix: true,
          middlewares: {
            where: { middleware: { isEnabled: true } },
            orderBy: { order: "asc" },
            include: { middleware: { select: { name: true, code: true } } },
          },
        },
      }),
    ]);

    const prefixMap = buildPrefixMap(folders);

    // Middlewares próprios de cada pasta.
    const folderOwnMw = new Map<string, EffectiveMiddleware[]>(
      folders.map((f) => [f.id, f.middlewares.map((m) => ({ name: m.middleware.name, code: m.middleware.code }))]),
    );
    const folderParent = new Map<string, string | null>(folders.map((f) => [f.id, f.parentId]));
    const mwMemo = new Map<string, EffectiveMiddleware[]>();
    const accMw = (id: string | null): EffectiveMiddleware[] => {
      if (!id) return [];
      const cached = mwMemo.get(id);
      if (cached) return cached;
      mwMemo.set(id, []); // guarda contra ciclo
      const chain = [...accMw(folderParent.get(id) ?? null), ...(folderOwnMw.get(id) ?? [])];
      mwMemo.set(id, chain);
      return chain;
    };

    const byExact = new Map<string, MockEntry>();
    const byTemplate: TemplateEntry[] = [];

    for (const mock of mocks) {
      const effPath = effectivePath(prefixMap, mock.folderId, mock.path);
      const { regex, paramNames, isStatic } = compilePath(effPath);
      const middlewares: EffectiveMiddleware[] = [
        ...accMw(mock.folderId),
        ...(mock as MockWithResponses).middlewares.map((m) => ({
          name: m.middleware.name,
          code: m.middleware.code,
        })),
      ];
      const entry: MockEntry = {
        mock: mock as MockWithResponses,
        paramNames,
        effectivePath: effPath,
        middlewares,
      };
      if (isStatic) {
        byExact.set(`${mock.method} ${effPath}`, entry);
      } else {
        byTemplate.push({ ...entry, method: mock.method, regex });
      }
    }

    // Mais específico primeiro: menos params, path mais longo.
    byTemplate.sort((a, b) => {
      if (a.paramNames.length !== b.paramNames.length) {
        return a.paramNames.length - b.paramNames.length;
      }
      return b.effectivePath.length - a.effectivePath.length;
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
