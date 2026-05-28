'use client';

import { useAuthStore } from '@/lib/store';
import { Settings, Building, User, CreditCard } from 'lucide-react';

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  FREE: { label: 'Gratuito', color: 'bg-gray-500/15 text-gray-400' },
  STARTER: { label: 'Starter', color: 'bg-blue-500/15 text-blue-400' },
  PRO: { label: 'Pro', color: 'bg-indigo-500/15 text-indigo-400' },
  ENTERPRISE: { label: 'Enterprise', color: 'bg-purple-500/15 text-purple-400' },
};

export default function SettingsPage() {
  const { user, organization } = useAuthStore();
  const plan = PLAN_LABELS[organization?.plan ?? 'FREE'];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-400" /> Configurações
        </h1>
        <p className="text-gray-500 text-sm">Gerencie sua conta e organização</p>
      </div>

      <div className="grid gap-4">
        <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-5">
          <div className="flex items-center gap-3 mb-4">
            <Building className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-gray-200">Organização</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Nome</label>
              <p className="text-sm font-medium text-gray-200">{organization?.name}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Plano atual</label>
              <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${plan.color}`}>
                {plan.label}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-5">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-gray-200">Perfil do Usuário</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Nome</label>
              <p className="text-sm font-medium text-gray-200">{user?.name}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Email</label>
              <p className="text-sm font-medium text-gray-200">{user?.email}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-5">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-gray-200">Limites do Plano</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Free', value: '500 emails/dia' },
              { label: 'Starter', value: '10.000 emails/dia' },
              { label: 'Pro', value: '100.000 emails/dia' },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 bg-[#0d1117] rounded-lg text-center border border-[#30363d]">
                <p className="font-semibold text-gray-200">{label}</p>
                <p className="text-xs text-gray-500 mt-1">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
