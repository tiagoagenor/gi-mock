"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ScrollText,
  KeyRound,
  Package,
  Moon,
  Sun,
  LogOut,
  Network,
  Menu,
  Users,
  Shield,
  Braces,
  BookOpen,
  AlignJustify,
  Info,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChangePasswordDialog } from "@/components/panel/change-password-dialog";
import { AboutDialog } from "@/components/panel/about-dialog";
import { api } from "@/lib/client/api";

const NAV = [
  { href: "/painel/mocks", label: "Mocks", icon: Network, adminOnly: false },
  { href: "/painel/headers", label: "Headers", icon: AlignJustify, adminOnly: false },
  { href: "/painel/logs", label: "Logs", icon: ScrollText, adminOnly: false },
  { href: "/painel/middlewares", label: "Middlewares", icon: Shield, adminOnly: false },
  { href: "/painel/variables", label: "Variáveis", icon: Braces, adminOnly: false },
  { href: "/painel/keys", label: "API Keys", icon: KeyRound, adminOnly: false },
  { href: "/painel/libs", label: "Libs", icon: Package, adminOnly: false },
  { href: "/painel/users", label: "Usuários", icon: Users, adminOnly: true },
];

const STORAGE_KEY = "gimock_sidebar_collapsed";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = theme !== "light";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label="Alternar tema"
        >
          {mounted && !isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Alternar tema</TooltipContent>
    </Tooltip>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: { username: string; role: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = NAV.filter((item) => !item.adminOnly || user.role === "ADMIN");
  // Default fechado (rail) — mais espaço. Preferência persistida no navegador.
  const [collapsed, setCollapsed] = useState(true);
  const [pwOpen, setPwOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setCollapsed(stored === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  async function logout() {
    await api.post("/painel/api/auth/logout");
    router.replace("/painel/login");
    router.refresh();
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-150",
          collapsed ? "w-[52px]" : "w-[216px]",
        )}
      >
        {/* Menu sanduíche (no lugar da logo) */}
        <div
          className={cn(
            "flex h-11 items-center gap-2 border-b border-border",
            collapsed ? "justify-center px-1" : "px-2",
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={toggle}
                aria-label={collapsed ? "Abrir menu" : "Fechar menu"}
              >
                <Menu className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? "Abrir menu" : "Fechar menu"}
            </TooltipContent>
          </Tooltip>
          {!collapsed && (
            <span className="text-[13px] font-semibold tracking-tight">GI-Mock</span>
          )}
        </div>

        {/* Navegação */}
        <nav className="flex-1 space-y-0.5 p-2">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            const link = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex h-8 items-center rounded-md text-[13px] transition-colors",
                  collapsed ? "justify-center px-0" : "gap-2.5 px-2.5",
                  active
                    ? "bg-accent font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                )}
                <Icon className="size-4 shrink-0" strokeWidth={1.5} />
                {!collapsed && item.label}
              </Link>
            );
            return collapsed ? (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : (
              link
            );
          })}
        </nav>

        {/* Usuário */}
        <div className="border-t border-border p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex w-full items-center gap-2 rounded-md py-1.5 text-left text-[13px] hover:bg-accent",
                  collapsed ? "justify-center px-0" : "px-2",
                )}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold uppercase text-secondary-foreground">
                  {user.username.slice(0, 2)}
                </span>
                {!collapsed && <span className="truncate">{user.username}</span>}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right" className="w-[184px]">
              <DropdownMenuLabel className="truncate">{user.username}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setPwOpen(true)}>
                <KeyRound className="size-4" />
                Trocar senha
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAboutOpen(true)}>
                <Info className="size-4" />
                Sobre o app
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                <LogOut className="size-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            {nav.find((n) => pathname.startsWith(n.href))?.label ?? "Painel"}
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="ghost" size="icon-sm">
                  <Link href="/docs" aria-label="Documentação">
                    <BookOpen className="size-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Documentação</TooltipContent>
            </Tooltip>
            <ThemeToggle />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>

      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </div>
  );
}
