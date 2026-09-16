"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AlertDialogLike } from "@/components/panel/confirm-dialog";
import { TableRowsSkeleton } from "@/components/panel/loading";
import { MethodBadge } from "@/components/panel/method-badge";
import { StatusBadge } from "@/components/panel/status-badge";
import { HTTP_METHODS } from "@/lib/http";
import { api } from "@/lib/client/api";
import type { LogItem, LogDetail } from "@/lib/types";

const ALL = "__all__";

function timeAgo(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { hour12: false });
}

export function LogsView() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [method, setMethod] = useState(ALL);
  const [statusRange, setStatusRange] = useState(ALL);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<LogDetail | null>(null);
  const [clearOpen, setClearOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (method !== ALL) params.set("method", method);
    if (statusRange !== ALL) params.set("statusRange", statusRange);
    if (search) params.set("search", search);
    try {
      const res = await api.get<{ items: LogItem[] }>(`/painel/api/logs?${params.toString()}`);
      setLogs(res.items);
    } finally {
      setLoading(false);
    }
  }, [method, statusRange, search]);

  useEffect(() => {
    load().catch(() => toast.error("Falha ao carregar logs"));
  }, [load]);

  async function openDetail(id: string) {
    const d = await api.get<LogDetail>(`/painel/api/logs/${id}`);
    setDetail(d);
  }

  async function clear() {
    await api.del("/painel/api/logs");
    toast.success("Logs limpos");
    load();
  }

  return (
    <div className="flex h-full flex-col">
      {/* Filtros */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por path…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-[240px] pl-8 font-mono"
          />
        </div>
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="h-8 w-[130px]">
            <SelectValue placeholder="Método" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos métodos</SelectItem>
            {HTTP_METHODS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusRange} onValueChange={setStatusRange}>
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos status</SelectItem>
            <SelectItem value="1xx">1xx</SelectItem>
            <SelectItem value="2xx">2xx</SelectItem>
            <SelectItem value="3xx">3xx</SelectItem>
            <SelectItem value="4xx">4xx</SelectItem>
            <SelectItem value="5xx">5xx</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
            Atualizar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setClearOpen(true)}>
            <Trash2 className="size-4" />
            Limpar
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="w-[90px]">Método</TableHead>
              <TableHead>Path</TableHead>
              <TableHead className="w-[90px]">Status</TableHead>
              <TableHead className="w-[80px] text-right">Tempo</TableHead>
              <TableHead className="w-[170px]">Quando</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && logs.length === 0 && <TableRowsSkeleton rows={8} cols={5} />}
            {logs.map((log) => (
              <TableRow key={log.id} className="cursor-pointer" onClick={() => openDetail(log.id)}>
                <TableCell>
                  <MethodBadge method={log.method} />
                </TableCell>
                <TableCell className="font-mono text-[13px]">{log.path}</TableCell>
                <TableCell>
                  <StatusBadge code={log.statusCode} />
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                  {log.durationMs}ms
                </TableCell>
                <TableCell className="font-mono text-[12px] text-muted-foreground">
                  {timeAgo(log.createdAt)}
                </TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Nenhum log ainda. Faça uma chamada a um mock para vê-la aqui.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-[520px] overflow-auto sm:max-w-[520px]">
          {detail && <LogDetailView detail={detail} />}
        </SheetContent>
      </Sheet>

      <AlertDialogLike
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Limpar todos os logs?"
        description="Todos os registros de requests serão removidos permanentemente."
        confirmLabel="Limpar"
        destructive
        onConfirm={clear}
      />
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function Pre({ value }: { value: unknown }) {
  const str = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  if (!str || str === "null" || str === "{}") {
    return <p className="text-[12px] text-muted-foreground">—</p>;
  }
  return (
    <pre className="overflow-auto rounded border border-border bg-surface p-2 font-mono text-[12px]">
      {str}
    </pre>
  );
}

function LogDetailView({ detail }: { detail: LogDetail }) {
  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <MethodBadge method={detail.method} />
          <span className="font-mono text-[13px]">{detail.path}</span>
        </SheetTitle>
        <SheetDescription className="flex items-center gap-3">
          <StatusBadge code={detail.statusCode} showText />
          <span className="font-mono text-[12px]">{detail.durationMs}ms</span>
          <span className="font-mono text-[12px]">{timeAgo(detail.createdAt)}</span>
        </SheetDescription>
      </SheetHeader>
      <div className="mt-4 space-y-4">
        {detail.scriptError && (
          <div className="border-l-2 border-destructive bg-destructive/10 px-3 py-2 font-mono text-[12px]">
            {detail.scriptError}
          </div>
        )}
        <Block title="Request — query">
          <Pre value={detail.requestQuery} />
        </Block>
        <Block title="Request — headers">
          <Pre value={detail.requestHeaders} />
        </Block>
        <Block title="Request — body">
          <Pre value={detail.requestBody} />
        </Block>
        <Block title="Response — headers">
          <Pre value={detail.responseHeaders} />
        </Block>
        <Block title="Response — body">
          <Pre value={detail.responseBody} />
        </Block>
      </div>
    </>
  );
}
