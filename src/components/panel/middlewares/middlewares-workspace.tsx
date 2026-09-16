"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Shield, Save, Trash2, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MonacoEditor } from "@/components/panel/monaco-editor";
import { AlertDialogLike } from "@/components/panel/confirm-dialog";
import { Loading } from "@/components/panel/loading";
import { cn } from "@/lib/utils";
import { api, ApiError } from "@/lib/client/api";
import type { MiddlewareDetail, MiddlewareListItem } from "@/lib/types";
import type { SandboxResult } from "@/server/sandbox/runner";

const DEFAULT_TEST_CTX = JSON.stringify(
  { method: "GET", headers: { authorization: "Bearer COLE_UM_TOKEN_AQUI" }, query: {}, params: {}, body: null },
  null,
  2,
);

export function MiddlewaresWorkspace() {
  const [list, setList] = useState<MiddlewareListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MiddlewareDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<SandboxResult | null>(null);
  const [testCtx, setTestCtx] = useState(DEFAULT_TEST_CTX);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const items = await api.get<MiddlewareListItem[]>("/painel/api/middlewares");
      setList(items);
      return items;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList().catch(() => toast.error("Falha ao carregar middlewares"));
  }, [loadList]);

  const loadDetail = useCallback(async (id: string) => {
    const d = await api.get<MiddlewareDetail>(`/painel/api/middlewares/${id}`);
    setDetail(d);
    setResult(null);
  }, []);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId).catch(() => toast.error("Falha ao carregar"));
    else setDetail(null);
  }, [selectedId, loadDetail]);

  async function create() {
    try {
      const name = `middleware-${list.length + 1}`;
      const mw = await api.post<MiddlewareDetail>("/painel/api/middlewares", { name });
      await loadList();
      setSelectedId(mw.id);
      toast.success("Middleware criado (template de JWT)");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao criar");
    }
  }

  async function save() {
    if (!detail) return;
    setSaving(true);
    try {
      await api.patch(`/painel/api/middlewares/${detail.id}`, {
        name: detail.name,
        code: detail.code,
        isEnabled: detail.isEnabled,
      });
      toast.success("Middleware salvo");
      loadList();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!detail) return;
    try {
      await api.del(`/painel/api/middlewares/${detail.id}`);
      toast.success("Middleware removido");
      setSelectedId(null);
      loadList();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao remover");
    }
  }

  async function runTest() {
    if (!detail) return;
    setTesting(true);
    setResult(null);
    let request: unknown = {};
    try {
      request = JSON.parse(testCtx || "{}");
    } catch {
      toast.error("Contexto de teste inválido (JSON)");
      setTesting(false);
      return;
    }
    try {
      const res = await api.post<SandboxResult>("/painel/api/sandbox/test", {
        code: detail.code,
        request,
      });
      setResult(res);
    } finally {
      setTesting(false);
    }
  }

  function patch(p: Partial<MiddlewareDetail>) {
    setDetail((d) => (d ? { ...d, ...p } : d));
  }

  return (
    <div className="flex h-full">
      {/* Lista */}
      <div className="flex w-[280px] shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex h-9 items-center justify-between border-b border-border pl-3 pr-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Middlewares
          </span>
          <Button variant="ghost" size="icon-sm" onClick={create} title="Novo middleware">
            <Plus className="size-4" />
          </Button>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          {loading ? (
            <Loading className="h-32" />
          ) : (
            <div className="p-1.5">
              {list.map((mw) => (
                <button
                  key={mw.id}
                  onClick={() => setSelectedId(mw.id)}
                  className={cn(
                    "relative flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left",
                    mw.id === selectedId ? "bg-accent" : "hover:bg-accent",
                  )}
                >
                  {mw.id === selectedId && (
                    <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                  )}
                  <Shield
                    className={cn("size-3.5 shrink-0", mw.isEnabled ? "text-primary" : "text-muted-foreground")}
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px]">{mw.name}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{mw._count.mocks}</span>
                </button>
              ))}
              {list.length === 0 && (
                <p className="px-2 py-6 text-center text-[13px] text-muted-foreground">
                  Nenhum middleware. Crie o primeiro (vem com validação de JWT pronta).
                </p>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Editor */}
      <div className="min-w-0 flex-1">
        {!detail ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Shield className="size-6 text-muted-foreground" strokeWidth={1.5} />
            <div>
              <p className="text-[13px] text-muted-foreground">Selecione um middleware</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">ou crie um novo.</p>
            </div>
            <Button size="sm" variant="outline" onClick={create}>
              <Plus className="size-4" />
              Novo middleware
            </Button>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
              <Input
                value={detail.name}
                onChange={(e) => patch({ name: e.target.value })}
                className="h-8 w-[240px] font-mono"
                placeholder="nome-do-middleware"
              />
              <div className="flex items-center gap-2">
                <Switch
                  id="mw-enabled"
                  checked={detail.isEnabled}
                  onCheckedChange={(v) => patch({ isEnabled: v })}
                />
                <Label htmlFor="mw-enabled" className="text-[12px] text-muted-foreground">
                  Ativo
                </Label>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="size-4" />
                  Excluir
                </Button>
                <Button size="sm" onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Salvar
                </Button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-[1fr_360px]">
              <div className="flex min-h-0 flex-col border-r border-border">
                <div className="flex h-9 items-center justify-between border-b border-border px-3">
                  <span className="font-mono text-[12px] text-muted-foreground">middleware.mjs</span>
                  <Button size="sm" onClick={runTest} disabled={testing}>
                    {testing ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                    Testar
                  </Button>
                </div>
                <div className="min-h-0 flex-1">
                  <MonacoEditor
                    language="javascript"
                    value={detail.code}
                    onChange={(v) => patch({ code: v })}
                  />
                </div>
              </div>
              <div className="flex min-h-0 flex-col">
                <div className="border-b border-border px-3 py-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Request de teste (JSON)
                  </span>
                  <div
                    className="mt-1 resize-y overflow-hidden rounded border border-border"
                    style={{ height: 170, minHeight: 90, maxHeight: 500 }}
                  >
                    <MonacoEditor language="json" value={testCtx} onChange={setTestCtx} />
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-auto p-3">
                  <TestOutput result={result} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <AlertDialogLike
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir middleware?"
        description="Ele será desvinculado de todos os mocks."
        confirmLabel="Excluir"
        destructive
        onConfirm={remove}
      />
    </div>
  );
}

function TestOutput({ result }: { result: SandboxResult | null }) {
  if (!result) return <p className="text-[13px] text-muted-foreground">Execute para ver o retorno.</p>;
  if (!result.ok) {
    return (
      <div className="border-l-2 border-destructive bg-destructive/10 px-3 py-2">
        <p className="text-[12px] font-semibold text-destructive">
          {result.timedOut ? "Timeout" : "Erro"}
        </p>
        <p className="mt-1 whitespace-pre-wrap font-mono text-[12px]">{result.error?.message}</p>
      </div>
    );
  }
  const out = result.result as
    | undefined
    | { status?: number; body?: unknown; state?: unknown };
  const blocked = out && typeof out.status === "number";
  return (
    <div className="space-y-2">
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[12px] font-medium",
          blocked ? "bg-destructive/12 text-destructive" : "bg-success/12 text-success",
        )}
      >
        {blocked ? `Bloqueia (${out!.status})` : "Passa →"}
        <span className="font-mono text-muted-foreground">{result.durationMs}ms</span>
      </div>
      <pre className="overflow-auto rounded border border-border bg-surface p-2 font-mono text-[12px]">
        {JSON.stringify(out ?? { continua: true }, null, 2)}
      </pre>
      {result.logs.length > 0 && (
        <pre className="overflow-auto rounded border border-border bg-surface p-2 font-mono text-[12px]">
          {result.logs.map((l) => l.message).join("\n")}
        </pre>
      )}
    </div>
  );
}
