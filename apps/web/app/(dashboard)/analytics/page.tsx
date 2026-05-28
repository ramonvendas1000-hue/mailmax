'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, DollarSign, TrendingUp, Mail } from 'lucide-react';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
const CARD = 'bg-[#161b22] border border-[#30363d] rounded-xl';
const TOOLTIP_STYLE = { background: '#1c2128', border: '1px solid #30363d', borderRadius: 8, color: '#e5e7eb' };

export default function AnalyticsPage() {
  const { data: overview } = useQuery({
    queryKey: ['analytics', 'overview', 30],
    queryFn: () => api.get('/analytics/overview', { params: { days: 30 } }).then((r) => r.data.data),
  });
  const { data: campaigns } = useQuery({
    queryKey: ['analytics', 'campaigns'],
    queryFn: () => api.get('/analytics/campaigns').then((r) => r.data.data),
  });
  const { data: revenue } = useQuery({
    queryKey: ['analytics', 'revenue'],
    queryFn: () => api.get('/analytics/revenue').then((r) => r.data.data),
  });
  const { data: contacts } = useQuery({
    queryKey: ['analytics', 'contacts'],
    queryFn: () => api.get('/analytics/contacts').then((r) => r.data.data),
  });

  const iconColors: Record<string, string> = {
    indigo: 'bg-indigo-500/15 text-indigo-400',
    green: 'bg-green-500/15 text-green-400',
    blue: 'bg-blue-500/15 text-blue-400',
    yellow: 'bg-yellow-500/15 text-yellow-400',
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-400" /> Analytics
        </h1>
        <p className="text-gray-500 text-sm">Métricas de performance e receita</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: Mail, label: 'Enviados', value: overview?.sends?.sent ?? 0, color: 'indigo' },
          { icon: TrendingUp, label: 'Taxa abertura', value: overview?.openRate ? `${overview.openRate}%` : '0%', color: 'green' },
          { icon: TrendingUp, label: 'CTR', value: overview?.ctr ? `${overview.ctr}%` : '0%', color: 'blue' },
          { icon: DollarSign, label: 'Receita total', value: overview?.revenue ? `R$ ${Number(overview.revenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00', color: 'yellow' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className={`${CARD} p-5`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${iconColors[color]}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className={`${CARD} p-5`}>
          <h3 className="font-semibold text-gray-200 mb-4">Performance de Campanhas</h3>
          {campaigns?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={campaigns.slice(0, 8)}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="sent" fill="#6366f1" name="Enviados" radius={[4,4,0,0]} />
                <Bar dataKey="openRate" fill="#10b981" name="Abertura %" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-600 text-sm text-center py-10">Sem dados de campanhas</p>}
        </div>

        <div className={`${CARD} p-5`}>
          <h3 className="font-semibold text-gray-200 mb-4">Receita por Campanha</h3>
          {revenue?.byCampaign?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={revenue.byCampaign} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                  {revenue.byCampaign.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => `R$ ${Number(v).toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-600 text-sm text-center py-10">Sem conversões registradas</p>}
        </div>
      </div>

      <div className={`${CARD} p-5`}>
        <h3 className="font-semibold text-gray-200 mb-4">Top Contatos por Score</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#30363d]">
                <th className="text-left py-2 px-3 text-xs text-gray-500 font-semibold">Contato</th>
                <th className="text-right py-2 px-3 text-xs text-gray-500 font-semibold">Score</th>
                <th className="text-right py-2 px-3 text-xs text-gray-500 font-semibold">Receita</th>
              </tr>
            </thead>
            <tbody>
              {contacts?.byScore?.map((c: any) => (
                <tr key={c.id} className="border-b border-[#30363d]/50 hover:bg-[#262c36] transition-colors">
                  <td className="py-2 px-3 text-gray-300">{c.name || c.email}</td>
                  <td className="py-2 px-3 text-right font-semibold text-indigo-400">{c.score}</td>
                  <td className="py-2 px-3 text-right text-green-400">R$ {c.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
