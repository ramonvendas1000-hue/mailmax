'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Mail, Plus, Eye, Send, X, Trash2 } from 'lucide-react';

const INPUT = "w-full bg-[#0d1117] border border-[#30363d] text-gray-100 placeholder:text-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

export default function TemplatesPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showTest, setShowTest] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [form, setForm] = useState({
    name: '',
    subject: '',
    greeting: 'Olá {{contact.name}},',
    body: '',
    cta_text: '',
    cta_url: '',
    signature: '',
  });

  const { data } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates').then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => api.post('/templates', body),
    onSuccess: () => {
      toast.success('Template criado!');
      qc.invalidateQueries({ queryKey: ['templates'] });
      setShowCreate(false);
      setForm({ name: '', subject: '', greeting: 'Olá {{contact.name}},', body: '', cta_text: '', cta_url: '', signature: '' });
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Erro ao criar'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/templates/${id}`),
    onSuccess: () => { toast.success('Template removido'); qc.invalidateQueries({ queryKey: ['templates'] }); },
  });

  const testMutation = useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) =>
      api.post(`/templates/${id}/test`, { email }),
    onSuccess: () => { toast.success('Email de teste enviado!'); setShowTest(null); setTestEmail(''); },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Erro ao enviar teste'),
  });

  const handlePreview = async (id: string) => {
    const res = await api.get(`/templates/${id}/preview`);
    setPreviewHtml(res.data.data.html);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.body.trim()) { toast.error('Escreva o corpo do email'); return; }

    // Build blocks from the simple form
    const blocks: any[] = [];

    if (form.greeting) {
      blocks.push({ id: 'greeting', type: 'text', content: `<p>${form.greeting}</p>` });
    }

    blocks.push({
      id: 'body',
      type: 'text',
      content: form.body.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '<br/>').join(''),
    });

    if (form.cta_text && form.cta_url) {
      blocks.push({ id: 'cta', type: 'button', content: form.cta_text, url: form.cta_url });
    }

    if (form.signature) {
      blocks.push({ id: 'sig', type: 'text', content: `<p style="color:#666;font-size:13px">${form.signature.replace(/\n/g, '<br/>')}</p>` });
    }

    createMutation.mutate({ name: form.name, subject: form.subject, blocks });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Mail className="w-6 h-6 text-indigo-400" /> Templates
          </h1>
          <p className="text-gray-500 text-sm">Modelos de email para suas campanhas</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 transition-colors">
          <Plus className="w-4 h-4" /> Novo Template
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {data?.map((t: any) => (
          <div key={t.id} className="bg-[#161b22] rounded-xl border border-[#30363d] p-5 hover:border-indigo-500/40 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-indigo-500/15 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-indigo-400" />
              </div>
              <button onClick={() => { if (confirm('Remover template?')) deleteMutation.mutate(t.id); }}
                className="text-gray-600 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <h3 className="font-semibold text-gray-100">{t.name}</h3>
            <p className="text-xs text-gray-500 mt-1 truncate">Assunto: {t.subject}</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => handlePreview(t.id)}
                className="flex items-center gap-1 px-3 py-1.5 border border-[#30363d] rounded-lg text-xs text-gray-400 hover:text-gray-100 hover:border-gray-500 transition-colors">
                <Eye className="w-3 h-3" /> Preview
              </button>
              <button onClick={() => { setShowTest(t.id); setTestEmail(''); }}
                className="flex items-center gap-1 px-3 py-1.5 border border-indigo-500/30 rounded-lg text-xs text-indigo-400 hover:bg-indigo-500/10 transition-colors">
                <Send className="w-3 h-3" /> Testar
              </button>
            </div>
          </div>
        ))}
        {!data?.length && (
          <div className="col-span-3 text-center py-20 text-gray-600">
            <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum template criado</p>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-lg shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-[#30363d]">
              <h3 className="text-lg font-semibold text-white">Novo Template</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-5">
              <form id="template-form" onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Nome do template *</label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Ex: Prospecção Fria" required className={INPUT} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Assunto do email *</label>
                    <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="Ex: Tenho uma proposta para você" required className={INPUT} />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">Saudação</label>
                  <input value={form.greeting} onChange={(e) => setForm({ ...form, greeting: e.target.value })}
                    placeholder="Olá {{contact.name}}," className={INPUT} />
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">Corpo do email *</label>
                  <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                    placeholder={"Escreva o conteúdo do email aqui.\n\nUse {{contact.name}} para personalizar com o nome do lead.\n\nEscreva normalmente — cada linha vira um parágrafo."}
                    rows={7} required
                    className={`${INPUT} resize-none`} />
                  <p className="text-xs text-gray-600 mt-1">Use <span className="text-indigo-400 font-mono">{'{{contact.name}}'}</span> para inserir o nome do lead automaticamente</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Botão (texto)</label>
                    <input value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })}
                      placeholder="Ex: Agendar reunião" className={INPUT} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Botão (link)</label>
                    <input value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })}
                      placeholder="https://calendly.com/..." className={INPUT} />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">Assinatura</label>
                  <textarea value={form.signature} onChange={(e) => setForm({ ...form, signature: e.target.value })}
                    placeholder={"Atenciosamente,\nRamon\nAgência Kraft\n(11) 99999-9999"}
                    rows={3}
                    className={`${INPUT} resize-none`} />
                </div>
              </form>
            </div>

            <div className="p-5 border-t border-[#30363d] flex gap-2">
              <button type="button" onClick={() => setShowCreate(false)}
                className="flex-1 py-2 border border-[#30363d] text-gray-400 rounded-lg text-sm hover:bg-[#262c36] transition-colors">Cancelar</button>
              <button type="submit" form="template-form"
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 transition-colors">
                {createMutation.isPending ? 'Criando...' : 'Criar Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test email modal */}
      {showTest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-base font-semibold text-white mb-4">Enviar email de teste</h3>
            <input value={testEmail} onChange={(e) => setTestEmail(e.target.value)}
              placeholder="seu@email.com" type="email"
              className={INPUT} />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowTest(null)}
                className="flex-1 py-2 border border-[#30363d] text-gray-400 rounded-lg text-sm">Cancelar</button>
              <button onClick={() => showTest && testEmail && testMutation.mutate({ id: showTest, email: testEmail })}
                disabled={!testEmail || testMutation.isPending}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">
                {testMutation.isPending ? 'Enviando...' : 'Enviar teste'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {previewHtml && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 w-full max-w-2xl shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Preview</h3>
              <button onClick={() => setPreviewHtml(null)} className="text-gray-500 hover:text-gray-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto border border-[#30363d] rounded-lg bg-white">
              <iframe srcDoc={previewHtml} className="w-full h-full min-h-96 border-0" title="preview" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
