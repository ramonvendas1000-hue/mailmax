'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Radio, Mail, MessageSquare, PhoneCall, CheckCircle, XCircle } from 'lucide-react';

export default function ChannelsPage() {
  const { data } = useQuery({
    queryKey: ['channels'],
    queryFn: () => api.get('/channels').then((r) => r.data.data),
  });

  const channelInfo = [
    { type: 'EMAIL', label: 'Email (Amazon SES)', icon: Mail, description: 'Canal primário de envio via Amazon SES' },
    { type: 'SMS', label: 'SMS (Twilio)', icon: MessageSquare, description: 'Envio de SMS via Twilio' },
    { type: 'WHATSAPP', label: 'WhatsApp', icon: PhoneCall, description: 'WhatsApp via Twilio ou Z-API' },
  ];

  const getChannel = (type: string) => data?.find((c: any) => c.type === type);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Radio className="w-6 h-6 text-indigo-400" /> Canais
        </h1>
        <p className="text-gray-500 text-sm">Configure seus canais de comunicação multi-canal</p>
      </div>

      <div className="grid gap-4">
        {channelInfo.map(({ type, label, icon: Icon, description }) => {
          const channel = getChannel(type);
          return (
            <div key={type} className="bg-[#161b22] rounded-xl border border-[#30363d] p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500/15 rounded-xl flex items-center justify-center">
                    <Icon className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-100">{label}</h3>
                    <p className="text-sm text-gray-500">{description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {type === 'EMAIL' ? (
                    <span className="flex items-center gap-1 text-sm text-green-400">
                      <CheckCircle className="w-4 h-4" /> Nativo
                    </span>
                  ) : channel?.isActive ? (
                    <span className="flex items-center gap-1 text-sm text-green-400">
                      <CheckCircle className="w-4 h-4" /> Configurado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <XCircle className="w-4 h-4" /> Não configurado
                    </span>
                  )}
                  {type !== 'EMAIL' && (
                    <button className="px-3 py-1.5 border border-indigo-500/40 text-indigo-400 rounded-lg text-sm hover:bg-indigo-500/10 transition-colors">
                      Configurar
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
