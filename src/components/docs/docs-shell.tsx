"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { ArrowLeft, Boxes, Moon, Sun, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV: { group: string; items: { href: string; label: string }[] }[] = [
  {
    group: "Começando",
    items: [{ href: "/docs", label: "Introdução" }],
  },
  {
    group: "Construindo mocks",
    items: [
      { href: "/docs/mocks", label: "Mocks & rotas" },
      { href: "/docs/respostas", label: "Respostas & regras" },
      { href: "/docs/codigo", label: "Código dinâmico (.mjs)" },
    ],
  },
  {
    group: "Avançado",
    items: [
      { href: "/docs/middlewares", label: "Middlewares" },
      { href: "/docs/jwt", label: "JWT & autenticação" },
      { href: "/docs/variaveis", label: "Variáveis globais" },
      { href: "/docs/libs", label: "Libs & npm" },
    ],
  },
  {
    group: "Operação",
    items: [
      { href: "/docs/logs", label: "Logs" },
      { href: "/docs/api", label: "API pública & chaves" },
      { href: "/docs/usuarios", label: "Usuários & perfis" },
    ],
  },
  {
    group: "Referência",
    items: [{ href: "/docs/referencia", label: "Referência do ctx" }],
  },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = theme !== "light";
  return (
    <Button variant="ghost" size="icon-sm" onClick={() => setTheme(isDark ? "light" : "dark")}>
      {mounted && !isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

export function DocsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Topbar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded bg-primary text-primary-foreground">
            <Boxes className="size-4" strokeWidth={1.75} />
          </div>
          <span className="text-[13px] font-semibold tracking-tight">GI-Mock</span>
          <span className="text-muted-foreground">/</span>
          <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <BookOpen className="size-3.5" /> Documentação
          </span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button asChild variant="outline" size="sm">
            <Link href="/painel/mocks">
              <ArrowLeft className="size-4" />
              Voltar ao painel
            </Link>
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside className="hidden w-[248px] shrink-0 overflow-auto border-r border-border bg-surface p-3 md:block">
          <nav className="space-y-5">
            {NAV.map((section) => (
              <div key={section.group}>
                <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.group}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "relative flex h-7 items-center rounded-md px-2 text-[13px] transition-colors",
                          active
                            ? "bg-accent font-medium text-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground",
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                        )}
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Conteúdo */}
        <main className="min-w-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-3xl px-6 py-8 pb-24">{children}</div>
        </main>
      </div>
    </div>
  );
}
