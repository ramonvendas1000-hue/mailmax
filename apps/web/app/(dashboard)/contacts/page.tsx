'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Users, Plus, Search, Download, Upload, Trash2, X, FileSpreadsheet, CheckCircle } from 'lucide-react';

const INPUT = "w-full bg-[#0d1117] border border-[#30363d] text-gray-100 placeholder:text-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-green-500/15 text-green-400',
  UNSUBSCRIBED: 'bg-gray-500/15 text-gray-400',
  BOUNCED: 'bg-red-500/15 text-red-400',
  SPAM_COMPLAINT: 'bg-orange-500/15 text-orange-400',
  SUPPRESSED: 'bg-red-500/15 text-red-400',
};

export default function ContactsPage() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [form, setForm] = useState({ email: '', name: '', phone: '', tags: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', page, search],
    queryFn: () => api.get('/contacts', { params: { page, limit: 50, search: search || undefined } }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => api.post('/contacts', body),
    onSuccess: () => {
      toast.success('Contato criado!');
      qc.invalidateQueries({ queryKey: ['contacts'] });
      setShowCreate(false);
      setForm({ email: '', name: '', phone: '', tags: '' });
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Erro ao criar contato'),
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/contacts/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data;
    },
    onSuccess: (result) => {
      setImportResult(result);
      qc.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Erro ao importar arquivo'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/contacts/${id}`),
    onSuccess: () => { toast.success('Contato removido'); qc.invalidateQueries({ queryKey: ['contacts'] }); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ ...form, tags: form.tags ? form.tags.split(',').map((t) => t.trim()) : [] });
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/contacts/export', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = 'contacts.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao exportar');
    }
  };

  const handleDownloadTemplate = () => {
    const csv = 'email,name,phone\nexemplo@email.com,João Silva,11999999999\noutro@email.com,Maria Costa,\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'modelo_contatos.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setImportFile(file); setImportResult(null); }
  };

  const handleImport = () => {
    if (!importFile) return;
    importMutation.mutate(importFile);
  };

  const closeImport = () => {
    setShowImport(false);
    setImportFile(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" /> Contatos
          </h1>
          <p className="text-gray-500 text-sm">Total: {data?.meta?.total ?? 0} contatos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 border border-[#30363d] text-gray-400 rounded-lg text-sm hover:bg-[#262c36] hover:text-gray-100 transition-colors">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-3 py-2 border border-[#30363d] text-gray-400 rounded-lg text-sm hover:bg-[#262c36] hover:text-gray-100 transition-colors">
            <Upload className="w-4 h-4" /> Importar
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 transition-colors">
            <Plus className="w-4 h-4" /> Novo Contato
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput)}
            placeholder="Buscar por nome ou email..."
            className="w-full pl-9 pr-3 py-2 bg-[#161b22] border border-[#30363d] text-gray-100 placeholder:text-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <button onClick={() => { setSearch(searchInput); setPage(1); }}
          className="px-4 py-2 bg-[#262c36] text-gray-300 rounded-lg text-sm hover:bg-[#30363d] transition-colors">Buscar</button>
      </div>

      <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#0d1117] border-b border-[#30363d]">
            <tr>
              {['Email', 'Nome', 'Status', 'Score', 'Tags', 'Ações'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#30363d]">
            {isLoading && <tr><td colSpan={6} className="text-center py-10 text-gray-600">Carregando...</td></tr>}
            {!isLoading && !data?.data?.length && (
              <tr><td colSpan={6} className="text-center py-16 text-gray-600">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Nenhum contato cadastrado</p>
                <p className="text-xs mt-1">Importe uma planilha ou adicione manualmente</p>
              </td></tr>
            )}
            {data?.data?.map((c: any) => (
              <tr key={c.id} className="hover:bg-[#262c36] transition-colors">
                <td className="px-4 py-3 font-medium text-gray-200">{c.email}</td>
                <td className="px-4 py-3 text-gray-400">{c.name || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[c.status] || 'bg-gray-500/15 text-gray-400'}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">{c.score}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {c.tags?.slice(0, 3).map((t: string) => (
                      <span key={t} className="px-1.5 py-0.5 bg-indigo-500/15 text-indigo-400 rounded text-xs">{t}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => { if (confirm('Remover contato?')) deleteMutation.mutate(c.id); }}
                    className="text-gray-600 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data?.meta && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Página {page} de {data.meta.totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 border border-[#30363d] rounded text-gray-400 disabled:opacity-30 hover:bg-[#262c36] transition-colors">Anterior</button>
            <button disabled={page >= data.meta.totalPages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 border border-[#30363d] rounded text-gray-400 disabled:opacity-30 hover:bg-[#262c36] transition-colors">Próxima</button>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4">Novo Contato</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email *" required type="email" className={INPUT} />
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome" className={INPUT} />
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Telefone" className={INPUT} />
              <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="Tags (separadas por vírgula)" className={INPUT} />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 border border-[#30363d] text-gray-400 rounded-lg text-sm hover:bg-[#262c36] transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 transition-colors">
                  {createMutation.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">Importar Contatos</h3>
              <button onClick={closeImport} className="text-gray-500 hover:text-gray-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!importResult ? (
              <div className="space-y-4">
                {/* Instructions */}
                <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4 text-sm text-gray-400 space-y-1">
                  <p className="font-medium text-gray-300 mb-2">Formatos aceitos: CSV ou Excel (.xlsx)</p>
                  <p>• A planilha deve ter uma coluna <span className="text-indigo-400 font-mono">email</span> (obrigatória)</p>
                  <p>• Colunas opcionais: <span className="font-mono text-gray-300">name</span>, <span className="font-mono text-gray-300">phone</span></p>
                  <p>• Primeira linha deve ser o cabeçalho</p>
                </div>

                <button onClick={handleDownloadTemplate}
                  className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-[#30363d] text-gray-500 rounded-lg text-sm hover:border-indigo-500/50 hover:text-indigo-400 transition-colors">
                  <Download className="w-4 h-4" /> Baixar modelo CSV
                </button>

                {/* File drop area */}
                <label className="block cursor-pointer">
                  <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${importFile ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-[#30363d] hover:border-[#404860]'}`}>
                    {importFile ? (
                      <div className="space-y-2">
                        <FileSpreadsheet className="w-10 h-10 mx-auto text-indigo-400" />
                        <p className="text-sm font-medium text-gray-200">{importFile.name}</p>
                        <p className="text-xs text-gray-500">{(importFile.size / 1024).toFixed(1)} KB</p>
                        <p className="text-xs text-indigo-400">Clique para trocar o arquivo</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-10 h-10 mx-auto text-gray-600" />
                        <p className="text-sm text-gray-400">Clique para selecionar o arquivo</p>
                        <p className="text-xs text-gray-600">CSV ou Excel (.xlsx)</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
                </label>

                <div className="flex gap-2 pt-1">
                  <button onClick={closeImport}
                    className="flex-1 py-2 border border-[#30363d] text-gray-400 rounded-lg text-sm hover:bg-[#262c36] transition-colors">Cancelar</button>
                  <button onClick={handleImport} disabled={!importFile || importMutation.isPending}
                    className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                    {importMutation.isPending ? 'Importando...' : 'Importar agora'}
                  </button>
                </div>
              </div>
            ) : (
              /* Import result */
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-green-400 shrink-0" />
                  <div>
                    <p className="font-semibold text-green-400">Importação concluída!</p>
                    <p className="text-xs text-gray-400 mt-0.5">{importResult.total} linhas processadas</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-400">{importResult.created}</p>
                    <p className="text-xs text-gray-500 mt-1">Criados</p>
                  </div>
                  <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-indigo-400">{importResult.updated}</p>
                    <p className="text-xs text-gray-500 mt-1">Atualizados</p>
                  </div>
                  <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-400">{importResult.skipped}</p>
                    <p className="text-xs text-gray-500 mt-1">Ignorados</p>
                  </div>
                </div>
                {importResult.errors?.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="text-xs font-semibold text-red-400 mb-1">Erros ({importResult.errors.length}):</p>
                    {importResult.errors.slice(0, 5).map((e: string, i: number) => (
                      <p key={i} className="text-xs text-gray-500">{e}</p>
                    ))}
                  </div>
                )}
                <button onClick={closeImport}
                  className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 transition-colors">Fechar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
