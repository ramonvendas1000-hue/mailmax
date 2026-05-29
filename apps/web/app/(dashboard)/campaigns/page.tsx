'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Megaphone, Plus, Play, Trash2, X, Mail, Users, BarChart2, ChevronDown, ChevronUp } from 'lucide-react';

const INPUT = "w-full bg-[#0d1117] border border-[#30363d] text-gray-100 placeholder:text-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";
const SELECT = "w-full bg-[#0d1117] border border-[#30363d] text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-500/15 text-gray-400',
  SCHEDULED: 'bg-blue-500/15 text-blue-400',
  SENDING: 'bg-yellow-500/15 text-yellow-400',
  SENT: 'bg-green-500/15 text-green-400',
  PAUSED: 'bg-orange-500/15 text-orange-400',
  CANCELLED: 'bg-red-500/15 text-red-400',
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Rascunho', SCHEDULED: 'Agendada', SENDING: 'Enviando',
  SENT: 'Enviada', PAUSED: 'Pausada', CANCELLED: 'Cancelada',
};

export default function CampaignsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', subject: '', fromName: '', fromEmail: 'onboarding@resend.dev',
    templateId: '', listIds: [] as string[],
  });

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.get('/campaigns').then((r) => r.data),
  });

  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates').then((r) => r.data.data),
    enabled: showCreate,
  });

  const { data: lists } = useQuery({
    queryKey: ['lists'],
    queryFn: () => api.get('/lists').then((r) => r.data.data),
    enabled: showCreate,
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => api.post('/campaigns', body),
    onSuccess: () => {
      toast.success('Campanha criada!');
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      setShowCreate(false);
      setForm({ name: '', subject: '', fromName: '', fromEmail: 'onboarding@resend.dev', templateId: '', listIds: [] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Erro ao criar'),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/campaigns/${id}/send`),
    onSuccess: (res) => {
      toast.success(res.data.data?.message || 'Campanha disparada!');
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Erro ao disparar'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/campaigns/${id}`),
    onSuccess: () => { toast.success('Campanha removida'); qc.invalidateQueries({ queryKey: ['campaigns'] }); },
  });

  const toggleList = (id: string) => {
    setForm(f => ({
      ...f,
      listIds: f.listIds.includes(id) ? f.listIds.filter(x => x !== id) : [...f.listIds, id],
    }));
  };

  const handleSend = (campaign: any) => {
    const listNames = campaign.lists?.map((cl: any) => cl.list?.name).join(', ') || 'nenhuma lista';
    if (confirm(`Disparar a campanha "${campaign.name}" para: ${listNames}?\n\nEssa ação não pode ser desfeita.`)) {
      sendMutation.mutate(campaign.id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-indigo-400" /> Campanhas
          </h1>
          <p className="text-gray-500 text-sm">Crie e dispare seus emails em massa</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 transition-colors">
          <Plus className="w-4 h-4" /> Nova Campanha
        </button>
      </div>

      <div className="grid gap-4">
        {isLoading && <div className="text-center py-10 text-gray-600">Carregando...</div>}

        {data?.data?.map((c: any) => (
          <div key={c.id} className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
            <div className="p-5 flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h3 className="font-semibold text-gray-100">{c.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                    {STATUS_LABEL[c.status] || c.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-500">
                  <span><span className="text-gray-600">Assunto:</span> <span className="text-gray-300">{c.subject}</span></span>
                  <span><span className="text-gray-600">Remetente:</span> <span className="text-gray-300">{c.fromName} &lt;{c.fromEmail}&gt;</span></span>
                  {c.lists?.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span className="text-gray-300">{c.lists.map((cl: any) => cl.list?.name).join(', ')}</span>
                    </span>
                  )}
                  {c.template && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      <span className="text-gray-300">Template: {c.template?.name || '—'}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4 shrink-0">
                {c.status === 'DRAFT' && (
                  <button onClick={() => handleSend(c)}
                    disabled={sendMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-500 disabled:opacity-50 transition-colors">
                    <Play className="w-3 h-3" /> Disparar
                  </button>
                )}
                {c.stats && (
                  <button onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                    className="flex items-center gap-1 px-2 py-1.5 border border-[#30363d] text-gray-500 rounded-lg text-xs hover:text-gray-300 transition-colors">
                    <BarChart2 className="w-3 h-3" />
                    {expandedId === c.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}
                <button onClick={() => { if (confirm('Remover campanha?')) deleteMutation.mutate(c.id); }}
                  className="text-gray-600 hover:text-red-400 p-1.5 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stats */}
            {expandedId === c.id && c.stats && (
              <div className="border-t border-[#30363d] px-5 py-4 grid grid-cols-4 gap-4">
                {[
                  { label: 'Enviados', value: c.stats.sent, color: 'text-gray-300' },
                  { label: 'Abertos', value: c.stats.uniqueOpened, extra: c.stats.sent > 0 ? `${((c.stats.uniqueOpened / c.stats.sent) * 100).toFixed(1)}%` : '0%', color: 'text-blue-400' },
                  { label: 'Cliques', value: c.stats.uniqueClicked, extra: c.stats.sent > 0 ? `${((c.stats.uniqueClicked / c.stats.sent) * 100).toFixed(1)}%` : '0%', color: 'text-indigo-400' },
                  { label: 'Descadastros', value: c.stats.unsubscribed ?? 0, color: 'text-red-400' },
                ].map(({ label, value, extra, color }) => (
                  <div key={label} className="text-center">
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    {extra && <p className="text-xs text-gray-500">{extra}</p>}
                    <p className="text-xs text-gray-600 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {!isLoading && !data?.data?.length && (
          <div className="text-center py-20 text-gray-600">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma campanha criada ainda</p>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-lg shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-[#30363d]">
              <h3 className="text-lg font-semibold text-white">Nova Campanha</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-5">
              <form id="campaign-form" onSubmit={(e) => {
                e.preventDefault();
                if (!form.templateId) { toast.error('Selecione um template'); return; }
                if (form.listIds.length === 0) { toast.error('Selecione pelo menos uma lista'); return; }
                createMutation.mutate({ ...form });
              }} className="space-y-4">

                <div>
                  <label className="text-xs text-gray-500 block mb-1">Nome da campanha *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Prospecção Maio 2026" required className={INPUT} />
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">Assunto do email *</label>
                  <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="Ex: Olá {{contact.name}}, tenho uma proposta" required className={INPUT} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Nome do remetente *</label>
                    <input value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })}
                      placeholder="Ex: Ramon da Kraft" required className={INPUT} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Email remetente *</label>
                    <input value={form.fromEmail} onChange={(e) => setForm({ ...form, fromEmail: e.target.value })}
                      placeholder="onboarding@resend.dev" required type="email" className={INPUT} />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">Template de email *</label>
                  {!templates?.length ? (
                    <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-xs text-yellow-400">
                      ⚠️ Nenhum template criado. Crie um em <strong>Templates</strong> antes de criar a campanha.
                    </div>
                  ) : (
                    <select value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })}
                      required className={SELECT}>
                      <option value="">Selecione um template...</option>
                      {templates.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name} — {t.subject}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-2">Listas de contatos * (selecione uma ou mais)</label>
                  {!lists?.length ? (
                    <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-xs text-yellow-400">
                      ⚠️ Nenhuma lista criada. Importe contatos primeiro.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {lists.map((l: any) => (
                        <label key={l.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.listIds.includes(l.id) ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-[#30363d] hover:border-gray-500'}`}>
                          <input type="checkbox" checked={form.listIds.includes(l.id)}
                            onChange={() => toggleList(l.id)} className="accent-indigo-500" />
                          <div>
                            <p className="text-sm text-gray-200">{l.name}</p>
                            <p className="text-xs text-gray-500">{l._count?.contacts ?? 0} contatos</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-xs text-gray-500">
                  💡 Use <span className="text-indigo-400 font-mono">{'{{contact.name}}'}</span> no assunto ou corpo para personalizar com o nome de cada lead.
                </div>
              </form>
            </div>

            <div className="p-5 border-t border-[#30363d] flex gap-2">
              <button type="button" onClick={() => setShowCreate(false)}
                className="flex-1 py-2 border border-[#30363d] text-gray-400 rounded-lg text-sm hover:bg-[#262c36] transition-colors">Cancelar</button>
              <button type="submit" form="campaign-form"
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 transition-colors">
                {createMutation.isPending ? 'Criando...' : 'Criar Campanha'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
