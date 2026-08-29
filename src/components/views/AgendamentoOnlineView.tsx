import React, { useState, useEffect, useMemo } from 'react';
import {
  Share2,
  Copy,
  Download,
  ExternalLink,
  Check,
  QrCode as QrCodeIcon,
  ShieldCheck,
  MessageSquare,
  Send,
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
  AlertCircle,
  Filter,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Business, Appointment } from '../../types';
import { getPublicBookingUrl } from '../../utils/url';
import { DB } from '../../services/db';
import { buildWhatsAppLink } from '../../utils/whatsapp';

interface AgendamentoOnlineViewProps {
  business: Business;
  onOpenPublicBooking: () => void;
}

export const AgendamentoOnlineView: React.FC<AgendamentoOnlineViewProps> = ({
  business,
  onOpenPublicBooking,
}) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');

  // Appointments & WhatsApp Dispatch state
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingApts, setLoadingApts] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<'today' | 'tomorrow' | 'week' | 'all'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<'reminder' | 'confirmation' | 'link' | 'custom'>('reminder');
  const [customMessage, setCustomMessage] = useState('');
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().slice(0, 10);

  const nextWeekObj = new Date();
  nextWeekObj.setDate(nextWeekObj.getDate() + 7);
  const nextWeekStr = nextWeekObj.toISOString().slice(0, 10);

  useEffect(() => {
    const url = getPublicBookingUrl(business.slug);
    setBookingUrl(url);
    QRCode.toDataURL(url, { width: 300, margin: 2 })
      .then((qrUrl) => setQrDataUrl(qrUrl))
      .catch((err) => console.error('Erro ao gerar QR Code:', err));
  }, [business.slug]);

  const loadAppointments = async () => {
    setLoadingApts(true);
    try {
      const apts = await DB.getAppointmentsAsync(business.id);
      // Sort chronologically by date and start_time
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadQr = () => {
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qrcode_agendamento_${business.slug}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      // Date filter
      if (dateFilter === 'today' && apt.date !== todayStr) return false;
      if (dateFilter === 'tomorrow' && apt.date !== tomorrowStr) return false;
      if (dateFilter === 'week' && (apt.date < todayStr || apt.date > nextWeekStr)) return false;

      // Search filter
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

  // Toggle selection
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

  // Build formatted text for appointment
  const generateMessageText = (apt: Appointment): string => {
    const clientName = apt.client_name || 'Cliente';
    const hora = apt.start_time || 'Horário agendado';
    const servico = apt.service_name || 'Serviço';
    const profissional = apt.professional_name || 'Nosso profissional';
    const formattedDate = apt.date ? apt.date.split('-').reverse().join('/') : 'sua data';

    if (selectedTemplate === 'reminder') {
      return `Olá *${clientName}*, tudo bem? 💈\n\nPassando para confirmar seu horário agendado para hoje às *${hora}* na *${business.name}* com o profissional *${profissional}* (${servico}).\n\nEstamos te aguardando! Caso precise reagendar ou tenha alguma dúvida, responda a esta mensagem.`;
    }

    if (selectedTemplate === 'confirmation') {
      return `Olá *${clientName}*! Seu agendamento na *${business.name}* está confirmado com sucesso! ✅\n\n📅 *Data:* ${formattedDate}\n⏰ *Horário:* ${hora}\n✂️ *Serviço:* ${servico}\n👤 *Profissional:* ${profissional}\n\n🔗 *Link de Agendamento Online:* ${bookingUrl}\n\nAté logo!`;
    }

    if (selectedTemplate === 'link') {
      return `Olá *${clientName}*! 💈\n\nAgora você pode agendar seus próximos horários na *${business.name}* com facilidade e rapidez pelo nosso link oficial 24h:\n\n👉 ${bookingUrl}\n\nEscolha o melhor dia, horário e profissional sem precisar esperar!`;
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

  // Send single WhatsApp
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

  // Copy single message
  const handleCopyMessage = (apt: Appointment) => {
    const message = generateMessageText(apt);
    navigator.clipboard.writeText(message);
    setCopiedMsgId(apt.id);
    setTimeout(() => setCopiedMsgId(null), 3000);
  };

  // Batch send for selected
  const handleSendBatch = () => {
    const selectedApts = appointments.filter((a) => selectedIds.includes(a.id));
    if (selectedApts.length === 0) return;

    // Open first one and guide the user
    const firstApt = selectedApts[0];
    handleSendWhatsApp(firstApt);

    if (selectedApts.length > 1) {
      alert(
        `Abrindo o WhatsApp para ${firstApt.client_name} (1 de ${selectedApts.length}).\n\nApós enviar, você pode clicar nos próximos clientes selecionados na lista para abrir com 1 clique!`
      );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Banner de Confirmação para o Proprietário */}
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-3xl flex items-start gap-3.5 shadow-xs">
        <div className="p-2 bg-emerald-500 text-white rounded-2xl shrink-0 mt-0.5">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-emerald-950">Agendamento Online Ativo e Protegido</h3>
          <p className="text-xs text-emerald-800 mt-0.5">
            Sua página pública de agendamentos está no ar e protegida contra conflitos de horários e inserções não autorizadas. Seus clientes podem agendar 24 horas por dia diretamente no seu link exclusivo.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs">
        <h2 className="text-xl font-black text-gray-900">Agendamento Online 24/7</h2>
        <p className="text-xs text-gray-500">Seu link exclusivo e QR Code para clientes agendarem sem baixar app</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Link Box */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-base text-gray-900">Link Personalizado do Estabelecimento</h3>

          <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100 flex items-center justify-between text-xs">
            <span className="font-mono text-purple-950 font-bold truncate pr-2">{bookingUrl}</span>
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs shrink-0 flex items-center gap-1 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>

          <div className="pt-2">
            <button
              onClick={onOpenPublicBooking}
              className="w-full py-3 bg-purple-950 hover:bg-purple-900 text-white font-bold rounded-2xl shadow-md text-xs flex items-center justify-center space-x-2 transition cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>TESTAR PÁGINA PÚBLICA DE AGENDAMENTO</span>
            </button>
          </div>
        </div>

        {/* QR Code Box */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs text-center space-y-4">
          <h3 className="font-bold text-base text-gray-900">QR Code para Balcão ou Cartões</h3>

          {qrDataUrl && (
            <div className="bg-purple-50 p-4 rounded-3xl border border-purple-100 inline-block shadow-inner">
              <img src={qrDataUrl} alt="QR Code Agendamento" className="w-48 h-48 mx-auto rounded-xl" />
            </div>
          )}

          <div>
            <button
              onClick={handleDownloadQr}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition inline-flex items-center space-x-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>BAIXAR QR CODE (PNG)</span>
            </button>
          </div>
        </div>
      </div>

      {/* SEÇÃO ABAIXO DA IMAGEM: CLIENTES AGENDADOS COM HORÁRIOS & DISPARO WHATSAPP COM 1 CLIQUE */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
        {/* Header da Seção */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-300">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black tracking-tight text-white">
                  Clientes Agendados & Disparo WhatsApp
                </h3>
              </div>
              <p className="text-xs text-purple-200/80">
                Selecione os clientes com horários marcados e envie mensagens personalizadas de confirmação e lembrete com apenas 1 clique.
              </p>
            </div>

            <button
              onClick={loadAppointments}
              className="self-start md:self-auto px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white flex items-center space-x-1.5 transition cursor-pointer"
              title="Atualizar lista de agendamentos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingApts ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {/* Painel de Configuração da Mensagem */}
        <div className="p-6 bg-slate-50 border-b border-gray-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Escolha o Modelo da Mensagem a ser enviada:</span>
            </label>

            {/* Template Selector Pills */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedTemplate('reminder')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedTemplate === 'reminder'
                    ? 'bg-purple-700 text-white shadow-sm'
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
                    ? 'bg-purple-700 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                ✅ Confirmação + Link
              </button>

              <button
                type="button"
                onClick={() => setSelectedTemplate('link')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedTemplate === 'link'
                    ? 'bg-purple-700 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                🔗 Divulgação do Link
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
                    ? 'bg-purple-700 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                ✏️ Personalizado
              </button>
            </div>
          </div>

          {/* Message Preview / Custom input */}
          {selectedTemplate === 'custom' ? (
            <div className="space-y-1.5">
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Digite a mensagem... Tags disponíveis: {cliente}, {horario}, {data}, {servico}, {profissional}, {barbearia}, {link}"
                rows={3}
                className="w-full p-3 bg-white border border-purple-200 rounded-2xl text-xs text-gray-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <p className="text-[11px] text-gray-500">
                Variáveis que se completam sozinhas: <span className="font-mono text-purple-700 font-bold">{'{cliente}'}</span>, <span className="font-mono text-purple-700 font-bold">{'{horario}'}</span>, <span className="font-mono text-purple-700 font-bold">{'{data}'}</span>, <span className="font-mono text-purple-700 font-bold">{'{servico}'}</span>, <span className="font-mono text-purple-700 font-bold">{'{profissional}'}</span>, <span className="font-mono text-purple-700 font-bold">{'{link}'}</span>
              </p>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs text-emerald-950 space-y-1">
              <span className="font-bold text-emerald-900 block text-[11px] uppercase tracking-wider">
                Visualização do Texto Formatado (Substitui com os dados reais de cada cliente):
              </span>
              <p className="italic text-gray-700 whitespace-pre-line leading-relaxed">
                {selectedTemplate === 'reminder' &&
                  `"Olá *{Nome do Cliente}*, tudo bem? 💈\nPassando para confirmar seu horário hoje às *{Horário}* na *${business.name}* com o profissional *{Profissional}* ({Serviço}).\nEstamos te aguardando!"`}
                {selectedTemplate === 'confirmation' &&
                  `"Olá *{Nome do Cliente}*! Seu agendamento na *${business.name}* está confirmado com sucesso! ✅\n📅 Data: {Data} | ⏰ Horário: {Horário} | ✂️ Serviço: {Serviço}\n🔗 Link: ${bookingUrl}"`}
                {selectedTemplate === 'link' &&
                  `"Olá *{Nome do Cliente}*! 💈\nAgora você pode agendar seus horários na *${business.name}* direto pelo nosso link oficial 24h: ${bookingUrl}"`}
              </p>
            </div>
          )}
        </div>

        {/* Filtros de Data e Busca */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
          {/* Quick Date Filters */}
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-xs font-bold text-gray-500 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Período:</span>
            </span>

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

          {/* Search Field */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar cliente, serviço..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Barra de Ações em Massa (Quando houver selecionados) */}
        {selectedIds.length > 0 && (
          <div className="p-3.5 bg-purple-50 border-b border-purple-200 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center space-x-2 text-purple-900 font-bold text-xs">
              <CheckSquare className="w-4 h-4 text-purple-700" />
              <span>
                {selectedIds.length} {selectedIds.length === 1 ? 'cliente selecionado' : 'clientes selecionados'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-purple-200 text-purple-900 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Limpar Seleção
              </button>

              <button
                type="button"
                onClick={handleSendBatch}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar WhatsApp para os Marcados</span>
              </button>
            </div>
          </div>
        )}

        {/* Tabela / Lista de Agendamentos */}
        <div className="overflow-x-auto">
          {loadingApts ? (
            <div className="py-12 text-center text-gray-500 text-xs space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-600" />
              <p>Carregando agendamentos...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="py-12 text-center text-gray-500 space-y-2">
              <Calendar className="w-10 h-10 mx-auto text-gray-300" />
              <p className="text-sm font-bold text-gray-700">Nenhum agendamento encontrado para este filtro.</p>
              <p className="text-xs text-gray-400">
                Alterne o período acima ou verifique os agendamentos na sua Agenda.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200/80 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-gray-600 hover:text-purple-700 transition cursor-pointer"
                      title={selectedIds.length === filteredAppointments.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                    >
                      {selectedIds.length === filteredAppointments.length && filteredAppointments.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-purple-700" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4">Horário & Data</th>
                  <th className="py-3 px-4">Cliente / WhatsApp</th>
                  <th className="py-3 px-4">Serviço & Profissional</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ação Rápida WhatsApp</th>
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
                      className={`hover:bg-purple-50/40 transition ${
                        isSelected ? 'bg-purple-50/70' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelect(apt.id)}
                          className="text-gray-500 hover:text-purple-700 transition cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-purple-700" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-300" />
                          )}
                        </button>
                      </td>

                      {/* Horário & Data em Destaque */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="px-2.5 py-1 bg-purple-100 text-purple-950 font-black rounded-lg text-xs tracking-tight">
                            ⏰ {apt.start_time || '00:00'}
                          </span>
                          <span className="text-[11px] text-gray-500 font-medium">
                            {apt.date === todayStr ? 'Hoje' : formattedDate}
                          </span>
                        </div>
                      </td>

                      {/* Cliente / WhatsApp */}
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

                      {/* Serviço & Profissional */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-800 text-xs flex items-center space-x-1.5">
                          <Scissors className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span>{apt.service_name || 'Serviço'}</span>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          Profissional: <span className="font-semibold text-gray-700">{apt.professional_name || '-'}</span>
                        </div>
                      </td>

                      {/* Status */}
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

                      {/* Botão de Envio 1 Clique */}
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

        {/* Rodapé informativo */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-2">
          <span>
            Exibindo <strong>{filteredAppointments.length}</strong> agendamentos para o período selecionado.
          </span>
          <span className="text-[11px] text-gray-400">
            Clique no botão verde de qualquer cliente para abrir a conversa no WhatsApp com a mensagem formatada.
          </span>
        </div>
      </div>
    </div>
  );
};

