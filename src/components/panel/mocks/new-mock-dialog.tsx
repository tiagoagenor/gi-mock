"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MethodBadge } from "@/components/panel/method-badge";
import { HTTP_METHODS, type HttpMethod } from "@/lib/http";
import { api, ApiError } from "@/lib/client/api";
import type { Folder } from "@/lib/types";

const NONE = "__none__";

export function NewMockDialog({
  open,
  onOpenChange,
  folders,
  defaultFolderId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  folders: Folder[];
  defaultFolderId?: string | null;
  onCreated: (id: string) => void;
}) {
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [path, setPath] = useState("/");
  const [name, setName] = useState("");
  const [folderId, setFolderId] = useState<string>(defaultFolderId ?? NONE);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const created = await api.post<{ id: string }>("/painel/api/mocks", {
        method,
        path,
        name: name || null,
        folderId: folderId === NONE ? null : folderId,
      });
      toast.success("Mock criado");
      onCreated(created.id);
      onOpenChange(false);
      setPath("/");
      setName("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao criar mock");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo mock</DialogTitle>
          <DialogDescription>Defina o método e o caminho do endpoint.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="space-y-1.5">
              <Label>Método</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as HttpMethod)}>
                <SelectTrigger className="w-[120px]">
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
            </div>
            <div className="flex-1 space-y-1.5">
              <Label>Caminho</Label>
              <Input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="font-mono"
                placeholder="/api/users/:id"
                autoFocus
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Nome (opcional)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Pasta</Label>
            <Select value={folderId} onValueChange={setFolderId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Raiz</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.path}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={loading}>
            Criar mock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
