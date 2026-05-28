'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ShieldCheck, CheckCircle, XCircle, AlertTriangle, Globe } from 'lucide-react';

export default function DeliverabilityPage() {
  const [domain, setDomain] = useState('');
  const [checkingDomain, setCheckingDomain] = useState('');

  const { data: health } = useQuery({
    queryKey: ['deliverability', 'health'],
    queryFn: () => api.get('/deliverability/health').then((r) => r.data.data),
  });

  const { data: warmup } = useQuery({
    queryKey: ['deliverability', 'warmup'],
    queryFn: () => api.get('/deliverability/warmup').then((r) => r.data.data),
  });

  const { data: dnsCheck } = useQuery({
    queryKey: ['deliverability', 'dns', checkingDomain],
    queryFn: () => api.get(`/deliverability/dns/${checkingDomain}`).then((r) => r.data.data),
    enabled: !!checkingDomain,
  });

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'configured') return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (status === 'missing') return <XCircle className="w-4 h-4 text-red-400" />;
    return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-indigo-400" /> Entregabilidade
        </h1>
        <p className="text-gray-500 text-sm">Monitore a saúde e reputação do seu domínio de envio</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-5 col-span-1">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Score de Entregabilidade</h3>
          <div className={`text-5xl font-bold ${scoreColor(health?.score ?? 0)}`}>
            {health?.score ?? '—'}<span className="text-lg text-gray-500">/100</span>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Bounce rate (7d)</span>
              <span className="font-medium text-gray-300">{health?.bounceRate ?? '0'}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Spam rate (7d)</span>
              <span className="font-medium text-gray-300">{health?.spamRate ?? '0'}%</span>
            </div>
          </div>
        </div>

        <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-5 col-span-2">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Plano de Aquecimento de IP</h3>
          {warmup?.started ? (
            <>
              <p className="text-sm text-gray-400 mb-3">
                Semana atual: <strong className="text-gray-200">{warmup.currentWeek}</strong>
                {warmup.dailyLimit && ` · Limite diário: ${warmup.dailyLimit.toLocaleString()} emails`}
              </p>
              <div className="flex gap-2">
                {warmup.plan?.map((w: any) => (
                  <div key={w.week} className={`flex-1 rounded-lg p-3 text-center text-xs border ${
                    w.completed ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                    w.current ? 'bg-indigo-500/15 border-indigo-500/40 ring-1 ring-indigo-500/40 text-indigo-300' :
                    'bg-[#0d1117] border-[#30363d] text-gray-500'
                  }`}>
                    <div className="font-semibold">S{w.week}</div>
                    <div className="opacity-70">{(w.limit / 1000).toFixed(1)}k</div>
                    {w.completed && <div className="mt-1">✓</div>}
                    {w.current && <div className="mt-1">▶</div>}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">Warmup não iniciado</p>
          )}
        </div>
      </div>

      {health?.alerts?.length > 0 && (
        <div className="space-y-2">
          {health.alerts.map((alert: any, i: number) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-lg text-sm ${
              alert.type === 'danger' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
            }`}>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {alert.message}
            </div>
          ))}
        </div>
      )}

      <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-5">
        <h3 className="font-semibold text-gray-200 mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4 text-indigo-400" /> Verificar Configuração DNS
        </h3>
        <div className="flex gap-3 mb-4">
          <input value={domain} onChange={(e) => setDomain(e.target.value)}
            placeholder="dominio.com.br"
            className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
          <button onClick={() => setCheckingDomain(domain)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
            Verificar
          </button>
        </div>

        {dnsCheck && (
          <div className="space-y-3">
            {[
              { key: 'spf', label: 'SPF', desc: 'Autoriza servidores de envio' },
              { key: 'dkim', label: 'DKIM', desc: 'Assinatura criptográfica' },
              { key: 'dmarc', label: 'DMARC', desc: 'Política de autenticação' },
            ].map(({ key, label, desc }) => {
              const status = dnsCheck[key];
              return (
                <div key={key} className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg border border-[#30363d]">
                  <div className="flex items-center gap-3">
                    <StatusIcon status={status?.status} />
                    <div>
                      <span className="font-medium text-sm text-gray-200">{label}</span>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    status?.status === 'configured' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                  }`}>
                    {status?.status === 'configured' ? 'Configurado' : 'Ausente'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
