import { Link, useLocation } from "wouter";
import { authClient, clearToken } from "../lib/auth";
import { Home, Play, FileText, Apple, LogOut, Menu, X, ChevronRight, Shield, CreditCard, MessageCircle } from "lucide-react";
import { useState } from "react";

// O Ciclo vive agora dentro da Nutrição (separador) — menos ícones na barra móvel.
const navItems = [
  { path: "/", icon: Home, label: "Início" },
  { path: "/videos", icon: Play, label: "Vídeos" },
  { path: "/conteudos", icon: FileText, label: "Conteúdos" },
  { path: "/nutricao", icon: Apple, label: "Nutrição" },
  { path: "/chat", icon: MessageCircle, label: "Chat" },
];

const adminNavItem = { path: "/admin", icon: Shield, label: "Admin" };

export function Sidebar() {
  const [location] = useLocation();
  const { data: session } = authClient.useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await authClient.signOut();
    clearToken();
    window.location.href = "/login";
  };

  const role = (session?.user as any)?.role as string ?? "pending";
  const allNavItems = role === "admin" ? [...navItems, adminNavItem] : navItems;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-8">
        <img src="/focu-logo.jpg" alt="FO.CU" className="w-28 object-contain" />
        <p className="text-xs font-500 mt-2" style={{ color: "var(--gray)" }}>A tua plataforma 🍑</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-1">
        {allNavItems.map(({ path, icon: Icon, label }) => {
          const active = location === path || (path !== "/" && location.startsWith(path));
          return (
            <Link key={path} to={path} onClick={() => setMobileOpen(false)}>
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
                active
                  ? "text-white font-semibold shadow-md"
                  : "font-medium hover:bg-white/60"
              }`} style={active ? { background: label === "Admin" ? "#7C3AED" : "var(--orange)" } : { color: "var(--gray)" }}>
                <Icon size={20} />
                <span>{label}</span>
                {active && <ChevronRight size={16} className="ml-auto" />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="px-4 pb-6 mt-4">
        <div className="rounded-xl p-4" style={{ background: "var(--peach)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm" style={{ background: "var(--orange)" }}>
              {session?.user?.name?.charAt(0).toUpperCase() ?? "M"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "var(--black)" }}>{session?.user?.name ?? "Membro"}</p>
              <p className="text-xs truncate" style={{ color: "var(--gray)" }}>{session?.user?.email}</p>
            </div>
          </div>
          <Link to="/mensalidade" onClick={() => setMobileOpen(false)}>
            <div className="mt-3 flex items-center gap-2 text-xs font-bold cursor-pointer transition-opacity hover:opacity-80 px-3 py-2 rounded-lg" style={{ background: "var(--orange)", color: "white" }}>
              <CreditCard size={14} />
              <span>Renovar mensalidade</span>
            </div>
          </Link>
          <button onClick={handleSignOut} className="mt-2 flex items-center gap-2 text-xs font-medium cursor-pointer transition-opacity hover:opacity-70 w-full" style={{ color: "var(--gray)" }}>
            <LogOut size={14} />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 min-h-screen border-r" style={{ background: "var(--white)", borderColor: "var(--gray-lt)" }}>
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 border-b" style={{ background: "var(--white)", borderColor: "var(--gray-lt)" }}>
        <img src="/focu-logo.jpg" alt="FO.CU" className="h-10 object-contain" />
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-xl" style={{ background: "var(--peach)" }}>
          {mobileOpen ? <X size={22} style={{ color: "var(--orange)" }} /> : <Menu size={22} style={{ color: "var(--orange)" }} />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30" onClick={() => setMobileOpen(false)} style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="absolute top-0 left-0 w-72 h-full shadow-2xl" style={{ background: "var(--white)" }} onClick={e => e.stopPropagation()}>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex border-t" style={{ background: "var(--white)", borderColor: "var(--gray-lt)" }}>
        {allNavItems.map(({ path, icon: Icon, label }) => {
          const active = location === path || (path !== "/" && location.startsWith(path));
          const activeColor = label === "Admin" ? "#7C3AED" : "var(--orange)";
          return (
            <Link key={path} to={path} className="flex-1">
              <div className={`flex flex-col items-center py-2 gap-0.5 cursor-pointer`}>
                <Icon size={22} style={{ color: active ? activeColor : "var(--gray)" }} />
                <span className="text-[10px] font-medium" style={{ color: active ? activeColor : "var(--gray)" }}>{label}</span>
              </div>
            </Link>
          );
        })}
        <button onClick={handleSignOut} className="flex-1 flex flex-col items-center py-2 gap-0.5 cursor-pointer">
          <LogOut size={22} style={{ color: "var(--gray)" }} />
          <span className="text-[10px] font-medium" style={{ color: "var(--gray)" }}>Sair</span>
        </button>
      </nav>
    </>
  );
}
