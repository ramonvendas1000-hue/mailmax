'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Megaphone, Plus, Play, Trash2 } from 'lucide-react';

const INPUT = "w-full bg-[#0d1117] border border-[#30363d] text-gray-100 placeholder:text-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-500/15 text-gray-400',
  SCHEDULED: 'bg-blue-500/15 text-blue-400',
  SENDING: 'bg-yellow-500/15 text-yellow-400',
  SENT: 'bg-green-500/15 text-green-400',
  PAUSED: 'bg-orange-500/15 text-orange-400',
  CANCELLED: 'bg-red-500/15 text-red-400',
};

export default function CampaignsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', subject: '', fromName: '', fromEmail: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.get('/campaigns').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => api.post('/campaigns', body),
    onSuccess: () => {
      toast.success('Campanha criada!');
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      setShowCreate(false);
      setForm({ name: '', subject: '', fromName: '', fromEmail: '' });
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Erro'),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/campaigns/${id}/send`),
    onSuccess: (res) => { toast.success(res.data.data.message); qc.invalidateQueries({ queryKey: ['campaigns'] }); },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Erro ao disparar'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/campaigns/${id}`),
    onSuccess: () => { toast.success('Campanha removida'); qc.invalidateQueries({ queryKey: ['campaigns'] }); },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-indigo-400" /> Campanhas
          </h1>
          <p className="text-gray-500 text-sm">Crie e dispare suas campanhas de email</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 transition-colors">
          <Plus className="w-4 h-4" /> Nova Campanha
        </button>
      </div>

      <div className="grid gap-4">
        {isLoading && <div className="text-center py-10 text-gray-600">Carregando...</div>}
        {data?.data?.map((c: any) => (
          <div key={c.id} className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-gray-100">{c.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                    {c.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500">Assunto: {c.subject}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {c.fromName} &lt;{c.fromEmail}&gt;
                  {c.sentAt && ` · Enviado em ${new Date(c.sentAt).toLocaleDateString('pt-BR')}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {c.status === 'DRAFT' && (
                  <button onClick={() => { if (confirm('Disparar campanha agora?')) sendMutation.mutate(c.id); }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-500 transition-colors">
                    <Play className="w-3 h-3" /> Disparar
                  </button>
                )}
                {c.stats && (
                  <div className="flex gap-4 text-xs text-gray-500 mr-2">
                    <span>📧 {c.stats.sent}</span>
                    <span>📂 {c.stats.uniqueOpened}</span>
                    <span>🖱 {c.stats.uniqueClicked}</span>
                    <span className="text-green-400 font-medium">R$ {c.stats.revenue.toFixed(2)}</span>
                  </div>
                )}
                <button onClick={() => { if (confirm('Remover campanha?')) deleteMutation.mutate(c.id); }}
                  className="text-gray-600 hover:text-red-400 p-1 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {!isLoading && !data?.data?.length && (
          <div className="text-center py-20 text-gray-600">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma campanha criada ainda</p>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4">Nova Campanha</h3>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome da campanha *" required className={INPUT} />
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Assunto do email *" required className={INPUT} />
              <input value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })}
                placeholder="Nome do remetente *" required className={INPUT} />
              <input value={form.fromEmail} onChange={(e) => setForm({ ...form, fromEmail: e.target.value })}
                placeholder="Email do remetente *" required type="email" className={INPUT} />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 border border-[#30363d] text-gray-400 rounded-lg text-sm hover:bg-[#262c36] transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 transition-colors">
                  {createMutation.isPending ? 'Criando...' : 'Criar Campanha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
