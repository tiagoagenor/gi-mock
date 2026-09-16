"use client";

import { useState } from "react";
import { Check, Copy, Info, AlertTriangle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

export function DocH1({ children }: { children: React.ReactNode }) {
  return <h1 className="text-[22px] font-semibold tracking-tight">{children}</h1>;
}

export function Lead({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 max-w-2xl text-[14px] leading-6 text-muted-foreground">{children}</p>;
}

export function H2({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="mt-9 scroll-mt-16 border-b border-border pb-1.5 text-[16px] font-semibold tracking-tight"
    >
      {children}
    </h2>
  );
}

export function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 text-[14px] font-semibold">{children}</h3>;
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 max-w-2xl text-[13.5px] leading-6 text-foreground/90">{children}</p>;
}

export function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="mt-3 max-w-2xl list-disc space-y-1.5 pl-5 text-[13.5px] leading-6 text-foreground/90">{children}</ul>;
}

export function Ol({ children }: { children: React.ReactNode }) {
  return <ol className="mt-3 max-w-2xl list-decimal space-y-1.5 pl-5 text-[13.5px] leading-6 text-foreground/90">{children}</ol>;
}

export function Li({ children }: { children: React.ReactNode }) {
  return <li>{children}</li>;
}

export function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[12px]">
      {children}
    </code>
  );
}

export function CodeBlock({
  code,
  lang = "js",
  filename,
}: {
  code: string;
  lang?: string;
  filename?: string;
}) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="mt-4 max-w-2xl overflow-hidden rounded-lg border border-border">
      <div className="flex h-8 items-center justify-between border-b border-border bg-surface px-3">
        <span className="font-mono text-[11px] text-muted-foreground">{filename ?? lang}</span>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <pre className="overflow-auto bg-card p-3 font-mono text-[12.5px] leading-5">
        <code>{code.trim()}</code>
      </pre>
    </div>
  );
}

const CALLOUT = {
  note: { icon: Info, cls: "border-primary/40 bg-primary/5", iconCls: "text-primary" },
  warning: { icon: AlertTriangle, cls: "border-warning/40 bg-warning/5", iconCls: "text-warning" },
  tip: { icon: Lightbulb, cls: "border-success/40 bg-success/5", iconCls: "text-success" },
};

export function Callout({
  type = "note",
  title,
  children,
}: {
  type?: "note" | "warning" | "tip";
  title?: string;
  children: React.ReactNode;
}) {
  const c = CALLOUT[type];
  const Icon = c.icon;
  return (
    <div className={cn("mt-4 max-w-2xl rounded-lg border px-3.5 py-3", c.cls)}>
      <div className="flex gap-2.5">
        <Icon className={cn("mt-0.5 size-4 shrink-0", c.iconCls)} />
        <div className="text-[13px] leading-6 text-foreground/90">
          {title && <p className="font-semibold">{title}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}

// Tabela simples para referência de campos.
export function PropTable({
  rows,
}: {
  rows: { name: string; type?: string; desc: React.ReactNode }[];
}) {
  return (
    <div className="mt-4 max-w-2xl overflow-hidden rounded-lg border border-border">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="border-b border-border bg-surface text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-semibold">Campo</th>
            <th className="px-3 py-2 font-semibold">Tipo</th>
            <th className="px-3 py-2 font-semibold">Descrição</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-border last:border-0 align-top">
              <td className="px-3 py-2 font-mono text-[12px] text-foreground">{r.name}</td>
              <td className="px-3 py-2 font-mono text-[12px] text-muted-foreground">{r.type ?? "—"}</td>
              <td className="px-3 py-2 text-foreground/90">{r.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
