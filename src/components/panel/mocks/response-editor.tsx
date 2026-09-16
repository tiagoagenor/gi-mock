"use client";

import { useState } from "react";
import { Play, Trash2, Save, Loader2, FileJson, Code2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { StatusSelect } from "@/components/panel/status-select";
import { StatusBadge } from "@/components/panel/status-badge";
import { MonacoEditor } from "@/components/panel/monaco-editor";
import { RulesEditor } from "@/components/panel/mocks/rules-editor";
import { HeadersEditor } from "@/components/panel/mocks/headers-editor";
import { api } from "@/lib/client/api";
import type { MockResponse } from "@/lib/types";
import type { SandboxResult } from "@/server/sandbox/runner";

const DEFAULT_TEST_CTX = JSON.stringify(
  { method: "GET", params: {}, query: {}, headers: {}, body: null },
  null,
  2,
);

export function ResponseEditor({
  response,
  onChange,
  onSave,
  onDelete,
  canDelete,
  saving,
  mockId,
}: {
  response: MockResponse;
  onChange: (patch: Partial<MockResponse>) => void;
  onSave: () => void;
  onDelete: () => void;
  canDelete: boolean;
  saving: boolean;
  mockId: string;
}) {
  const [testCtx, setTestCtx] = useState(DEFAULT_TEST_CTX);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<SandboxResult | null>(null);

  async function runTest() {
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
      const res = await api.post<SandboxResult>(`/painel/api/mocks/${mockId}/test`, {
        code: response.code ?? "",
        request,
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
          <Button size="sm" onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Salvar
          </Button>
        </div>
      </div>

      {/* Modo do corpo */}
      <div className="flex items-center gap-1 border-b border-border px-4 py-2">
        <BodyModeToggle
          value={response.bodyMode}
          onChange={(m) => onChange({ bodyMode: m })}
        />
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
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Request de teste (JSON)
                  </span>
                  <div className="mt-1 h-[110px] border border-border">
                    <MonacoEditor language="json" value={testCtx} onChange={setTestCtx} />
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
