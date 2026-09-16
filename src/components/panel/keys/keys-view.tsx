"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { TableRowsSkeleton } from "@/components/panel/loading";
import { api } from "@/lib/client/api";
import type { ApiKeyItem } from "@/lib/types";

function fmt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("pt-BR", { hour12: false }) : "—";
}

export function KeysView() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setKeys(await api.get<ApiKeyItem[]>("/painel/api/keys"));
    } catch {
      toast.error("Falha ao carregar chaves");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    if (!name.trim()) return;
    const res = await api.post<ApiKeyItem & { fullKey: string }>("/painel/api/keys", { name });
    setCreateOpen(false);
    setName("");
    setCreatedKey(res.fullKey);
    load();
  }

  async function remove(id: string) {
    await api.del(`/painel/api/keys/${id}`);
    toast.success("Chave removida");
    load();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div>
          <p className="text-[13px] font-medium">Chaves de API</p>
          <p className="text-[12px] text-muted-foreground">
            Use no header <span className="font-mono">Authorization: Bearer &lt;key&gt;</span> para a API pública.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Nova chave
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Prefixo</TableHead>
              <TableHead>Criada</TableHead>
              <TableHead>Último uso</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRowsSkeleton rows={4} cols={5} />}
            {!loading && keys.map((k) => (
              <TableRow key={k.id}>
                <TableCell className="font-medium">{k.name}</TableCell>
                <TableCell className="font-mono text-[12px]">{k.prefix}_••••</TableCell>
                <TableCell className="font-mono text-[12px] text-muted-foreground">{fmt(k.createdAt)}</TableCell>
                <TableCell className="font-mono text-[12px] text-muted-foreground">{fmt(k.lastUsedAt)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(k.id)}>
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!loading && keys.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Nenhuma chave criada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Criar */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova chave de API</DialogTitle>
            <DialogDescription>Dê um nome para identificar o uso desta chave.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Ex.: CI, App mobile" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={create}>Criar chave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mostrar key criada (uma vez) */}
      <Dialog open={createdKey !== null} onOpenChange={(o) => !o && setCreatedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-4" />
              Chave criada
            </DialogTitle>
            <DialogDescription>
              Copie agora — por segurança, ela não será exibida novamente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md border border-border bg-surface p-2">
            <code className="min-w-0 flex-1 truncate font-mono text-[12px]">{createdKey}</code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(createdKey ?? "");
                toast.success("Copiado");
              }}
            >
              <Copy className="size-4" />
              Copiar
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreatedKey(null)}>Concluído</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialogLike
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Remover chave?"
        description="Integrações que usam esta chave deixarão de funcionar."
        confirmLabel="Remover"
        destructive
        onConfirm={async () => {
          if (deleteId) await remove(deleteId);
        }}
      />
    </div>
  );
}
