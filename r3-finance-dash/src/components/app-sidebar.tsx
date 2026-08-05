import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  Settings,
  ScrollText,
  Database,
  LogOut,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
  { title: "Catálogo de Dados", url: "/catalogo", icon: Database },
  { title: "Logs", url: "/logs", icon: ScrollText },
];

interface AppSidebarProps {
  email?: string | null;
  onLogout?: () => void;
}

export function AppSidebar({ email, onLogout }: AppSidebarProps) {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (url: string) => {
    if (url === "/") return currentPath === "/" || currentPath === "";
    return currentPath.startsWith(url);
  };

  const logoUrl =
    "https://qvavpbhunmwfjrrgoifv.supabase.co/storage/v1/object/public/utils/logo_branca.png";

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen sticky top-0 z-30 transition-all duration-300 ease-in-out",
        "bg-[#0c1a12] border-r border-white/[0.06]",
        collapsed ? "w-[78px]" : "w-[260px]",
      )}
    >
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-5 h-[72px] shrink-0">
        <div className="flex h-10 w-10 items-center justify-center shrink-0">
          <img
            src={logoUrl}
            alt="Grupo R3"
            className={cn(
              "object-contain transition-all duration-300",
              collapsed ? "h-7" : "h-9",
            )}
          />
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-tight overflow-hidden animate-fade-in">
            <span className="text-[13px] font-bold tracking-tight text-white">
              Grupo R3
            </span>
            <span className="text-[10px] font-medium text-white/35 uppercase tracking-[0.15em]">
              Financeiro
            </span>
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      <div className="mx-4 h-px bg-white/[0.06]" />

      {/* ── Navigation ── */}
      <nav
        className={cn(
          "flex-1 py-4 px-3 space-y-1",
          collapsed ? "overflow-hidden" : "overflow-y-auto",
        )}
      >
        {!collapsed && (
          <div className="px-3 mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
              Menu
            </span>
          </div>
        )}
        {navItems.map((item) => {
          const active = isActive(item.url);
          return (
            <Link
              key={item.url}
              to={item.url}
              className={cn(
                "group relative flex items-center rounded-xl transition-all duration-200",
                collapsed ? "justify-center h-12 w-12 mx-auto" : "gap-3 px-3.5 h-11",
                active
                  ? "bg-primary text-white shadow-lg shadow-primary/30"
                  : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]",
              )}
            >
              {/* Active left accent bar */}
              {active && !collapsed && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-white/80" />
              )}

              <item.icon
                className={cn(
                  "shrink-0 transition-all duration-200",
                  collapsed ? "h-5 w-5" : "h-[18px] w-[18px]",
                )}
              />

              {/* Label */}
              {!collapsed && (
                <span
                  className={cn(
                    "text-[13px] font-medium truncate transition-all",
                    active && "font-semibold",
                  )}
                >
                  {item.title}
                </span>
              )}

              {/* Tooltip for collapsed */}
              {collapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-[#1a2d21] text-white text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-xl z-50">
                  {item.title}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 rotate-45 bg-[#1a2d21]" />
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom section ── */}
      <div className="shrink-0 px-3 pb-4 space-y-1">
        {/* Divider */}
        <div className="mx-1 mb-3 h-px bg-white/[0.06]" />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={cn(
            "group relative flex items-center rounded-xl transition-all duration-200 text-white/40 hover:text-white/70 hover:bg-white/[0.04]",
            collapsed ? "justify-center h-12 w-12 mx-auto" : "gap-3 px-3.5 h-10 w-full",
          )}
        >
          {theme === "dark" ? (
            <Sun className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-[18px] w-[18px]")} />
          ) : (
            <Moon className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-[18px] w-[18px]")} />
          )}
          {!collapsed && (
            <span className="text-[13px] font-medium">
              {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
            </span>
          )}
          {collapsed && (
            <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-[#1a2d21] text-white text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-xl z-50">
              {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 rotate-45 bg-[#1a2d21]" />
            </div>
          )}
        </button>

        {/* User / Logout */}
        {email && (
          <button
            onClick={onLogout}
            className={cn(
              "group relative flex items-center rounded-xl transition-all duration-200 text-white/40 hover:text-red-400 hover:bg-red-500/[0.06]",
              collapsed ? "justify-center h-12 w-12 mx-auto" : "gap-3 px-3.5 h-11 w-full",
            )}
          >
            {collapsed ? (
              <LogOut className="h-5 w-5 shrink-0" />
            ) : (
              <>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 shrink-0">
                  <span className="text-[11px] font-bold text-primary uppercase">
                    {email.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-[12px] font-medium text-white/60 truncate">
                    {email}
                  </div>
                  <div className="text-[10px] text-white/25 flex items-center gap-1">
                    <LogOut className="h-3 w-3" /> Sair
                  </div>
                </div>
              </>
            )}
            {collapsed && (
              <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-[#1a2d21] text-white text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-xl z-50">
                Sair
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 rotate-45 bg-[#1a2d21]" />
              </div>
            )}
          </button>
        )}
      </div>

      {/* ── Collapse toggle ── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "absolute -right-3 top-[80px] z-50",
          "flex h-6 w-6 items-center justify-center",
          "rounded-full bg-[#0c1a12] border border-white/[0.08] text-white/40",
          "hover:text-white/80 hover:border-white/20 hover:bg-[#152b1e]",
          "transition-all duration-200 shadow-lg",
        )}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>
    </aside>
  );
}
