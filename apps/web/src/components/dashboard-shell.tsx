"use client";

import { Activity, CreditCard, LayoutDashboard, LogOut, Menu, Settings, ShieldAlert, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Transactions", icon: CreditCard },
  { href: "/dashboard/fraud", label: "Fraud review", icon: ShieldAlert },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { merchant, refreshToken, clear } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => { if (hydrated && !merchant) router.replace("/login"); }, [hydrated, merchant, router]);

  async function logout() {
    if (refreshToken) await api.logout(refreshToken).catch(() => undefined);
    clear(); router.replace("/login");
  }
  if (!hydrated || !merchant) return <div className="page-loader"><Activity className="spin" /> Loading workspace</div>;

  return <div className="app-shell">
    <aside className={open ? "sidebar open" : "sidebar"}>
      <div className="sidebar-head"><Link href="/dashboard" className="brand"><ShieldCheck size={23} /> TxnGuard</Link><button className="icon-button mobile-only" onClick={() => setOpen(false)} aria-label="Close navigation"><X /></button></div>
      <nav>{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} className={pathname === href ? "nav-link active" : "nav-link"}><Icon size={18} />{label}</Link>)}</nav>
      <div className="merchant-block"><span className="avatar">{merchant.name.slice(0, 2).toUpperCase()}</span><div><strong>{merchant.name}</strong><small>{merchant.email}</small></div><button className="icon-button" onClick={logout} aria-label="Sign out" title="Sign out"><LogOut size={18} /></button></div>
    </aside>
    {open && <button className="scrim" onClick={() => setOpen(false)} aria-label="Close navigation" />}
    <main className="workspace"><header className="topbar"><button className="icon-button mobile-only" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu /></button><div className="live"><span /> Live monitoring</div></header>{children}</main>
  </div>;
}
