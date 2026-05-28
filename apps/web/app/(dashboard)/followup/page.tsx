'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Mail, Plus, Play, Pause, Trash2, ChevronDown, ChevronUp,
  Users, Clock, CheckCircle, AlertCircle, X, UserPlus,
} from 'lucide-react';

const INPUT = "w-full bg-[#0d1117] border border-[#30363d] text-gray-100 placeholder:text-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";
const CARD = "bg-[#161b22] border border-[#30363d] rounded-xl";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-500/15 text-gray-400',
  ACTIVE: 'bg-green-500/15 text-green-400',
  PAUSED: 'bg-yellow-500/15 text-yellow-400',
};

const ENROLL_STATUS: Record<string, string> = {
  ACTIVE: 'bg-blue-500/15 text-blue-400',
  COMPLETED: 'bg-green-500/15 text-green-400',
  CANCELLED: 'bg-gray-500/15 text-gray-400',
};

export default function FollowupPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddStep, setShowAddStep] = useState<string | null>(null);
  const [showEnroll, setShowEnroll] = useState<string | null>(null);
  const [showEnrollments, setShowEnrollments] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    name: '', description: '', fromName: '', fromEmail: '', waitHours: 24, maxSteps: 5,
  });
  const [stepForm, setStepForm] = useState({ subject: '', body: '', delayHours: 24 });
  const [enrollEmails, setEnrollEmails] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['followup'],
    queryFn: () => api.get('/followup').then((r) => r.data.data),
  });

  const { data: seqDetail } = useQuery({
    queryKey: ['followup', expandedId],
    queryFn: () => api.get(`/followup/${expandedId}`).then((r) => r.data.data),
    enabled: !!expandedId,
  });

  const { data: enrollments } = useQuery({
    queryKey: ['followup-enrollments', showEnrollments],
    queryFn: () => api.get(`/followup/${showEnrollments}/enrollments`).then((r) => r.data.data),
    enabled: !!showEnrollments,
  });

  const { data: contacts } = useQuery({
    queryKey: ['contacts-all'],
    queryFn: () => api.get('/contacts', { params: { limit: 500 } }).then((r) => r.data.data),
    enabled: !!showEnroll,
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => api.post('/followup', body),
    onSuccess: () => {
      toast.success('Sequência criada!');
      qc.invalidateQueries({ queryKey: ['followup'] });
      setShowCreate(false);
      setCreateForm({ name: '', description: '', fromName: '', fromEmail: '', waitHours: 24, maxSteps: 5 });
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Erro'),
  });

  const addStepMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.post(`/followup/${id}/steps`, body),
    onSuccess: (_, { id }) => {
      toast.success('Follow-up adicionado!');
      qc.invalidateQueries({ queryKey: ['followup', id] });
      qc.invalidateQueries({ queryKey: ['followup'] });
      setShowAddStep(null);
      setStepForm({ subject: '', body: '', delayHours: 24 });
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Limite atingido'),
  });

  const deleteStepMutation = useMutation({
    mutationFn: ({ seqId, stepId }: { seqId: string; stepId: string }) =>
      api.delete(`/followup/${seqId}/steps/${stepId}`),
    onSuccess: (_, { seqId }) => {
      toast.success('Follow-up removido');
      qc.invalidateQueries({ queryKey: ['followup', seqId] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/followup/${id}/activate`),
    onSuccess: () => { toast.success('Sequência ativada!'); qc.invalidateQueries({ queryKey: ['followup'] }); },
    onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Erro'),
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => api.post(`/followup/${id}/pause`),
    onSuccess: () => { toast.success('Sequência pausada'); qc.invalidateQueries({ queryKey: ['followup'] }); },
  });

  const enrollMutation = useMutation({
    mutationFn: ({ id, contactIds }: { id: string; contactIds: string[] }) =>
      api.post(`/followup/${id}/enroll`, { contactIds }),
    onSuccess: (res) => {
      const { enrolled, skipped } = res.data.data;
      toast.success(`${enrolled} contato(s) inscritos!${skipped > 0 ? ` (${skipped} já inscritos)` : ''}`);
      qc.invalidateQueries({ queryKey: ['followup'] });
      setShowEnroll(null);
      setEnrollEmails('');
    },
    onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Erro'),
  });

  const handleEnrollByEmail = async (seqId: string) => {
    if (!contacts) return;
    const emails = enrollEmails.split('\n').map((e) => e.trim()).filter(Boolean);
    const matched = contacts
      .filter((c: any) => emails.includes(c.email))
      .map((c: any) => c.id);
    if (matched.length === 0) {
      toast.error('Nenhum contato encontrado com esses emails');
      return;
    }
    enrollMutation.mutate({ id: seqId, contactIds: matched });
  };

  const handleEnrollAll = (seqId: string) => {
    if (!contacts) return;
    const ids = contacts.filter((c: any) => c.status === 'ACTIVE').map((c: any) => c.id);
    enrollMutation.mutate({ id: seqId, contactIds: ids });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Mail className="w-6 h-6 text-indigo-400" /> Follow-up Automático
          </h1>
          <p className="text-gray-500 text-sm">Sequências de até 10 follow-ups para leads sem resposta</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 transition-colors">
          <Plus className="w-4 h-4" /> Nova Sequência
        </button>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-sm text-indigo-300">
        <Clock className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <strong className="text-indigo-200">Como funciona:</strong> Após inscrever um lead, o sistema envia
          automaticamente cada follow-up após o intervalo configurado (padrão 24h). Se o lead abrir o email,
          o follow-up para automaticamente. Máximo de 10 follow-ups por sequência.
        </div>
      </div>

      {/* Sequences List */}
      {isLoading && <div className="text-center py-10 text-gray-600">Carregando...</div>}

      <div className="space-y-4">
        {data?.map((seq: any) => (
          <div key={seq.id} className={CARD}>
            {/* Sequence Header */}
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setExpandedId(expandedId === seq.id ? null : seq.id)}
                    className="text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {expandedId === seq.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-gray-100">{seq.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[seq.status]}`}>
                        {seq.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {seq.fromName} · {seq._count.steps}/{seq.maxSteps} follow-ups · {seq._count.enrollments} inscritos · intervalo {seq.waitHours}h
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => setShowEnrollments(seq.id)}
                    className="flex items-center gap-1 px-3 py-1.5 border border-[#30363d] text-gray-400 rounded-lg text-xs hover:bg-[#262c36] transition-colors">
                    <Users className="w-3 h-3" /> Inscritos
                  </button>
                  <button onClick={() => setShowEnroll(seq.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600/80 text-indigo-100 rounded-lg text-xs hover:bg-indigo-600 transition-colors">
                    <UserPlus className="w-3 h-3" /> Inscrever
                  </button>
                  {seq.status === 'DRAFT' && (
                    <button onClick={() => activateMutation.mutate(seq.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-500 transition-colors">
                      <Play className="w-3 h-3" /> Ativar
                    </button>
                  )}
                  {seq.status === 'ACTIVE' && (
                    <button onClick={() => pauseMutation.mutate(seq.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-yellow-600 text-white rounded-lg text-xs hover:bg-yellow-500 transition-colors">
                      <Pause className="w-3 h-3" /> Pausar
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Expanded Steps */}
            {expandedId === seq.id && (
              <div className="border-t border-[#30363d] p-5 space-y-3">
                {seqDetail?.steps?.length === 0 && (
                  <p className="text-gray-600 text-sm text-center py-4">Nenhum follow-up configurado ainda</p>
                )}
                {seqDetail?.steps?.map((step: any) => (
                  <div key={step.id} className="flex items-start gap-3 p-4 bg-[#0d1117] border border-[#30363d] rounded-lg">
                    <div className="w-7 h-7 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      {step.stepNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-200">{step.subject}</p>
                        <span className="text-xs text-gray-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {step.delayHours}h após anterior
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: step.body.replace(/<[^>]+>/g, ' ').slice(0, 120) + '...' }} />
                    </div>
                    <button
                      onClick={() => { if (confirm('Remover este follow-up?')) deleteStepMutation.mutate({ seqId: seq.id, stepId: step.id }); }}
                      className="text-gray-600 hover:text-red-400 transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {(seqDetail?.steps?.length ?? 0) < seq.maxSteps && (
                  <button onClick={() => setShowAddStep(seq.id)}
                    className="w-full py-2.5 border border-dashed border-[#30363d] text-gray-500 rounded-lg text-sm hover:border-indigo-500/50 hover:text-indigo-400 transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    Adicionar Follow-up {(seqDetail?.steps?.length ?? 0) + 1} de {seq.maxSteps}
                  </button>
                )}
                {(seqDetail?.steps?.length ?? 0) >= seq.maxSteps && (
                  <p className="text-center text-xs text-gray-600 py-2">
                    Limite máximo de {seq.maxSteps} follow-ups atingido
                  </p>
                )}
              </div>
            )}
          </div>
        ))}

        {!isLoading && !data?.length && (
          <div className="text-center py-20 text-gray-600">
            <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="mb-2">Nenhuma sequência de follow-up criada</p>
            <p className="text-xs text-gray-700">Crie uma sequência e configure até 10 follow-ups automáticos</p>
          </div>
        )}
      </div>

      {/* Modal: Create Sequence */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className={`${CARD} p-6 w-full max-w-lg shadow-xl`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">Nova Sequência de Follow-up</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(createForm); }} className="space-y-3">
              <input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="Nome da sequência *" required className={INPUT} />
              <input value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Descrição (opcional)" className={INPUT} />
              <div className="grid grid-cols-2 gap-3">
                <input value={createForm.fromName} onChange={(e) => setCreateForm({ ...createForm, fromName: e.target.value })}
                  placeholder="Nome do remetente *" required className={INPUT} />
                <input value={createForm.fromEmail} onChange={(e) => setCreateForm({ ...createForm, fromEmail: e.target.value })}
                  placeholder="Email remetente *" required type="email" className={INPUT} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Intervalo entre envios (horas)</label>
                  <input type="number" min={1} max={720} value={createForm.waitHours}
                    onChange={(e) => setCreateForm({ ...createForm, waitHours: Number(e.target.value) })}
                    className={INPUT} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Máx. follow-ups (1–10)</label>
                  <input type="number" min={1} max={10} value={createForm.maxSteps}
                    onChange={(e) => setCreateForm({ ...createForm, maxSteps: Math.min(10, Number(e.target.value)) })}
                    className={INPUT} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 border border-[#30363d] text-gray-400 rounded-lg text-sm hover:bg-[#262c36] transition-colors">Cancelar</button>
                <button type="submit"
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 transition-colors">
                  {createMutation.isPending ? 'Criando...' : 'Criar Sequência'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Step */}
      {showAddStep && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className={`${CARD} p-6 w-full max-w-2xl shadow-xl`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">Novo Follow-up</h3>
              <button onClick={() => setShowAddStep(null)} className="text-gray-500 hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <input value={stepForm.subject} onChange={(e) => setStepForm({ ...stepForm, subject: e.target.value })}
                placeholder="Assunto do email *" className={INPUT} />
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Enviar após (horas sem resposta)
                </label>
                <input type="number" min={1} value={stepForm.delayHours}
                  onChange={(e) => setStepForm({ ...stepForm, delayHours: Number(e.target.value) })}
                  className={INPUT} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Corpo do email (HTML ou texto simples) · use {'{{contact.name}}'}, {'{{unsubscribe_link}}'}
                </label>
                <textarea value={stepForm.body} onChange={(e) => setStepForm({ ...stepForm, body: e.target.value })}
                  placeholder="Olá {{contact.name}}, vi que você ainda não teve chance de ver minha mensagem anterior..." rows={8}
                  className={`${INPUT} resize-none font-mono text-xs`} />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAddStep(null)}
                  className="flex-1 py-2 border border-[#30363d] text-gray-400 rounded-lg text-sm hover:bg-[#262c36] transition-colors">Cancelar</button>
                <button
                  onClick={() => addStepMutation.mutate({ id: showAddStep, body: stepForm })}
                  disabled={!stepForm.subject || !stepForm.body}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 disabled:opacity-40 transition-colors">
                  {addStepMutation.isPending ? 'Salvando...' : 'Adicionar Follow-up'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Enroll Contacts */}
      {showEnroll && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className={`${CARD} p-6 w-full max-w-md shadow-xl`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">Inscrever Contatos</h3>
              <button onClick={() => setShowEnroll(null)} className="text-gray-500 hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <button onClick={() => handleEnrollAll(showEnroll)}
                disabled={enrollMutation.isPending}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2">
                <Users className="w-4 h-4" />
                Inscrever todos os contatos ativos ({contacts?.filter((c: any) => c.status === 'ACTIVE').length ?? '...'})
              </button>
              <div className="relative flex items-center">
                <div className="flex-1 border-t border-[#30363d]" />
                <span className="px-3 text-xs text-gray-600">ou por email</span>
                <div className="flex-1 border-t border-[#30363d]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Emails (um por linha)</label>
                <textarea value={enrollEmails} onChange={(e) => setEnrollEmails(e.target.value)}
                  placeholder={"lead1@email.com\nlead2@email.com\nlead3@email.com"} rows={5}
                  className={`${INPUT} resize-none`} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowEnroll(null)}
                  className="flex-1 py-2 border border-[#30363d] text-gray-400 rounded-lg text-sm hover:bg-[#262c36] transition-colors">Cancelar</button>
                <button onClick={() => handleEnrollByEmail(showEnroll)}
                  disabled={!enrollEmails.trim() || enrollMutation.isPending}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 disabled:opacity-40 transition-colors">
                  {enrollMutation.isPending ? 'Inscrevendo...' : 'Inscrever por Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Enrollments */}
      {showEnrollments && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className={`${CARD} p-6 w-full max-w-2xl shadow-xl max-h-[80vh] flex flex-col`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Contatos Inscritos</h3>
              <button onClick={() => setShowEnrollments(null)} className="text-gray-500 hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {!enrollments?.length && (
                <p className="text-center py-10 text-gray-600 text-sm">Nenhum contato inscrito ainda</p>
              )}
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#161b22]">
                  <tr className="border-b border-[#30363d]">
                    <th className="text-left py-2 px-3 text-xs text-gray-500 font-semibold">Contato</th>
                    <th className="text-left py-2 px-3 text-xs text-gray-500 font-semibold">Step</th>
                    <th className="text-left py-2 px-3 text-xs text-gray-500 font-semibold">Status</th>
                    <th className="text-left py-2 px-3 text-xs text-gray-500 font-semibold">Próximo envio</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments?.map((e: any) => (
                    <tr key={e.id} className="border-b border-[#30363d]/50 hover:bg-[#262c36] transition-colors">
                      <td className="py-2 px-3">
                        <p className="text-gray-200 text-xs">{e.contact.name || e.contact.email}</p>
                        <p className="text-gray-600 text-xs">{e.contact.email}</p>
                      </td>
                      <td className="py-2 px-3 text-gray-400 text-xs">Follow-up {e.currentStep}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ENROLL_STATUS[e.status] || 'bg-gray-500/15 text-gray-400'}`}>
                          {e.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-500 text-xs">
                        {e.nextSendAt ? new Date(e.nextSendAt).toLocaleString('pt-BR') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
