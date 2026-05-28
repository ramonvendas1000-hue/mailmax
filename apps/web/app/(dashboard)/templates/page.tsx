'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Mail, Plus, Eye } from 'lucide-react';

export default function TemplatesPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', subject: '', content: '' });

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
    },
  });

  const handlePreview = async (id: string) => {
    const res = await api.get(`/templates/${id}/preview`);
    setPreviewHtml(res.data.data.html);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name: form.name,
      subject: form.subject,
      blocks: [{ id: 'b1', type: 'text', content: form.content }],
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Mail className="w-6 h-6 text-indigo-400" /> Templates
          </h1>
          <p className="text-gray-500 text-sm">Crie e gerencie seus templates de email</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
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
              <span className={`px-2 py-0.5 rounded-full text-xs ${t.status === 'ACTIVE' ? 'bg-green-500/15 text-green-400' : 'bg-gray-500/15 text-gray-400'}`}>
                {t.status}
              </span>
            </div>
            <h3 className="font-semibold text-gray-100">{t.name}</h3>
            <p className="text-xs text-gray-500 mt-1 truncate">{t.subject}</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => handlePreview(t.id)}
                className="flex items-center gap-1 px-3 py-1.5 border border-[#30363d] rounded-lg text-xs text-gray-400 hover:text-gray-100 hover:border-gray-500 transition-colors">
                <Eye className="w-3 h-3" /> Preview
              </button>
            </div>
          </div>
        ))}
        {!data?.length && (
          <div className="col-span-3 text-center py-20 text-gray-500">Nenhum template criado</div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4">Novo Template</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome do template *" required
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Assunto *" required
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Conteúdo HTML do email (use {{contact.name}}, {{unsubscribe_link}})"
                rows={8}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm font-mono text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 resize-none" />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 border border-[#30363d] rounded-lg text-sm text-gray-400 hover:text-gray-100 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
                  {createMutation.isPending ? 'Criando...' : 'Criar Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewHtml && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 w-full max-w-2xl shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Preview do Template</h3>
              <button onClick={() => setPreviewHtml(null)} className="text-gray-500 hover:text-gray-300 transition-colors">✕</button>
            </div>
            <div className="flex-1 overflow-auto border border-[#30363d] rounded-lg bg-white p-4">
              <iframe srcDoc={previewHtml} className="w-full h-96 border-0" title="preview" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
