'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Mail, TrendingUp, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';

const CARD = 'bg-[#161b22] border border-[#30363d] rounded-xl';

export default function DashboardPage() {
  const { data: overview } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => api.get('/analytics/overview').then((r) => r.data.data),
  });
  const { data: deliverability } = useQuery({
    queryKey: ['deliverability', 'health'],
    queryFn: () => api.get('/deliverability/health').then((r) => r.data.data),
  });
  const { data: topContacts } = useQuery({
    queryKey: ['analytics', 'contacts'],
    queryFn: () => api.get('/analytics/contacts').then((r) => r.data.data),
  });
  const { data: campaigns } = useQuery({
    queryKey: ['analytics', 'campaigns'],
    queryFn: () => api.get('/analytics/campaigns').then((r) => r.data.data),
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-500 text-sm">Visão geral da sua conta — últimos 30 dias</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Users} label="Contatos ativos" value={overview?.contacts?.active ?? '—'} color="blue" />
        <StatCard icon={Mail} label="Emails enviados" value={overview?.sends?.sent ?? '—'} color="indigo" />
        <StatCard icon={TrendingUp} label="Taxa de abertura" value={overview?.openRate ? `${overview.openRate}%` : '—'} color="green" />
        <StatCard icon={DollarSign} label="Receita atribuída" value={overview?.revenue ? `R$ ${Number(overview.revenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'} color="yellow" />
      </div>

      {deliverability?.alerts?.length > 0 && (
        <div className="space-y-2">
          {deliverability.alerts.map((alert: any, i: number) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-lg text-sm ${alert.type === 'danger' ? 'bg-red-900/20 text-red-400 border border-red-900/30' : 'bg-yellow-900/20 text-yellow-400 border border-yellow-900/30'}`}>
              <AlertTriangle className="w-4 h-4 shrink-0" />{alert.message}
            </div>
          ))}
        </div>
      )}

      {deliverability && !deliverability.alerts?.length && (
        <div className="flex items-center gap-3 p-3 bg-green-900/20 text-green-400 border border-green-900/30 rounded-lg text-sm">
          <CheckCircle className="w-4 h-4" />
          Entregabilidade saudável — score {deliverability.score}/100
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className={`${CARD} p-5`}>
          <h3 className="font-semibold text-gray-200 mb-4">Performance de Campanhas</h3>
          {campaigns?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={campaigns.slice(0, 5)}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip contentStyle={{ background: '#1c2128', border: '1px solid #30363d', borderRadius: 8, color: '#e5e7eb' }} />
                <Bar dataKey="sent" fill="#6366f1" name="Enviados" radius={[4,4,0,0]} />
                <Bar dataKey="openRate" fill="#10b981" name="Abertura %" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-600 text-sm">Sem campanhas enviadas</div>
          )}
        </div>

        <div className={`${CARD} p-5`}>
          <h3 className="font-semibold text-gray-200 mb-4">Top 10 Contatos por Score</h3>
          <div className="space-y-2 overflow-y-auto max-h-48">
            {topContacts?.byScore?.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-400 truncate">{c.name || c.email}</span>
                <span className="font-semibold text-indigo-400 ml-2">{c.score} pts</span>
              </div>
            ))}
            {!topContacts?.byScore?.length && <p className="text-gray-600 text-sm">Sem dados</p>}
          </div>
        </div>
      </div>

      <div className={`${CARD} p-5`}>
        <h3 className="font-semibold text-gray-200 mb-4">Métricas de Envio (30 dias)</h3>
        <div className="grid grid-cols-5 gap-4 text-center">
          {[
            { label: 'Enviados', value: overview?.sends?.sent },
            { label: 'Entregues', value: overview?.sends?.delivered },
            { label: 'Abertos', value: overview?.sends?.opened },
            { label: 'Clicados', value: overview?.sends?.clicked },
            { label: 'Bounces', value: overview?.sends?.bounced },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d]">
              <p className="text-2xl font-bold text-gray-100">{value ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500/15 text-blue-400',
    indigo: 'bg-indigo-500/15 text-indigo-400',
    green: 'bg-green-500/15 text-green-400',
    yellow: 'bg-yellow-500/15 text-yellow-400',
  };
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
