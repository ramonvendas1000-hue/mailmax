'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, List, Filter, Mail, Megaphone,
  Workflow, BarChart3, ShieldCheck, Radio, Settings, LogOut, Zap, RefreshCcw,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/contacts', icon: Users, label: 'Contatos' },
  { href: '/lists', icon: List, label: 'Listas' },
  { href: '/segments', icon: Filter, label: 'Segmentos' },
  { href: '/templates', icon: Mail, label: 'Templates' },
  { href: '/campaigns', icon: Megaphone, label: 'Campanhas' },
  { href: '/followup', icon: RefreshCcw, label: 'Follow-up' },
  { href: '/automations', icon: Workflow, label: 'Automações' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/deliverability', icon: ShieldCheck, label: 'Entregabilidade' },
  { href: '/channels', icon: Radio, label: 'Canais' },
  { href: '/settings', icon: Settings, label: 'Configurações' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const handleLogout = () => {
    logout();
    toast.info('Sessão encerrada');
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-[#0d1117]">
      <aside className="w-60 bg-[#161b22] border-r border-[#30363d] flex flex-col shrink-0">
        {/* Logo */}
        <div className="p-4 border-b border-[#30363d]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">MailMax Pro</p>
              <p className="text-xs text-indigo-400 font-medium">Agência Kraft</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-indigo-500/15 text-indigo-400 font-medium'
                    : 'text-gray-400 hover:bg-[#262c36] hover:text-gray-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-2.5 border-t border-[#30363d]">
          <div className="flex items-center gap-3 px-3 py-2 mb-0.5 rounded-lg">
            <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 text-sm font-semibold shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
