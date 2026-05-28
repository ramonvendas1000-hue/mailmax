'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Filter, Users, TrendingUp } from 'lucide-react';

export default function SegmentsPage() {
  const { data: rfm } = useQuery({
    queryKey: ['segments', 'rfm'],
    queryFn: () => api.get('/segments/rfm').then((r) => r.data.data),
  });

  const { data: segments } = useQuery({
    queryKey: ['segments'],
    queryFn: () => api.get('/segments').then((r) => r.data.data),
  });

  const RFM_COLORS: Record<string, string> = {
    VIP: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    'Em ascensão': 'bg-green-500/15 text-green-400 border-green-500/30',
    'Em risco': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    Dormentes: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
    Novos: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    Compradores: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Filter className="w-6 h-6 text-indigo-400" /> Segmentos
        </h1>
        <p className="text-gray-500 text-sm">Segmentação inteligente e RFM automático</p>
      </div>

      <div>
        <h2 className="text-base font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Segmentos RFM Automáticos
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {rfm?.map((segment: any) => (
            <div key={segment.category} className={`rounded-xl border p-4 ${RFM_COLORS[segment.category] || 'bg-[#161b22] border-[#30363d]'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">{segment.category}</span>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 opacity-70" />
                  <span className="text-2xl font-bold">{segment.count}</span>
                </div>
              </div>
              <p className="text-xs opacity-70">{segment.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-gray-300 mb-3">Segmentos Personalizados</h2>
        {segments?.length === 0 && (
          <div className="text-center py-10 text-gray-500 bg-[#161b22] rounded-xl border border-[#30363d]">
            <Filter className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum segmento personalizado criado</p>
          </div>
        )}
        <div className="grid gap-3">
          {segments?.map((s: any) => (
            <div key={s.id} className="bg-[#161b22] rounded-xl border border-[#30363d] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-100">{s.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Lógica: {s.conditionLogic}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
