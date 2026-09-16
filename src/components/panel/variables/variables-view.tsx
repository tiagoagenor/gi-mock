"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Braces, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { api, ApiError } from "@/lib/client/api";
import type { VariableItem } from "@/lib/types";

export function VariablesView() {
  const [vars, setVars] = useState<VariableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [secret, setSecret] = useState(false);
  const [showValue, setShowValue] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setVars(await api.get<VariableItem[]>("/painel/api/variables"));
    } catch {
      toast.error("Falha ao carregar variáveis");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditingId(null);
    setKey("");
    setValue("");
    setSecret(false);
    setShowValue(true);
    setOpen(true);
  }
  function openEdit(v: VariableItem) {
    setEditingId(v.id);
    setKey(v.key);
    setValue("");
    setSecret(v.secret);
    setShowValue(!v.secret);
    setOpen(true);
  }

  async function submit() {
    try {
      if (editingId) {
        await api.patch(`/painel/api/variables/${editingId}`, {
          ...(value ? { value } : {}),
          secret,
        });
        toast.success("Variável atualizada");
      } else {
        await api.post("/painel/api/variables", { key, value, secret });
        toast.success("Variável criada");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao salvar variável");
    }
  }

  async function remove(id: string) {
    await api.del(`/painel/api/variables/${id}`);
    toast.success("Variável removida");
    load();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div>
          <p className="text-[13px] font-medium">Variáveis globais</p>
          <p className="text-[12px] text-muted-foreground">
            Acesse no código dos mocks e middlewares via <span className="font-mono">ctx.vars.NOME</span>.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          Nova variável
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Chave</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="w-[90px]">Secreta</TableHead>
              <TableHead className="w-[90px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRowsSkeleton rows={4} cols={4} />}
            {!loading &&
              vars.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono font-medium">{v.key}</TableCell>
                  <TableCell className="font-mono text-[12px] text-muted-foreground">{v.value}</TableCell>
                  <TableCell>{v.secret ? "Sim" : "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-0.5">
                      <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => openEdit(v)}>
                        <Pencil className="size-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" title="Excluir" onClick={() => setDeleteId(v.id)}>
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            {!loading && vars.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  Nenhuma variável. Crie uma (ex.: <span className="font-mono">JWT_SECRET</span>).
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Braces className="size-4" />
              {editingId ? "Editar variável" : "Nova variável"}
            </DialogTitle>
            <DialogDescription>
              Centralize credenciais e configurações (ex.: o segredo do JWT).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Chave</Label>
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                disabled={!!editingId}
                placeholder="JWT_SECRET"
                className="font-mono"
                autoFocus={!editingId}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{editingId ? "Novo valor (em branco = manter)" : "Valor"}</Label>
              <div className="relative">
                <Input
                  type={showValue ? "text" : "password"}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="pr-9 font-mono"
                  autoFocus={!!editingId}
                />
                <button
                  type="button"
                  onClick={() => setShowValue((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showValue ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="secret" checked={secret} onCheckedChange={setSecret} />
              <Label htmlFor="secret" className="text-[13px] text-muted-foreground">
                Secreta (mascarar na listagem)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submit}>{editingId ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialogLike
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Remover variável?"
        description="Códigos que usam esta variável podem parar de funcionar."
        confirmLabel="Remover"
        destructive
        onConfirm={async () => {
          if (deleteId) await remove(deleteId);
        }}
      />
    </div>
  );
}
