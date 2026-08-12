import React, { useState } from 'react';
import { MessageSquare, Send, Check, Copy } from 'lucide-react';
import { WhatsAppService } from '../../utils/whatsapp';
import { Business } from '../../types';

interface WhatsAppViewProps {
  business: Business;
}

export const WhatsAppView: React.FC<WhatsAppViewProps> = ({ business }) => {
  const [testPhone, setTestPhone] = useState('11999998888');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const templates = [
    {
      title: 'Confirmação de Agendamento',
      text: `Olá! Seu agendamento na *${business.name}* foi confirmado para amanhã. Dúvidas? Fale conosco!`,
    },
    {
      title: 'Lembrete de Horário (2 Horas Antes)',
      text: `Oi! Passando para lembrar do seu horário hoje na *${business.name}*. Estamos te esperando!`,
    },
    {
      title: 'Agradecimento Pós-Atendimento',
      text: `Obrigado por escolher a *${business.name}*! Esperamos que tenha gostado. Conte-nos sua experiência!`,
    },
  ];

  const handleCopy = (txt: string, idx: number) => {
    navigator.clipboard.writeText(txt);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs">
        <h2 className="text-xl font-black text-gray-900">Integração com WhatsApp</h2>
        <p className="text-xs text-gray-500">Modelos prontos e envio de notificações para clientes com um clique</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {templates.map((tpl, idx) => (
          <div key={idx} className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-gray-900 text-sm mb-2">{tpl.title}</h4>
              <p className="text-xs text-gray-600 bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100 italic">
                "{tpl.text}"
              </p>
            </div>

            <button
              onClick={() => handleCopy(tpl.text, idx)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1 transition"
            >
              {copiedIdx === idx ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedIdx === idx ? 'Texto Copiado!' : 'Copiar Modelo'}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
