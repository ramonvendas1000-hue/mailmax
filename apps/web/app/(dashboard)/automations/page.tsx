'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Workflow, Plus, Play, Pause, Users } from 'lucide-react';

export default function AutomationsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const { data } = useQuery({
    queryKey: ['automations'],
    queryFn: () => api.get('/automations').then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => api.post('/automations', body),
    onSuccess: () => {
      toast.success('Automação criada!');
      qc.invalidateQueries({ queryKey: ['automations'] });
      setShowCreate(false);
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/automations/${id}/activate`),
    onSuccess: () => {
      toast.success('Automação ativada!');
      qc.invalidateQueries({ queryKey: ['automations'] });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => api.post(`/automations/${id}/pause`),
    onSuccess: () => {
      toast.success('Automação pausada');
      qc.invalidateQueries({ queryKey: ['automations'] });
    },
  });

  const STATUS_COLORS: Record<string, string> = {
    DRAFT: 'bg-gray-500/15 text-gray-400',
    ACTIVE: 'bg-green-500/15 text-green-400',
    PAUSED: 'bg-yellow-500/15 text-yellow-400',
    ARCHIVED: 'bg-red-500/15 text-red-400',
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Workflow className="w-6 h-6 text-indigo-400" /> Automações
          </h1>
          <p className="text-gray-500 text-sm">Fluxos de automação com lógica condicional</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> Nova Automação
        </button>
      </div>

      <div className="grid gap-4">
        {data?.map((auto: any) => (
          <div key={auto.id} className="bg-[#161b22] rounded-xl border border-[#30363d] p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-gray-100">{auto.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[auto.status]}`}>
                    {auto.status}
                  </span>
                </div>
                {auto.description && <p className="text-sm text-gray-500">{auto.description}</p>}
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                  <Users className="w-3 h-3" />
                  <span>{auto._count?.enrollments ?? 0} inscritos</span>
                </div>
              </div>
              <div className="flex gap-2">
                {auto.status === 'DRAFT' && (
                  <button onClick={() => activateMutation.mutate(auto.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition-colors">
                    <Play className="w-3 h-3" /> Ativar
                  </button>
                )}
                {auto.status === 'ACTIVE' && (
                  <button onClick={() => pauseMutation.mutate(auto.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-xs hover:bg-yellow-600 transition-colors">
                    <Pause className="w-3 h-3" /> Pausar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {!data?.length && (
          <div className="text-center py-20 text-gray-500">
            <Workflow className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma automação criada ainda</p>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4">Nova Automação</h3>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, nodes: [], edges: [] }); }} className="space-y-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome da automação *" required
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descrição (opcional)" rows={3}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none" />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 border border-[#30363d] rounded-lg text-sm text-gray-400 hover:text-gray-100 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
                  {createMutation.isPending ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
