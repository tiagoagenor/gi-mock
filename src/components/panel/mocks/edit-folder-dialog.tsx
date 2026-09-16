"use client";

import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { api, ApiError } from "@/lib/client/api";
import type { Folder, MiddlewareListItem } from "@/lib/types";

export function EditFolderDialog({
  open,
  onOpenChange,
  folder,
  availableMiddlewares,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  folder: Folder | null;
  availableMiddlewares: MiddlewareListItem[];
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [mwIds, setMwIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (folder) {
      setName(folder.name);
      setPrefix(folder.prefix ?? "");
      setMwIds(folder.middlewareIds ?? []);
    }
  }, [folder]);

  async function submit() {
    if (!folder) return;
    setLoading(true);
    try {
      await api.patch(`/painel/api/folders/${folder.id}`, {
        name,
        prefix,
        middlewareIds: mwIds,
      });
      toast.success("Pasta atualizada");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao salvar pasta");
    } finally {
      setLoading(false);
    }
  }

  function toggle(id: string, on: boolean) {
    setMwIds((prev) => (on ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar pasta</DialogTitle>
          <DialogDescription>
            O prefixo é aplicado às rotas dos mocks desta pasta (e subpastas). Os middlewares
            escolhidos rodam antes de todos esses mocks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Prefixo das rotas</Label>
            <Input
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="/api/v1"
              className="font-mono"
            />
            <p className="text-[12px] text-muted-foreground">
              Ex.: <span className="font-mono">/api/v1</span> → um mock <span className="font-mono">/users</span>{" "}
              responde em <span className="font-mono">/api/v1/users</span>. Deixe vazio para nenhum.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Middlewares da pasta</Label>
            {availableMiddlewares.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">Nenhum middleware criado ainda.</p>
            ) : (
              <div className="max-h-[180px] space-y-0.5 overflow-auto rounded-md border border-border p-1.5">
                {availableMiddlewares.map((mw) => (
                  <label
                    key={mw.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-accent"
                  >
                    <Checkbox
                      checked={mwIds.includes(mw.id)}
                      onCheckedChange={(v) => toggle(mw.id, Boolean(v))}
                    />
                    <Shield
                      className={cn("size-3.5", mw.isEnabled ? "text-primary" : "text-muted-foreground")}
                    />
                    <span className="min-w-0 flex-1 truncate text-[13px]">{mw.name}</span>
                    {!mw.isEnabled && <span className="text-[10px] text-muted-foreground">inativo</span>}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={loading}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
