"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, KeyRound, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { UserItem, UserRole } from "@/lib/types";

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Administrador",
  EDITOR: "Editor",
  VIEWER: "Leitor",
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { hour12: false });
}

export function UsersView() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("ADMIN");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [resetUser, setResetUser] = useState<UserItem | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setUsers(await api.get<UserItem[]>("/painel/api/users"));
    } catch {
      toast.error("Falha ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    try {
      await api.post("/painel/api/users", {
        username,
        password,
        email: email || null,
        role,
      });
      toast.success("Usuário criado");
      setOpen(false);
      setUsername("");
      setPassword("");
      setEmail("");
      setRole("ADMIN");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao criar usuário");
    }
  }

  async function patch(id: string, data: Record<string, unknown>) {
    try {
      await api.patch(`/painel/api/users/${id}`, data);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao atualizar");
      load();
    }
  }

  async function doReset() {
    if (!resetUser) return;
    try {
      await api.patch(`/painel/api/users/${resetUser.id}`, { password: resetPassword });
      toast.success(`Senha de ${resetUser.username} redefinida`);
      setResetUser(null);
      setResetPassword("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao redefinir senha");
    }
  }

  async function remove(id: string) {
    try {
      await api.del(`/painel/api/users/${id}`);
      toast.success("Usuário removido");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao remover");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div>
          <p className="text-[13px] font-medium">Usuários</p>
          <p className="text-[12px] text-muted-foreground">
            Quem pode acessar o painel de administração.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Novo usuário
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead className="w-[170px]">Perfil</TableHead>
              <TableHead className="w-[90px]">Ativo</TableHead>
              <TableHead className="w-[170px]">Criado</TableHead>
              <TableHead className="w-[110px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRowsSkeleton rows={4} cols={6} />}
            {!loading && users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.username}</TableCell>
                <TableCell className="text-muted-foreground">{u.email || "—"}</TableCell>
                <TableCell>
                  <Select value={u.role} onValueChange={(v) => patch(u.id, { role: v })}>
                    <SelectTrigger className="h-7 w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["ADMIN", "EDITOR", "VIEWER"] as UserRole[]).map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={u.isActive}
                    onCheckedChange={(v) => patch(u.id, { isActive: v })}
                  />
                </TableCell>
                <TableCell className="font-mono text-[12px] text-muted-foreground">
                  {fmt(u.createdAt)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title="Redefinir senha"
                      onClick={() => {
                        setResetUser(u);
                        setResetPassword("");
                      }}
                    >
                      <KeyRound className="size-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" title="Excluir" onClick={() => setDeleteId(u.id)}>
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Nenhum usuário.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Criar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-4" />
              Novo usuário
            </DialogTitle>
            <DialogDescription>Crie uma conta de acesso ao painel.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Usuário</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Senha</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="mín. 6 caracteres"
              />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail (opcional)</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Perfil</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["ADMIN", "EDITOR", "VIEWER"] as UserRole[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={create}>Criar usuário</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Redefinir senha */}
      <Dialog open={resetUser !== null} onOpenChange={(o) => !o && setResetUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>
              Nova senha para <span className="font-mono">{resetUser?.username}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Nova senha</Label>
            <Input
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="mín. 6 caracteres"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResetUser(null)}>
              Cancelar
            </Button>
            <Button onClick={doReset} disabled={resetPassword.length < 6}>
              Redefinir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialogLike
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Excluir usuário?"
        description="O acesso desta conta ao painel será removido."
        confirmLabel="Excluir"
        destructive
        onConfirm={async () => {
          if (deleteId) await remove(deleteId);
        }}
      />
    </div>
  );
}
