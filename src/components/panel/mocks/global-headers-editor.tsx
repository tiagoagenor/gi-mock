"use client";

import { useEffect, useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { HeadersEditor } from "@/components/panel/mocks/headers-editor";
import { Loading } from "@/components/panel/loading";
import { api, ApiError } from "@/lib/client/api";

export function GlobalHeadersEditor() {
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<{ headers: Record<string, string> }>(
        "/painel/api/settings/global-headers",
      );
      setHeaders(res.headers ?? {});
    } catch {
      toast.error("Falha ao carregar headers globais");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    setSaving(true);
    try {
      await api.put("/painel/api/settings/global-headers", { headers });
      toast.success("Headers globais salvos");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading className="h-32" />;

  return (
    <div className="space-y-4">
      <HeadersEditor headers={headers} onChange={setHeaders} />
      <Button size="sm" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Salvar
      </Button>
    </div>
  );
}
