'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { List, Plus, Users, Trash2, Settings, X, Search, UserPlus } from 'lucide-react';

const INPUT = "w-full bg-[#0d1117] border border-[#30363d] text-gray-100 placeholder:text-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

export default function ListsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [managingList, setManagingList] = useState<any>(null);
  const [emailInput, setEmailInput] = useState('');
  const [contactSearch, setContactSearch] = useState('');

  // All lists
  const { data, isLoading } = useQuery({
    queryKey: ['lists'],
    queryFn: () => api.get('/lists').then((r) => r.data),
  });

  // Contacts inside the managing list
  const { data: listContacts, refetch: refetchListContacts } = useQuery({
    queryKey: ['list-contacts', managingList?.id],
    queryFn: () => api.get(`/lists/${managingList.id}/contacts?limit=200`).then((r) => r.data.data),
    enabled: !!managingList,
  });

  // All contacts for search
  const { data: allContacts } = useQuery({
    queryKey: ['contacts-all'],
    queryFn: () => api.get('/contacts?limit=500').then((r) => r.data.data),
    enabled: !!managingList,
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => api.post('/lists', body),
    onSuccess: () => {
      toast.success('Lista criada!');
      qc.invalidateQueries({ queryKey: ['lists'] });
      setShowCreate(false);
      setForm({ name: '', description: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/lists/${id}`),
    onSuccess: () => {
      toast.success('Lista removida');
      qc.invalidateQueries({ queryKey: ['lists'] });
    },
  });

  const addContactsMutation = useMutation({
    mutationFn: ({ listId, contactIds }: { listId: string; contactIds: string[] }) =>
      api.post(`/lists/${listId}/contacts`, { contactIds }),
    onSuccess: (_, vars) => {
      toast.success('Contatos adicionados!');
      qc.invalidateQueries({ queryKey: ['list-contacts', vars.listId] });
      qc.invalidateQueries({ queryKey: ['lists'] });
      setEmailInput('');
    },
  });

  const removeContactMutation = useMutation({
    mutationFn: ({ listId, contactId }: { listId: string; contactId: string }) =>
      api.delete(`/lists/${listId}/contacts/${contactId}`),
    onSuccess: (_, vars) => {
      toast.success('Contato removido');
      qc.invalidateQueries({ queryKey: ['list-contacts', vars.listId] });
      qc.invalidateQueries({ queryKey: ['lists'] });
    },
  });

  // Add contacts already in system by selecting from search
  const handleAddFromSearch = (contact: any) => {
    if (!managingList) return;
    const alreadyIn = listContacts?.some((c: any) => c.id === contact.id);
    if (alreadyIn) { toast.info('Contato já está na lista'); return; }
    addContactsMutation.mutate({ listId: managingList.id, contactIds: [contact.id] });
  };

  // Add by typing emails — create contact if not exists, then add
  const handleAddByEmail = async () => {
    if (!managingList || !emailInput.trim()) return;
    const emails = emailInput
      .split(/[\n,;]/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes('@'));

    if (emails.length === 0) { toast.error('Nenhum email válido encontrado'); return; }

    const contactIds: string[] = [];
    for (const email of emails) {
      // Check if already exists
      const existing = allContacts?.find((c: any) => c.email === email);
      if (existing) {
        contactIds.push(existing.id);
      } else {
        // Create the contact
        try {
          const res = await api.post('/contacts', { email, status: 'ACTIVE' });
          contactIds.push(res.data.data.id);
        } catch {
          toast.error(`Erro ao criar contato: ${email}`);
        }
      }
    }

    if (contactIds.length > 0) {
      addContactsMutation.mutate({ listId: managingList.id, contactIds });
    }
  };

  const filteredContacts = (allContacts ?? []).filter((c: any) => {
    if (!contactSearch) return true;
    const q = contactSearch.toLowerCase();
    return c.email?.toLowerCase().includes(q) || c.name?.toLowerCase().includes(q);
  }).slice(0, 10);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <List className="w-6 h-6 text-indigo-400" /> Listas
          </h1>
          <p className="text-gray-500 text-sm">Organize seus contatos em listas</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 transition-colors">
          <Plus className="w-4 h-4" /> Nova Lista
        </button>
      </div>

      {/* Lists grid */}
      <div className="grid grid-cols-3 gap-4">
        {isLoading && <div className="col-span-3 text-center py-10 text-gray-600">Carregando...</div>}
        {data?.data?.map((list: any) => (
          <div key={list.id} className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 hover:border-indigo-500/50 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-indigo-500/15 rounded-lg flex items-center justify-center">
                <List className="w-5 h-5 text-indigo-400" />
              </div>
              <button onClick={() => { if (confirm('Remover lista?')) deleteMutation.mutate(list.id); }}
                className="text-gray-600 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <h3 className="font-semibold text-gray-100">{list.name}</h3>
            {list.description && <p className="text-xs text-gray-500 mt-1">{list.description}</p>}
            <div className="flex items-center gap-1 mt-3 text-sm text-gray-500">
              <Users className="w-4 h-4" />
              <span>{list._count?.contacts ?? 0} contatos</span>
            </div>
            <button
              onClick={() => { setManagingList(list); setEmailInput(''); setContactSearch(''); }}
              className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-1.5 border border-[#30363d] text-gray-400 rounded-lg text-xs hover:border-indigo-500/50 hover:text-indigo-400 transition-colors">
              <Settings className="w-3 h-3" /> Gerenciar contatos
            </button>
          </div>
        ))}
        {!isLoading && !data?.data?.length && (
          <div className="col-span-3 text-center py-20 text-gray-600">Nenhuma lista criada</div>
        )}
      </div>

      {/* Create list modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4">Nova Lista</h3>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome da lista *" required className={INPUT} />
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descrição (opcional)" rows={3}
                className={`${INPUT} resize-none`} />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 border border-[#30363d] text-gray-400 rounded-lg text-sm hover:bg-[#262c36] transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 transition-colors">
                  {createMutation.isPending ? 'Criando...' : 'Criar Lista'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage list modal */}
      {managingList && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#30363d]">
              <div>
                <h3 className="text-lg font-semibold text-white">{managingList.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{listContacts?.length ?? 0} contatos na lista</p>
              </div>
              <button onClick={() => setManagingList(null)} className="text-gray-500 hover:text-gray-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Add by email */}
              <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-indigo-400" /> Adicionar emails à lista
                </p>
                <textarea
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder={"Cole os emails aqui, um por linha:\nexemplo@email.com\noutro@email.com"}
                  rows={4}
                  className={`${INPUT} resize-none`}
                />
                <button
                  onClick={handleAddByEmail}
                  disabled={addContactsMutation.isPending || !emailInput.trim()}
                  className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                  {addContactsMutation.isPending ? 'Adicionando...' : 'Adicionar à lista'}
                </button>
              </div>

              {/* Search existing contacts */}
              <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <Search className="w-4 h-4 text-indigo-400" /> Buscar contato existente
                </p>
                <input
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Nome ou email..."
                  className={INPUT}
                />
                {contactSearch && (
                  <div className="space-y-1">
                    {filteredContacts.length === 0 && (
                      <p className="text-xs text-gray-600 text-center py-2">Nenhum contato encontrado</p>
                    )}
                    {filteredContacts.map((c: any) => {
                      const inList = listContacts?.some((lc: any) => lc.id === c.id);
                      return (
                        <div key={c.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[#161b22]">
                          <div>
                            <p className="text-sm text-gray-200">{c.email}</p>
                            {c.name && <p className="text-xs text-gray-500">{c.name}</p>}
                          </div>
                          {inList ? (
                            <span className="text-xs text-green-400 px-2 py-0.5 bg-green-500/10 rounded-full">Na lista</span>
                          ) : (
                            <button onClick={() => handleAddFromSearch(c)}
                              className="text-xs px-2 py-0.5 bg-indigo-500/15 text-indigo-400 rounded-full hover:bg-indigo-500/25 transition-colors">
                              Adicionar
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Contacts currently in list */}
              <div>
                <p className="text-sm font-semibold text-gray-300 mb-3">Contatos na lista</p>
                {!listContacts?.length && (
                  <p className="text-sm text-gray-600 text-center py-6">Nenhum contato nesta lista ainda</p>
                )}
                <div className="space-y-1">
                  {listContacts?.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between py-2 px-3 bg-[#0d1117] rounded-lg border border-[#30363d]">
                      <div>
                        <p className="text-sm text-gray-200">{c.email}</p>
                        {c.name && <p className="text-xs text-gray-500">{c.name}</p>}
                      </div>
                      <button
                        onClick={() => removeContactMutation.mutate({ listId: managingList.id, contactId: c.id })}
                        className="text-gray-600 hover:text-red-400 transition-colors ml-3">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
