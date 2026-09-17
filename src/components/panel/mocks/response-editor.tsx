"use client";

import { useEffect, useState } from "react";
import { Play, Trash2, Save, Loader2, FileJson, Code2, ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { DEFAULT_TEST_CTX } from "@/lib/client/test-ctx";
import { StatusSelect } from "@/components/panel/status-select";
import { StatusBadge } from "@/components/panel/status-badge";
import { MonacoEditor } from "@/components/panel/monaco-editor";
import { RulesEditor } from "@/components/panel/mocks/rules-editor";
import { HeadersEditor } from "@/components/panel/mocks/headers-editor";
import { api } from "@/lib/client/api";
import type { MockResponse } from "@/lib/types";
import type { SandboxResult } from "@/server/sandbox/runner";

// Template base carregado quando o usuário troca para "Código JS" e ainda está vazio.
// O status e os headers vêm da configuração da resposta (seletor de Status e aba
// Headers). Retorne só o body — ou inclua status/headers aqui para sobrescrever.
const DEFAULT_SCRIPT = `export default async function handler(ctx) {
  return {
    body: {
      id: ctx.params.id ?? ctx.faker.string.uuid(),
      name: ctx.faker.person.fullName(),
      email: ctx.faker.internet.email(),
      createdAt: new Date().toISOString(),
      query: ctx.query,
    },
  };
}
`;

// Cada resposta pode ter vários requests de teste nomeados.
interface TestCase {
  id: string;
  name: string;
  request: string; // JSON do request de teste
}

const rid = () => Math.random().toString(36).slice(2, 9);
const newCase = (name: string): TestCase => ({ id: rid(), name, request: DEFAULT_TEST_CTX });

function parseCases(raw: string | null): TestCase[] {
  if (!raw) return [newCase("Padrão")];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const list = parsed
        .filter((x) => x && typeof x === "object")
        .map((x, i) => ({
          id: typeof x.id === "string" ? x.id : rid(),
          name: typeof x.name === "string" ? x.name : `Teste ${i + 1}`,
          request:
            typeof x.request === "string" ? x.request : JSON.stringify(x.request ?? {}, null, 2),
        }));
      return list.length ? list : [newCase("Padrão")];
    }
    // Formato antigo: um único objeto de request.
    return [{ id: rid(), name: "Padrão", request: raw }];
  } catch {
    return [newCase("Padrão")];
  }
}

