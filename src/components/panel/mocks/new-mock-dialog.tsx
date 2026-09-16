"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TerminalSquare } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { parseCurl } from "@/lib/client/curl";
import { normalizePath } from "@/lib/reserved";
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
  const [curl, setCurl] = useState("");
  const [tab, setTab] = useState("manual");

  const parsed = useMemo(() => (curl.trim() ? parseCurl(curl) : null), [curl]);

  function applyCurl() {
    if (!parsed) return;
    if (parsed.path) setPath(normalizePath(parsed.path));
    if (parsed.method) setMethod((parsed.method as HttpMethod) ?? "GET");
    if (parsed.path) {
      const seg = parsed.path.split("/").filter(Boolean).pop();
      if (seg && !name) setName(seg);
    }
    toast.success("cURL analisado — confira os campos");
  }

  async function submit() {
    // Na aba cURL, analisa e preenche automaticamente antes de criar.
    let finalMethod: HttpMethod = method;
    let finalPath = path;
    if (tab === "curl") {
      if (!curl.trim() || !parsed?.path) {
        toast.error("Cole um comando cURL válido (URL não encontrada).");
        return;
      }
      finalMethod = (parsed.method as HttpMethod) ?? "GET";
      finalPath = normalizePath(parsed.path);
    }

    setLoading(true);
    try {
      const created = await api.post<{ id: string }>("/painel/api/mocks", {
        method: finalMethod,
        path: finalPath,
        name: name || (tab === "curl" ? finalPath.split("/").filter(Boolean).pop() ?? null : null),
        folderId: folderId === NONE ? null : folderId,
      });
      toast.success("Mock criado");
      onCreated(created.id);
      onOpenChange(false);
      setPath("/");
      setName("");
      setCurl("");
      setMethod("GET");
      setTab("manual");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao criar mock");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo mock</DialogTitle>
          <DialogDescription>Defina manualmente ou importe de um comando cURL.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="curl">Importar cURL</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="mt-3 space-y-3">
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
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nome (opcional)</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </TabsContent>

          <TabsContent value="curl" className="mt-3 space-y-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <TerminalSquare className="size-3.5" />
                Cole o comando cURL
              </Label>
              <Textarea
                value={curl}
                onChange={(e) => setCurl(e.target.value)}
                placeholder={`curl -X POST https://api.exemplo.com/users \\\n  -H 'Content-Type: application/json' \\\n  -d '{"nome":"Ana"}'`}
                className="h-[130px] font-mono text-[12px]"
                autoFocus
              />
            </div>

            {parsed && (
              <div className="rounded-md border border-border bg-surface p-2.5">
                <div className="flex items-center gap-2">
                  <MethodBadge method={parsed.method} />
                  <span className="min-w-0 flex-1 truncate font-mono text-[13px]">
                    {parsed.path ?? <span className="text-destructive">URL não encontrada</span>}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {Object.keys(parsed.headers).length} header(s)
                  {parsed.body ? " · com corpo" : ""} — importa método e caminho.
                </p>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={applyCurl} disabled={!parsed?.path}>
              Analisar e preencher
            </Button>
          </TabsContent>
        </Tabs>

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
                  {f.prefix ? ` (${f.prefix})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
