"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Plus, Trash2, Save, Loader2, Pin, PinOff, Shield, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialogLike,
} from "@/components/panel/confirm-dialog";
import { MethodBadge } from "@/components/panel/method-badge";
import { StatusBadge } from "@/components/panel/status-badge";
import { ResponseEditor } from "@/components/panel/mocks/response-editor";
import { HTTP_METHODS, type HttpMethod } from "@/lib/http";
import { cn } from "@/lib/utils";
import { api, ApiError } from "@/lib/client/api";
import { DEFAULT_TEST_CTX } from "@/lib/client/test-ctx";
import type { MockDetail, MockResponse, ResponseMode, MiddlewareListItem } from "@/lib/types";

export function MockEditor({
  mockId,
  onMockChanged,
  onDeleted,
}: {
  mockId: string;
  onMockChanged: () => void;
  onDeleted: () => void;
}) {
  const [detail, setDetail] = useState<MockDetail | null>(null);
  const [selectedRid, setSelectedRid] = useState<string | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingResp, setSavingResp] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [availableMw, setAvailableMw] = useState<MiddlewareListItem[]>([]);
  // Estado "limpo" (última versão salva/carregada) para detectar edições não salvas.
  const [pristine, setPristine] = useState<MockDetail | null>(null);

  const load = useCallback(async () => {
    const d = await api.get<MockDetail>(`/painel/api/mocks/${mockId}`);
    // headers vem como Json; garante objeto
    d.responses = d.responses.map((r) => ({
      ...r,
      headers: (r.headers as Record<string, string>) ?? {},
      testRequest: r.testRequest ?? DEFAULT_TEST_CTX,
    }));
    setDetail(d);
    setPristine(JSON.parse(JSON.stringify(d)) as MockDetail);
    setSelectedRid((prev) => (prev && d.responses.some((r) => r.id === prev) ? prev : d.responses[0]?.id ?? null));
  }, [mockId]);

  useEffect(() => {
    setDetail(null);
    load().catch(() => toast.error("Falha ao carregar o mock"));
  }, [load]);

  useEffect(() => {
    api
      .get<MiddlewareListItem[]>("/painel/api/middlewares")
      .then(setAvailableMw)
      .catch(() => {});
  }, []);

  async function setBoundMiddlewares(ids: string[]) {
    try {
      await api.put(`/painel/api/mocks/${mockId}/middlewares`, { middlewareIds: ids });
      await load();
      onMockChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao vincular middleware");
    }
  }

  if (!detail) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" /> Carregando…
      </div>
    );
  }

  const selected = detail.responses.find((r) => r.id === selectedRid) ?? detail.responses[0];

  // Detecção de alterações não salvas (dirty).
  const metaSig = (d: MockDetail) =>
    JSON.stringify([d.method, d.path, d.name ?? "", d.responseMode, d.isEnabled, d.forcedResponseId ?? ""]);
  const respSig = (r: MockResponse) =>
    JSON.stringify([
      r.label ?? "",
      r.statusCode,
      r.headers,
      r.bodyMode,
      r.body ?? "",
      r.code ?? "",
      r.latencyMs,
      r.rulesOperator,
      r.isDefault,
      r.rules,
      r.testRequest ?? "",
    ]);
  const metaDirty = pristine ? metaSig(detail) !== metaSig(pristine) : false;
  const dirtyRids = new Set<string>();
  if (pristine) {
    for (const r of detail.responses) {
      const p = pristine.responses.find((x) => x.id === r.id);
      if (!p || respSig(r) !== respSig(p)) dirtyRids.add(r.id);
    }
  }
  const anyDirty = metaDirty || dirtyRids.size > 0;

  function patchMeta(patch: Partial<MockDetail>) {
    setDetail((d) => (d ? { ...d, ...patch } : d));
  }
  function patchResponse(rid: string, patch: Partial<MockResponse>) {
    setDetail((d) =>
      d ? { ...d, responses: d.responses.map((r) => (r.id === rid ? { ...r, ...patch } : r)) } : d,
    );
  }

  function metaPayload() {
    const d = detail!;
    return {
      method: d.method,
      path: d.path,
      name: d.name,
      responseMode: d.responseMode,
      isEnabled: d.isEnabled,
      forcedResponseId: d.forcedResponseId,
    };
  }
  function responsePayload(r: MockResponse) {
    return {
      label: r.label,
      statusCode: r.statusCode,
      headers: r.headers,
      bodyMode: r.bodyMode,
      body: r.body,
      code: r.code,
      latencyMs: r.latencyMs,
      rulesOperator: r.rulesOperator,
      isDefault: r.isDefault,
      testRequest: r.testRequest,
      rules: r.rules.map((rule, i) => ({ ...rule, order: i })),
    };
  }

  async function saveMeta() {
    setSavingMeta(true);
    try {
      await api.patch(`/painel/api/mocks/${mockId}`, metaPayload());
      toast.success("Mock salvo");
      onMockChanged();
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao salvar");
    } finally {
      setSavingMeta(false);
    }
  }

  async function saveResponse() {
    if (!selected) return;
    setSavingResp(true);
    try {
      await api.patch(`/painel/api/responses/${selected.id}`, responsePayload(selected));
      toast.success("Resposta salva");
      onMockChanged();
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao salvar resposta");
    } finally {
      setSavingResp(false);
    }
  }

  // Salva só o request de teste da resposta selecionada.
  async function saveTestRequest() {
    if (!selected) return;
    setSavingResp(true);
    try {
      await api.patch(`/painel/api/responses/${selected.id}`, { testRequest: selected.testRequest });
      toast.success("Request de teste salvo");
      onMockChanged();
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao salvar");
    } finally {
      setSavingResp(false);
    }
  }

  // Salva tudo: dados do mock + todas as respostas alteradas (incl. request de teste).
  async function saveAll() {
    setSavingResp(true);
    try {
      if (metaDirty) await api.patch(`/painel/api/mocks/${mockId}`, metaPayload());
      for (const r of detail!.responses) {
        if (dirtyRids.has(r.id)) {
          await api.patch(`/painel/api/responses/${r.id}`, responsePayload(r));
        }
      }
      toast.success("Tudo salvo");
      onMockChanged();
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao salvar");
    } finally {
      setSavingResp(false);
    }
  }

  async function addResponse() {
    try {
      const r = await api.post<MockResponse>(`/painel/api/mocks/${mockId}/responses`);
      await load();
      setSelectedRid(r.id);
      onMockChanged();
    } catch {
      toast.error("Erro ao adicionar resposta");
    }
  }

  async function deleteResponse() {
    if (!selected) return;
    try {
      await api.del(`/painel/api/responses/${selected.id}`);
      await load();
      onMockChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao excluir resposta");
    }
  }

  async function deleteMock() {
    try {
      await api.del(`/painel/api/mocks/${mockId}`);
      toast.success("Mock excluído");
      onDeleted();
    } catch {
      toast.error("Erro ao excluir o mock");
    }
  }

  const effPath = detail.effectivePath ?? detail.path;
  const callUrl =
    typeof window !== "undefined" ? `${window.location.origin}${effPath}` : effPath;

  return (
    <div className="flex h-full flex-col">
      {/* Cabeçalho do mock */}
      <div className="space-y-2.5 border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={detail.method} onValueChange={(v) => patchMeta({ method: v as HttpMethod })}>
            <SelectTrigger className="h-8 w-[112px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HTTP_METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  <MethodBadge method={m} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={detail.path}
            onChange={(e) => patchMeta({ path: e.target.value })}
            className="h-8 flex-1 font-mono"
            placeholder="/caminho/:param"
          />
          <div className="flex items-center gap-2">
            <Switch
              checked={detail.isEnabled}
              onCheckedChange={(v) => patchMeta({ isEnabled: v })}
              id="enabled"
            />
            <label htmlFor="enabled" className="text-[12px] text-muted-foreground">
              Ativo
            </label>
          </div>
          {anyDirty && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-warning/15 px-2 py-1 text-[12px] font-medium text-warning">
              <span className="size-1.5 rounded-full bg-warning" />
              Não salvo
            </span>
          )}
          <Button
            size="sm"
            onClick={saveMeta}
            disabled={savingMeta}
            className={cn(metaDirty && "ring-2 ring-warning/50")}
          >
            {savingMeta ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Salvar
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4 text-muted-foreground" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <Input
            value={detail.name ?? ""}
            onChange={(e) => patchMeta({ name: e.target.value })}
            className="h-7 w-[240px]"
            placeholder="Nome do mock (opcional)"
          />
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <span>Modo:</span>
            <Select
              value={detail.responseMode}
              onValueChange={(v) => patchMeta({ responseMode: v as ResponseMode })}
            >
              <SelectTrigger className="h-7 w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RULES">Por regras</SelectItem>
                <SelectItem value="SEQUENTIAL">Sequencial</SelectItem>
                <SelectItem value="RANDOM">Aleatório</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1.5">
                <Shield className="size-3.5" />
                Middlewares
                {detail.middlewares.length > 0 && (
                  <span className="rounded bg-primary/15 px-1 font-mono text-[11px] text-primary">
                    {detail.middlewares.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[280px] p-2">
              <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Rodam antes deste mock (em ordem)
              </p>
              {availableMw.length === 0 ? (
                <p className="px-1 py-2 text-[12px] text-muted-foreground">
                  Nenhum middleware criado ainda.
                </p>
              ) : (
                <div className="space-y-0.5">
                  {availableMw.map((mw) => {
                    const bound = detail.middlewares.some((m) => m.middlewareId === mw.id);
                    return (
                      <label
                        key={mw.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-accent"
                      >
                        <Checkbox
                          checked={bound}
                          onCheckedChange={(v) => {
                            const current = detail.middlewares.map((m) => m.middlewareId);
                            const next = v
                              ? [...current, mw.id]
                              : current.filter((id) => id !== mw.id);
                            setBoundMiddlewares(next);
                          }}
                        />
                        <Shield
                          className={cn(
                            "size-3.5",
                            mw.isEnabled ? "text-primary" : "text-muted-foreground",
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate text-[13px]">{mw.name}</span>
                        {!mw.isEnabled && (
                          <span className="text-[10px] text-muted-foreground">inativo</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </PopoverContent>
          </Popover>

          <button
            onClick={() => {
              navigator.clipboard.writeText(callUrl);
              toast.success("URL copiada");
            }}
            className="flex items-center gap-1.5 font-mono text-[12px] text-muted-foreground hover:text-foreground"
          >
            <Copy className="size-3.5" />
            {callUrl}
          </button>
          <button
            onClick={() => {
              const link = `${window.location.origin}/painel/mocks/${detail.hash}`;
              navigator.clipboard.writeText(link);
              toast.success("Link do mock copiado");
            }}
            className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
            title="Copiar link direto deste mock"
          >
            <Link2 className="size-3" />#{detail.hash}
          </button>
        </div>
      </div>

      {/* Corpo: lista de responses + editor */}
      <div className="flex min-h-0 flex-1">
        <div className="flex w-[210px] shrink-0 flex-col border-r border-border">
          <div className="flex h-9 items-center justify-between border-b border-border px-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Respostas
            </span>
            <Button variant="ghost" size="icon-sm" onClick={addResponse}>
              <Plus className="size-4" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-1.5">
            {detail.responses.map((r) => {
              const active = r.id === selected?.id;
              const forced = r.id === detail.forcedResponseId;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRid(r.id)}
                  className={cn(
                    "group relative flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left",
                    active ? "bg-accent" : "hover:bg-accent",
                  )}
                >
                  <StatusBadge code={r.statusCode} />
                  <span className="min-w-0 flex-1 truncate text-[13px]">
                    {r.label || "sem rótulo"}
                  </span>
                  {dirtyRids.has(r.id) && (
                    <span
                      className="size-1.5 shrink-0 rounded-full bg-warning"
                      title="Alterações não salvas"
                    />
                  )}
                  {r.isDefault && (
                    <span className="rounded bg-secondary px-1 text-[10px] text-secondary-foreground">
                      def
                    </span>
                  )}
                  <Pin
                    className={cn(
                      "size-3 shrink-0",
                      forced ? "text-primary" : "hidden text-muted-foreground group-hover:block",
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      patchMeta({ forcedResponseId: forced ? null : r.id });
                    }}
                  />
                </button>
              );
            })}
          </div>
          {detail.forcedResponseId && (
            <div className="flex items-center gap-1.5 border-t border-border px-3 py-2 text-[11px] text-primary">
              <PinOff className="size-3" />
              Resposta fixada (salve para aplicar)
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {selected && (
            <ResponseEditor
              key={selected.id}
              response={selected}
              mockId={mockId}
              onChange={(patch) => patchResponse(selected.id, patch)}
              onSave={saveResponse}
              onDelete={deleteResponse}
              onSaveTest={saveTestRequest}
              onSaveAll={saveAll}
              method={detail.method}
              canDelete={detail.responses.length > 1}
              saving={savingResp}
              dirty={dirtyRids.has(selected.id)}
            />
          )}
        </div>
      </div>

      <AlertDialogLike
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir mock?"
        description={`${detail.method} ${detail.path} e todas as suas respostas serão removidos.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={deleteMock}
      />
    </div>
  );
}
