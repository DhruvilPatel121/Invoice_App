import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  Settings,
  Menu,
  Sun,
  Moon,
  Plus,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";

const SIDEBAR_COLLAPSED_KEY = "shivvilon_sidebar_collapsed";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/invoices", label: "Invoices", icon: FileText },
  { path: "/clients", label: "Clients", icon: Users },
  { path: "/reports", label: "Reports", icon: BarChart3 },
  { path: "/settings", label: "Settings", icon: Settings },
];

// ─── Desktop Nav Link ─────────────────────────────────────────────────────────
function DesktopNavLink({
  path,
  label,
  icon: Icon,
  collapsed,
  onClick,
}: {
  path: string;
  label: string;
  icon: React.ElementType;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const location = useLocation();
  const active =
    location.pathname === path ||
    (path !== "/" && location.pathname.startsWith(path));

  const linkEl = (
    <Link
      to={path}
      onClick={onClick}
      className={cn(
        "flex items-center rounded-md text-sm font-medium transition-all duration-200",
        collapsed
          ? "justify-center w-10 h-10 mx-auto"
          : "gap-3 px-3 py-2 w-full",
        active
          ? "bg-sidebar-accent text-sidebar-primary"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-primary",
      )}
    >
      <Icon className="shrink-0 w-4 h-4" />
      {!collapsed && <span className="flex-1 min-w-0 truncate">{label}</span>}
      {!collapsed && active && (
        <ChevronRight className="shrink-0 w-3 h-3 opacity-50" />
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }
  return linkEl;
}

// ─── Mobile Nav Link ──────────────────────────────────────────────────────────
function MobileNavLink({
  path,
  label,
  icon: Icon,
  onClick,
}: {
  path: string;
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
}) {
  const location = useLocation();
  const active =
    location.pathname === path ||
    (path !== "/" && location.pathname.startsWith(path));
  return (
    <Link
      to={path}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-primary"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-primary",
      )}
    >
      <Icon className="shrink-0 w-4 h-4" />
      <span className="flex-1 min-w-0 truncate">{label}</span>
      {active && <ChevronRight className="shrink-0 w-3 h-3 opacity-50" />}
    </Link>
  );
}

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────
function DesktopSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-screen sticky top-0 shrink-0 border-r border-border bg-sidebar",
        "transition-[width] duration-200 ease-in-out overflow-hidden",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Brand Header */}
      <div
        className={cn(
          "flex items-center border-b border-sidebar-border shrink-0",
          collapsed ? "justify-center px-2 py-4" : "gap-3 px-4 py-4",
        )}
      >
        <div className="w-8 h-8 rounded bg-primary flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">
              Shivvilon
            </p>
            <p className="text-xs text-muted-foreground truncate leading-tight">
              Invoice Manager
            </p>
          </div>
        )}
      </div>

      {/* New Invoice Button */}
      <div className={cn("shrink-0 pt-3 pb-1", collapsed ? "px-2" : "px-3")}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/invoices/create">
                <Button size="icon" className="w-10 h-10 mx-auto flex">
                  <Plus className="w-4 h-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              New Invoice
            </TooltipContent>
          </Tooltip>
        ) : (
          <Link to="/invoices/create">
            <Button size="sm" className="w-full gap-2 text-xs h-8">
              <Plus className="w-3.5 h-3.5" />
              New Invoice
            </Button>
          </Link>
        )}
      </div>

      {/* Section label */}
      {!collapsed && (
        <div className="px-4 pt-3 pb-1 shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Menu
          </p>
        </div>
      )}

      {/* Scrollable Nav */}
      <nav
        className={cn(
          "flex-1 overflow-y-auto min-h-0 py-1",
          collapsed ? "px-2 space-y-1" : "px-3 space-y-0.5",
        )}
      >
        {navItems.map((item) => (
          <DesktopNavLink key={item.path} {...item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Collapse Toggle Button */}
      <div
        className={cn(
          "shrink-0 border-t border-sidebar-border py-2",
          collapsed ? "flex justify-center px-2" : "px-3",
        )}
      >
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="w-10 h-10 text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent/60"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Expand Sidebar
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground/60 truncate">
              © 2026 Shivvilon Solutions
            </p>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="shrink-0 w-7 h-7 text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent/60"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}

// ─── Mobile Sidebar Content ───────────────────────────────────────────────────
function MobileSidebarContent({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border shrink-0">
        <div className="w-8 h-8 rounded bg-primary flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">
            Shivvilon
          </p>
          <p className="text-xs text-muted-foreground truncate leading-tight">
            Invoice Manager
          </p>
        </div>
      </div>

      <div className="shrink-0 px-3 pt-3 pb-1">
        <Link to="/invoices/create" onClick={onClose}>
          <Button size="sm" className="w-full gap-2 text-xs h-8">
            <Plus className="w-3.5 h-3.5" />
            New Invoice
          </Button>
        </Link>
      </div>

      <div className="px-4 pt-3 pb-1 shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          Menu
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto min-h-0 px-3 py-1 space-y-0.5">
        {navItems.map((item) => (
          <MobileNavLink key={item.path} {...item} onClick={onClose} />
        ))}
      </nav>

      <div className="shrink-0 px-4 py-3 border-t border-sidebar-border">
        <p className="text-xs text-muted-foreground text-center">
          © 2026 Shivvilon Solutions
        </p>
      </div>
    </div>
  );
}

// ─── App Layout ───────────────────────────────────────────────────────────────
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // Close mobile sheet on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const currentPage = navItems.find(
    (n) =>
      n.path === location.pathname ||
      (n.path !== "/" && location.pathname.startsWith(n.path)),
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-screen w-full bg-background">
        {/* Desktop Sidebar */}
        <DesktopSidebar collapsed={collapsed} onToggle={toggleCollapsed} />

        {/* Main Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top Header */}
          <header className="h-14 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-30 flex items-center px-4 gap-3">
            {/* Mobile hamburger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden shrink-0 w-8 h-8"
                >
                  <Menu className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 bg-sidebar">
                <MobileSidebarContent onClose={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>

            {/* Breadcrumb / Page title */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm font-medium text-foreground truncate">
                {currentPage?.label || "Invoice Manager"}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="w-8 h-8"
                  >
                    {theme === "dark" ? (
                      <Sun className="w-4 h-4" />
                    ) : (
                      <Moon className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  {theme === "dark" ? "Light mode" : "Dark mode"}
                </TooltipContent>
              </Tooltip>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
