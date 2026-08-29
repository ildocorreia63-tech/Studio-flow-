import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  Check,
  Copy,
  Calendar,
  Clock,
  User,
  CheckSquare,
  Square,
  Search,
  Sparkles,
  Phone,
  RefreshCw,
  Scissors,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { WhatsAppService, buildWhatsAppLink } from '../../utils/whatsapp';
import { Business, Appointment } from '../../types';
import { DB } from '../../services/db';
import { getPublicBookingUrl } from '../../utils/url';

interface WhatsAppViewProps {
  business: Business;
}

export const WhatsAppView: React.FC<WhatsAppViewProps> = ({ business }) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Appointments & WhatsApp Dispatch state
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingApts, setLoadingApts] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<'today' | 'tomorrow' | 'week' | 'all'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<'reminder' | 'confirmation' | 'thanks' | 'custom'>('reminder');
  const [customMessage, setCustomMessage] = useState('');
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const bookingUrl = getPublicBookingUrl(business.slug);
  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().slice(0, 10);

  const nextWeekObj = new Date();
  nextWeekObj.setDate(nextWeekObj.getDate() + 7);
  const nextWeekStr = nextWeekObj.toISOString().slice(0, 10);

  const templates = [
    {
      id: 'confirmation',
      title: 'Confirmação de Agendamento',
      text: `Olá! Seu agendamento na *${business.name}* foi confirmado. Dúvidas? Fale conosco! Link: ${bookingUrl}`,
    },
    {
      id: 'reminder',
      title: 'Lembrete de Horário',
      text: `Oi! Passando para lembrar do seu horário hoje na *${business.name}*. Estamos te esperando!`,
    },
    {
      id: 'thanks',
      title: 'Agradecimento Pós-Atendimento',
      text: `Obrigado por escolher a *${business.name}*! Esperamos que tenha gostado. Conte-nos sua experiência!`,
    },
  ];

  const loadAppointments = async () => {
    setLoadingApts(true);
    try {
      const apts = await DB.getAppointmentsAsync(business.id);
      const sorted = apts.sort((a, b) => {
        const dateDiff = a.date.localeCompare(b.date);
        if (dateDiff !== 0) return dateDiff;
        return a.start_time.localeCompare(b.start_time);
      });
      setAppointments(sorted);
    } catch (e) {
      console.error('Erro ao carregar agendamentos:', e);
    } finally {
      setLoadingApts(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [business.id]);

  const handleCopy = (txt: string, idx: number) => {
    navigator.clipboard.writeText(txt);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 3000);
  };

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      if (dateFilter === 'today' && apt.date !== todayStr) return false;
      if (dateFilter === 'tomorrow' && apt.date !== tomorrowStr) return false;
      if (dateFilter === 'week' && (apt.date < todayStr || apt.date > nextWeekStr)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesClient = apt.client_name?.toLowerCase().includes(q);
        const matchesPhone = apt.client_whatsapp?.includes(q);
        const matchesService = apt.service_name?.toLowerCase().includes(q);
        const matchesProf = apt.professional_name?.toLowerCase().includes(q);
        if (!matchesClient && !matchesPhone && !matchesService && !matchesProf) {
          return false;
        }
      }

      return true;
    });
  }, [appointments, dateFilter, todayStr, tomorrowStr, nextWeekStr, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredAppointments.length && filteredAppointments.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAppointments.map((a) => a.id));
    }
  };

  const generateMessageText = (apt: Appointment): string => {
    const clientName = apt.client_name || 'Cliente';
    const hora = apt.start_time || 'Horário agendado';
    const servico = apt.service_name || 'Serviço';
    const profissional = apt.professional_name || 'Nosso profissional';
    const formattedDate = apt.date ? apt.date.split('-').reverse().join('/') : 'sua data';

    if (selectedTemplate === 'reminder') {
      return `Olá *${clientName}*, tudo bem? 💈\n\nPassando para confirmar seu horário agendado para hoje às *${hora}* na *${business.name}* com o profissional *${profissional}* (${servico}).\n\nEstamos te aguardando!`;
    }

    if (selectedTemplate === 'confirmation') {
      return `Olá *${clientName}*! Seu agendamento na *${business.name}* está confirmado com sucesso! ✅\n\n📅 *Data:* ${formattedDate}\n⏰ *Horário:* ${hora}\n✂️ *Serviço:* ${servico}\n👤 *Profissional:* ${profissional}\n\n🔗 *Link de Agendamento:* ${bookingUrl}`;
    }

    if (selectedTemplate === 'thanks') {
      return `Olá *${clientName}*! 💈\n\nMuito obrigado pela visita hoje na *${business.name}* com *${profissional}*! Esperamos que tenha curtido o resultado.\n\nPara agendar sua próxima visita: ${bookingUrl}`;
    }

    if (selectedTemplate === 'custom' && customMessage) {
      return customMessage
        .replace(/{cliente}/gi, clientName)
        .replace(/{horario}/gi, hora)
        .replace(/{data}/gi, formattedDate)
        .replace(/{servico}/gi, servico)
        .replace(/{profissional}/gi, profissional)
        .replace(/{barbearia}/gi, business.name)
        .replace(/{link}/gi, bookingUrl);
    }

    return `Olá *${clientName}*! Lembramos do seu horário às *${hora}* na *${business.name}*. Estamos te aguardando!`;
  };

  const handleSendWhatsApp = (apt: Appointment) => {
    if (!apt.client_whatsapp) {
      alert('Este cliente não possui número de WhatsApp cadastrado.');
      return;
    }

    const message = generateMessageText(apt);
    const waUrl = buildWhatsAppLink(apt.client_whatsapp, message);
    window.open(waUrl, '_blank');

    setSentMap((prev) => ({ ...prev, [apt.id]: true }));
  };

  const handleCopyMessage = (apt: Appointment) => {
    const message = generateMessageText(apt);
    navigator.clipboard.writeText(message);
    setCopiedMsgId(apt.id);
    setTimeout(() => setCopiedMsgId(null), 3000);
  };

  const handleSendBatch = () => {
    const selectedApts = appointments.filter((a) => selectedIds.includes(a.id));
    if (selectedApts.length === 0) return;

    const firstApt = selectedApts[0];
    handleSendWhatsApp(firstApt);

    if (selectedApts.length > 1) {
      alert(
        `Abrindo o WhatsApp para ${firstApt.client_name} (1 de ${selectedApts.length}).\n\nApós enviar, você pode clicar nos próximos clientes marcados na lista!`
      );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs">
        <h2 className="text-xl font-black text-gray-900">Integração com WhatsApp</h2>
        <p className="text-xs text-gray-500">Modelos prontos e envio de notificações para clientes com um clique</p>
      </div>

      {/* Modelos de Mensagens */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {templates.map((tpl, idx) => (
          <div key={idx} className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs space-y-3 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-gray-900 text-sm mb-2">{tpl.title}</h4>
              <p className="text-xs text-gray-600 bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100 italic leading-relaxed">
                "{tpl.text}"
              </p>
            </div>

            <button
              onClick={() => handleCopy(tpl.text, idx)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1 transition cursor-pointer"
            >
              {copiedIdx === idx ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedIdx === idx ? 'Texto Copiado!' : 'Copiar Modelo'}</span>
            </button>
          </div>
        ))}
      </div>

      {/* CLIENTES AGENDADOS COM HORAS & DISPARO DE MENSAGENS COM 1 CLIQUE */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-white/10 rounded-xl text-emerald-300">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black tracking-tight text-white">
                Disparo Rápido para Clientes Agendados
              </h3>
            </div>
            <p className="text-xs text-emerald-200/80">
              Marque os clientes com horários agendados e envie a mensagem selecionada diretamente no WhatsApp com 1 clique.
            </p>
          </div>

          <button
            onClick={loadAppointments}
            className="self-start md:self-auto px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white flex items-center space-x-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingApts ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>

        {/* Painel do Modelo de Mensagem Ativo */}
        <div className="p-6 bg-slate-50 border-b border-gray-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Selecione o Modelo para os Clientes da Lista:</span>
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedTemplate('reminder')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedTemplate === 'reminder'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                ⏰ Lembrete de Horário
              </button>

              <button
                type="button"
                onClick={() => setSelectedTemplate('confirmation')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedTemplate === 'confirmation'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                ✅ Confirmação + Link
              </button>

              <button
                type="button"
                onClick={() => setSelectedTemplate('thanks')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedTemplate === 'thanks'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                🤝 Agradecimento
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedTemplate('custom');
                  if (!customMessage) {
                    setCustomMessage(
                      `Olá *{cliente}*! Passando para confirmar seu horário às *{horario}* na *{barbearia}* com *{profissional}* ({servico}). Link: {link}`
                    );
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedTemplate === 'custom'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                ✏️ Personalizado
              </button>
            </div>
          </div>

          {selectedTemplate === 'custom' ? (
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Tags disponíveis: {cliente}, {horario}, {data}, {servico}, {profissional}, {barbearia}, {link}"
              rows={3}
              className="w-full p-3 bg-white border border-emerald-200 rounded-2xl text-xs text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          ) : (
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-xs text-emerald-950">
              <span className="font-bold text-emerald-900 block text-[11px] uppercase tracking-wider mb-1">
                Texto Pronto com Variáveis Automáticas:
              </span>
              <p className="italic text-gray-700 leading-relaxed">
                {selectedTemplate === 'reminder' &&
                  `"Olá *{Nome do Cliente}*, tudo bem? 💈 Passando para confirmar seu horário hoje às *{Horário}* na *${business.name}* com o profissional *{Profissional}* ({Serviço}). Estamos te aguardando!"`}
                {selectedTemplate === 'confirmation' &&
                  `"Olá *{Nome do Cliente}*! Seu agendamento na *${business.name}* está confirmado! ✅ Data: {Data} | Horário: {Horário} | Serviço: {Serviço}"`}
                {selectedTemplate === 'thanks' &&
                  `"Olá *{Nome do Cliente}*! 💈 Muito obrigado pela visita hoje na *${business.name}* com {Profissional}! Esperamos que tenha gostado."`}
              </p>
            </div>
          )}
        </div>

        {/* Filtros de Data e Busca */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                dateFilter === 'today'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              📅 Hoje ({appointments.filter((a) => a.date === todayStr).length})
            </button>

            <button
              type="button"
              onClick={() => setDateFilter('tomorrow')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                dateFilter === 'tomorrow'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              📅 Amanhã ({appointments.filter((a) => a.date === tomorrowStr).length})
            </button>

            <button
              type="button"
              onClick={() => setDateFilter('week')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                dateFilter === 'week'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Próximos 7 Dias
            </button>

            <button
              type="button"
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                dateFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todos ({appointments.length})
            </button>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar cliente, telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Barra de Selecionados */}
        {selectedIds.length > 0 && (
          <div className="p-3.5 bg-emerald-50 border-b border-emerald-200 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center space-x-2 text-emerald-950 font-bold text-xs">
              <CheckSquare className="w-4 h-4 text-emerald-700" />
              <span>{selectedIds.length} selecionado(s)</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Limpar
              </button>

              <button
                type="button"
                onClick={handleSendBatch}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar para os Selecionados</span>
              </button>
            </div>
          </div>
        )}

        {/* Tabela de Clientes */}
        <div className="overflow-x-auto">
          {loadingApts ? (
            <div className="py-12 text-center text-gray-500 text-xs space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
              <p>Carregando agendamentos...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="py-12 text-center text-gray-500 space-y-2">
              <Calendar className="w-10 h-10 mx-auto text-gray-300" />
              <p className="text-sm font-bold text-gray-700">Nenhum agendamento encontrado.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200/80 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-gray-600 hover:text-emerald-700 transition cursor-pointer"
                    >
                      {selectedIds.length === filteredAppointments.length && filteredAppointments.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-emerald-700" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4">Horário & Data</th>
                  <th className="py-3 px-4">Cliente / WhatsApp</th>
                  <th className="py-3 px-4">Serviço & Profissional</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ação WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredAppointments.map((apt) => {
                  const isSelected = selectedIds.includes(apt.id);
                  const isSent = sentMap[apt.id];
                  const formattedDate = apt.date ? apt.date.split('-').reverse().join('/') : '-';

                  return (
                    <tr
                      key={apt.id}
                      className={`hover:bg-emerald-50/40 transition ${isSelected ? 'bg-emerald-50/70' : ''}`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelect(apt.id)}
                          className="text-gray-500 hover:text-emerald-700 transition cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-700" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-300" />
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-950 font-black rounded-lg text-xs tracking-tight">
                            ⏰ {apt.start_time || '00:00'}
                          </span>
                          <span className="text-[11px] text-gray-500 font-medium">
                            {apt.date === todayStr ? 'Hoje' : formattedDate}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900 text-xs flex items-center space-x-1.5">
                          <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{apt.client_name || 'Cliente Sem Nome'}</span>
                        </div>
                        <div className="text-[11px] text-emerald-700 font-mono flex items-center space-x-1 mt-0.5">
                          <Phone className="w-3 h-3 shrink-0" />
                          <span>{apt.client_whatsapp || 'Sem telefone'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-800 text-xs flex items-center space-x-1.5">
                          <Scissors className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{apt.service_name || 'Serviço'}</span>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          Profissional: <span className="font-semibold text-gray-700">{apt.professional_name || '-'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            apt.status === 'CONFIRMADO'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : apt.status === 'CONCLUÍDO'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : apt.status === 'CANCELADO'
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {apt.status || 'AGENDADO'}
                        </span>

                        {isSent && (
                          <span className="block text-[10px] text-emerald-600 font-bold mt-0.5 flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3 inline" /> Enviado
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(apt)}
                            className="p-2 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
                            title="Copiar mensagem personalizada deste cliente"
                          >
                            {copiedMsgId === apt.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(apt)}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center space-x-1.5 shadow-sm hover:shadow-md transition cursor-pointer"
                            title="Abrir WhatsApp e disparar mensagem com 1 clique"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Enviar WhatsApp (1 Clique)</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