export function ResponseEditor({
  response,
  onChange,
  onSave,
  onDelete,
  onSaveTest,
  onSaveAll,
  canDelete,
  saving,
  mockId,
  method,
  dirty = false,
}: {
  response: MockResponse;
  onChange: (patch: Partial<MockResponse>) => void;
  onSave: () => void;
  onDelete: () => void;
  onSaveTest: () => void;
  onSaveAll: () => void;
  canDelete: boolean;
  saving: boolean;
  mockId: string;
  method: string;
  dirty?: boolean;
}) {
  const [cases, setCases] = useState<TestCase[]>(() => parseCases(response.testRequest));
  const [activeCaseId, setActiveCaseId] = useState<string>("");
  const activeCase = cases.find((c) => c.id === activeCaseId) ?? cases[0];
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<SandboxResult | null>(null);

  function commitCases(next: TestCase[]) {
    setCases(next);
    onChange({ testRequest: JSON.stringify(next.map(({ id, name, request }) => ({ id, name, request }))) });
  }
  function updateActiveRequest(v: string) {
    commitCases(cases.map((c) => (c.id === activeCase.id ? { ...c, request: v } : c)));
  }
  function renameActive(name: string) {
    commitCases(cases.map((c) => (c.id === activeCase.id ? { ...c, name } : c)));
  }
  function addCase() {
    const c = newCase(`Teste ${cases.length + 1}`);
    commitCases([...cases, c]);
    setActiveCaseId(c.id);
  }
  function removeActiveCase() {
    if (cases.length <= 1) return;
    const next = cases.filter((c) => c.id !== activeCase.id);
    commitCases(next);
    setActiveCaseId(next[0].id);
  }

  // Se a resposta já está em modo Código porém sem código, carrega o template base.
  useEffect(() => {
    if (response.bodyMode === "SCRIPT" && !response.code?.trim()) {
      onChange({ code: DEFAULT_SCRIPT });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runTest() {
    setTesting(true);
    setResult(null);
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(activeCase.request || "{}");
    } catch {
      toast.error("Contexto de teste inválido (JSON)");
      setTesting(false);
      return;
    }
    // O método vem do mock (não fica no JSON de teste).
    const request = { ...parsed, method };
    try {
      const res = await api.post<SandboxResult>(`/painel/api/mocks/${mockId}/test`, {
        code: response.code ?? "",
        request,
        defaultStatus: response.statusCode,
        defaultHeaders: response.headers,
      });
      setResult(res);
    } catch {
      toast.error("Falha ao executar o teste");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Barra superior da response */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2.5">
        <StatusSelect value={response.statusCode} onChange={(c) => onChange({ statusCode: c })} />
        <Input
          placeholder="Rótulo da resposta"
          value={response.label ?? ""}
          onChange={(e) => onChange({ label: e.target.value })}
          className="h-8 w-[200px]"
        />
        <div className="flex items-center gap-2">
          <Switch
            id="latency"
            checked={response.latencyMs > 0}
            onCheckedChange={(v) => onChange({ latencyMs: v ? 500 : 0 })}
          />
          <Label htmlFor="latency" className="text-[13px] text-muted-foreground">
            Latência
          </Label>
          {response.latencyMs > 0 && (
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={0}
                value={response.latencyMs}
                onChange={(e) => onChange({ latencyMs: Number(e.target.value) || 0 })}
                className="h-8 w-[84px] font-mono"
              />
              <span className="text-[12px] text-muted-foreground">ms</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="isDefault"
            checked={response.isDefault}
            onCheckedChange={(v) => onChange({ isDefault: v })}
          />
          <Label htmlFor="isDefault" className="text-[13px] text-muted-foreground">
            Padrão
          </Label>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={onDelete} disabled={!canDelete}>
            <Trash2 className="size-4" />
            Excluir
          </Button>
          <div className="flex items-center">
            <Button size="sm" onClick={onSave} disabled={saving} className="rounded-r-none">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Salvar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  disabled={saving}
                  className="w-6 rounded-l-none border-l border-primary-foreground/25 px-0"
                  aria-label="Mais opções de salvar"
                >
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onSaveAll}>
                  <Save className="size-4" />
                  Salvar tudo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Modo do corpo */}
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-2">
        <BodyModeToggle
          value={response.bodyMode}
          onChange={(m) => {
            // Ao entrar no modo Código com o código vazio, carrega o template base.
            if (m === "SCRIPT" && !response.code?.trim()) {
              onChange({ bodyMode: m, code: DEFAULT_SCRIPT });
            } else {
              onChange({ bodyMode: m });
            }
          }}
        />
        <span className="text-[11px] text-muted-foreground">
          A opção <b className="text-foreground">em uso</b> é a que responde este endpoint (a outra é
          ignorada).
        </span>
      </div>

      <Tabs defaultValue="content" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="px-4">
          <TabsTrigger value="content">
            {response.bodyMode === "SCRIPT" ? "Código" : "Corpo"}
          </TabsTrigger>
          <TabsTrigger value="headers">
            Headers
            <span className="ml-1.5 font-mono text-muted-foreground">
              {Object.keys(response.headers).length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="rules">
            Regras
            <span className="ml-1.5 font-mono text-muted-foreground">{response.rules.length}</span>
          </TabsTrigger>
        </TabsList>

        {/* Conteúdo (corpo estático OU código + teste) */}
        <TabsContent value="content" className="min-h-0 flex-1">
          {response.bodyMode === "STATIC" ? (
            <div className="h-full border-t border-border">
              <MonacoEditor
                language="json"
                value={response.body ?? ""}
                onChange={(v) => onChange({ body: v })}
              />
            </div>
          ) : (
            <div className="grid h-full grid-cols-2 border-t border-border">
              <div className="flex min-h-0 flex-col border-r border-border">
                <div className="flex h-9 items-center justify-between border-b border-border px-3">
                  <span className="font-mono text-[12px] text-muted-foreground">handler.mjs</span>
                  <Button size="sm" onClick={runTest} disabled={testing}>
                    {testing ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                    Testar
                  </Button>
                </div>
                <div className="min-h-0 flex-1">
                  <MonacoEditor
                    language="javascript"
                    value={response.code ?? ""}
                    onChange={(v) => onChange({ code: v })}
                  />
                </div>
              </div>
              <div className="flex min-h-0 flex-col">
                <div className="border-b border-border px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Requests de teste (JSON)
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      onClick={onSaveTest}
                      disabled={saving}
                      title="Salvar os requests de teste"
                    >
                      {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                      Salvar
                    </Button>
                  </div>

                  {/* Seletor de casos de teste + adicionar/remover */}
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <Select value={activeCase.id} onValueChange={setActiveCaseId}>
                      <SelectTrigger className="h-7 flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {cases.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon-sm" onClick={addCase} title="Adicionar teste">
                      <Plus className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={removeActiveCase}
                      disabled={cases.length <= 1}
                      title="Remover este teste"
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>

                  {/* Nome do teste selecionado */}
                  <Input
                    value={activeCase.name}
                    onChange={(e) => renameActive(e.target.value)}
                    placeholder="Nome do teste"
                    className="mt-1.5 h-7"
                  />

                  <div
                    className="mt-1.5 resize-y overflow-hidden rounded border border-border"
                    style={{ height: 150, minHeight: 90, maxHeight: 500 }}
                  >
                    <MonacoEditor
                      key={activeCase.id}
                      language="json"
                      value={activeCase.request}
                      onChange={updateActiveRequest}
                    />
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-auto p-3">
                  <TestOutput result={result} />
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="headers" className="min-h-0 flex-1 overflow-auto border-t border-border p-4">
          <HeadersEditor
            headers={response.headers}
            onChange={(h) => onChange({ headers: h })}
          />
        </TabsContent>

        <TabsContent value="rules" className="min-h-0 flex-1 overflow-auto border-t border-border p-4">
          <RulesEditor
            rules={response.rules}
            operator={response.rulesOperator}
            onChange={(rules) => onChange({ rules })}
            onOperatorChange={(op) => onChange({ rulesOperator: op })}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BodyModeToggle({
  value,
  onChange,
}: {
  value: "STATIC" | "SCRIPT";
  onChange: (m: "STATIC" | "SCRIPT") => void;
}) {
  const usoBadge = (
    <span className="rounded bg-primary/15 px-1 text-[10px] font-semibold uppercase text-primary">
      em uso
    </span>
  );
  return (
    <div className="inline-flex rounded-md border border-border p-0.5">
      <button
        onClick={() => onChange("STATIC")}
        className={cn(
          "flex h-7 items-center gap-1.5 rounded px-2.5 text-[12px] transition-colors",
          value === "STATIC" ? "bg-accent font-medium text-foreground" : "text-muted-foreground",
        )}
      >
        <FileJson className="size-3.5" />
        Corpo estático
        {value === "STATIC" && usoBadge}
      </button>
      <button
        onClick={() => onChange("SCRIPT")}
        className={cn(
          "flex h-7 items-center gap-1.5 rounded px-2.5 text-[12px] transition-colors",
          value === "SCRIPT" ? "bg-accent font-medium text-foreground" : "text-muted-foreground",
        )}
      >
        <Code2 className="size-3.5" />
        Código JS (.mjs)
        {value === "SCRIPT" && usoBadge}
      </button>
    </div>
  );
}

function TestOutput({ result }: { result: SandboxResult | null }) {
  if (!result) {
    return (
      <p className="text-[13px] text-muted-foreground">Execute para ver o resultado.</p>
    );
  }
  if (!result.ok) {
    return (
      <div className="space-y-2">
        <div className="border-l-2 border-destructive bg-destructive/10 px-3 py-2">
          <p className="text-[12px] font-semibold text-destructive">
            {result.timedOut ? "Timeout" : "Erro na execução"}
          </p>
          <p className="mt-1 whitespace-pre-wrap font-mono text-[12px]">{result.error?.message}</p>
        </div>
        <Logs logs={result.logs} />
        <p className="text-[11px] text-muted-foreground">{result.durationMs}ms</p>
      </div>
    );
  }
  const body = result.result?.body;
  const bodyStr =
    typeof body === "string" ? body : JSON.stringify(body, null, 2);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <StatusBadge code={result.result?.status ?? 200} showText />
        <span className="text-[11px] text-muted-foreground">{result.durationMs}ms</span>
      </div>
      <pre className="overflow-auto rounded border border-border bg-surface p-2 font-mono text-[12px]">
        {bodyStr}
      </pre>
      <Logs logs={result.logs} />
    </div>
  );
}

function Logs({ logs }: { logs: { level: string; message: string }[] }) {
  if (!logs || logs.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Console
      </p>
      <div className="space-y-0.5 rounded border border-border bg-surface p-2 font-mono text-[12px]">
        {logs.map((l, i) => (
          <div key={i} className={l.level === "error" ? "text-destructive" : ""}>
            {l.message}
          </div>
        ))}
      </div>
    </div>
  );
}
