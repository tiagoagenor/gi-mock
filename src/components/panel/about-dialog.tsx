"use client";

import { useState } from "react";
import { Check, Copy, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { APP_VERSION, GIT_COMMIT, BUILD_TIME, formatBuildTime } from "@/lib/version";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="font-mono text-[13px] text-foreground">{value}</span>
    </div>
  );
}

export function AboutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);

  const commit = GIT_COMMIT || "—";
  const summary = `GI-Mock v${APP_VERSION}${GIT_COMMIT ? ` (${GIT_COMMIT})` : ""} — build ${formatBuildTime()}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="size-4 text-primary" />
            Sobre o app
          </DialogTitle>
          <DialogDescription>
            Informações da versão implantada. Use para confirmar se o código foi atualizado.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[15px] font-bold text-primary">
            GI
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold leading-tight">GI-Mock</p>
            <p className="text-[12px] text-muted-foreground">Servidor de mocks de API</p>
          </div>
          <span className="ml-auto rounded-md bg-primary/10 px-2 py-1 font-mono text-[13px] font-semibold text-primary">
            v{APP_VERSION}
          </span>
        </div>

        <div className="px-1">
          <Row label="Versão" value={APP_VERSION} />
          <Row label="Commit" value={commit} />
          <Row label="Build" value={BUILD_TIME ? formatBuildTime() : "—"} />
        </div>

        <button
          onClick={copy}
          className="flex items-center justify-center gap-1.5 rounded-md border border-border py-2 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copiado" : "Copiar informações"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
