"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Package,
  Pencil,
  Terminal,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertDialogLike } from "@/components/panel/confirm-dialog";
import { MonacoEditor } from "@/components/panel/monaco-editor";
import { TableRowsSkeleton } from "@/components/panel/loading";
import { cn } from "@/lib/utils";
import { api, ApiError } from "@/lib/client/api";
import type { Lib, LibKind } from "@/lib/types";

const EMPTY_UTILITY = "export function hello(name) {\n  return `Olá, ${name}`;\n}\n";

export function LibsView() {
  const [libs, setLibs] = useState<Lib[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [kind, setKind] = useState<LibKind>("UTILITY");
  const [name, setName] = useState("");
  const [packageName, setPackageName] = useState("");
  const [version, setVersion] = useState("");
  const [sourceCode, setSourceCode] = useState(EMPTY_UTILITY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [logsLib, setLogsLib] = useState<Lib | null>(null);

  async function load() {
    setLoading(true);
    try {
      setLibs(await api.get<Lib[]>("/painel/api/libs"));
    } catch {
      toast.error("Falha ao carregar libs");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditingId(null);
    setKind("UTILITY");
    setName("");
    setPackageName("");
    setVersion("");
    setSourceCode(EMPTY_UTILITY);
    setOpen(true);
  }

  function openEdit(lib: Lib) {
    setEditingId(lib.id);
    setKind(lib.kind);
    setName(lib.name);
    setPackageName(lib.packageName ?? "");
    setVersion(lib.version ?? "");
    setSourceCode(lib.sourceCode ?? EMPTY_UTILITY);
    setOpen(true);
  }

  async function submit() {
    setSaving(true);
    const payload = {
      name,
      kind,
      packageName: kind === "NPM_WHITELISTED" ? packageName : null,
      version: kind === "NPM_WHITELISTED" ? version : null,
      sourceCode: kind === "UTILITY" ? sourceCode : null,
    };
    try {
      const saved = editingId
        ? await api.patch<Lib>(`/painel/api/libs/${editingId}`, payload)
        : await api.post<Lib>("/painel/api/libs", payload);
      setOpen(false);
      await load();
      // Para libs NPM, mostra o resultado da instalação (status + comando + logs).
      if (saved.kind === "NPM_WHITELISTED") {
        setLogsLib(saved);
        if (saved.installStatus === "success") toast.success("Pacote instalado");
        else toast.error("Falha ao instalar o pacote");
      } else {
        toast.success(editingId ? "Lib atualizada" : "Lib adicionada");
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao salvar lib");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(lib: Lib) {
    setLibs((prev) => prev.map((l) => (l.id === lib.id ? { ...l, isEnabled: !l.isEnabled } : l)));
    try {
      await api.patch(`/painel/api/libs/${lib.id}`, { isEnabled: !lib.isEnabled });
    } catch {
      toast.error("Erro ao atualizar");
      load();
    }
  }

  async function remove(id: string) {
    await api.del(`/painel/api/libs/${id}`);
    toast.success("Lib removida");
    load();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div>
          <p className="text-[13px] font-medium">Libs do sandbox</p>
          <p className="text-[12px] text-muted-foreground">
            Disponíveis no código dos mocks via <span className="font-mono">import</span> ou{" "}
            <span className="font-mono">ctx.libs</span>.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          Adicionar lib
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead className="w-[160px]">Instalação</TableHead>
              <TableHead className="w-[90px]">Ativa</TableHead>
              <TableHead className="w-[90px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRowsSkeleton rows={4} cols={6} />
            ) : (
              <>
                {libs.map((lib) => (
                  <TableRow key={lib.id}>
                    <TableCell className="font-mono font-medium">{lib.name}</TableCell>
                    <TableCell>
                      <Badge variant={lib.kind === "UTILITY" ? "secondary" : "outline"}>
                        {lib.kind === "UTILITY" ? "Utilitária" : "NPM"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-[12px] text-muted-foreground">
                      {lib.kind === "NPM_WHITELISTED"
                        ? `${lib.packageName ?? "—"}${lib.version ? `@${lib.version}` : ""}`
                        : "código no painel"}
                    </TableCell>
                    <TableCell>
                      {lib.kind === "NPM_WHITELISTED" ? (
                        <button
                          onClick={() => setLogsLib(lib)}
                          className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[12px] hover:bg-accent"
                          title="Ver logs da instalação"
                        >
                          {lib.installStatus === "success" ? (
                            <>
                              <CheckCircle2 className="size-3.5 text-success" />
                              <span className="text-success">Instalado</span>
                            </>
                          ) : lib.installStatus === "error" ? (
                            <>
                              <XCircle className="size-3.5 text-destructive" />
                              <span className="text-destructive">Falhou</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                          <Terminal className="size-3 text-muted-foreground" />
                        </button>
                      ) : (
                        <span className="text-[12px] text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch checked={lib.isEnabled} onCheckedChange={() => toggle(lib)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-0.5">
                        <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => openEdit(lib)}>
                          <Pencil className="size-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" title="Excluir" onClick={() => setDeleteId(lib.id)}>
                          <Trash2 className="size-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {libs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      Nenhuma lib cadastrada.
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="size-4" />
              {editingId ? "Editar lib" : "Adicionar lib"}
            </DialogTitle>
            <DialogDescription>
              Libs NPM precisam estar pré-aprovadas no servidor. Utilitárias rodam no sandbox.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="inline-flex rounded-md border border-border p-0.5">
              {(["UTILITY", "NPM_WHITELISTED"] as LibKind[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={cn(
                    "h-7 rounded px-3 text-[12px] transition-colors",
                    kind === k ? "bg-accent font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  {k === "UTILITY" ? "Utilitária (código)" : "NPM"}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label>Nome (identificador de import)</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex.: dayjs, money"
                className="font-mono"
              />
            </div>

            {kind === "NPM_WHITELISTED" ? (
              <div className="flex gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label>Pacote npm</Label>
                  <Input
                    value={packageName}
                    onChange={(e) => setPackageName(e.target.value)}
                    placeholder="@faker-js/faker"
                    className="font-mono"
                  />
                </div>
                <div className="w-[110px] space-y-1.5">
                  <Label>Versão</Label>
                  <Input value={version} onChange={(e) => setVersion(e.target.value)} className="font-mono" />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Código (ES Module)</Label>
                <div className="h-[200px] overflow-hidden rounded-md border border-border">
                  <MonacoEditor language="javascript" value={sourceCode} onChange={setSourceCode} />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving
                ? kind === "NPM_WHITELISTED"
                  ? "Instalando…"
                  : "Salvando…"
                : editingId
                  ? "Salvar"
                  : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logs da instalação npm */}
      <Dialog open={logsLib !== null} onOpenChange={(o) => !o && setLogsLib(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="size-4" />
              Instalação — <span className="font-mono">{logsLib?.name}</span>
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              {logsLib?.installStatus === "success" ? (
                <span className="inline-flex items-center gap-1.5 text-success">
                  <CheckCircle2 className="size-4" /> Instalado com sucesso
                </span>
              ) : logsLib?.installStatus === "error" ? (
                <span className="inline-flex items-center gap-1.5 text-destructive">
                  <XCircle className="size-4" /> Falha na instalação
                </span>
              ) : (
                <span className="text-muted-foreground">Sem informação de instalação</span>
              )}
              {logsLib?.installedAt && (
                <span className="font-mono text-[12px] text-muted-foreground">
                  {new Date(logsLib.installedAt).toLocaleString("pt-BR", { hour12: false })}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Comando executado
              </p>
              <pre className="overflow-auto rounded-md border border-border bg-surface p-2 font-mono text-[12px]">
                $ {logsLib?.installCommand ?? "—"}
              </pre>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Logs
              </p>
              <pre className="max-h-[320px] overflow-auto rounded-md border border-border bg-surface p-2 font-mono text-[12px] whitespace-pre-wrap">
                {logsLib?.installLog || "Sem saída."}
              </pre>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setLogsLib(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialogLike
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Remover lib?"
        description="Mocks que a utilizam podem parar de funcionar."
        confirmLabel="Remover"
        destructive
        onConfirm={async () => {
          if (deleteId) await remove(deleteId);
        }}
      />
    </div>
  );
}
