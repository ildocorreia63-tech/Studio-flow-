import React, { useState, useEffect } from 'react';
import {
  Calendar,
  DollarSign,
  Users,
  CheckCircle2,
  Award,
  Clock,
  Play,
  XCircle,
  MessageSquare,
  TrendingUp,
  RefreshCw,
  PlusCircle,
  Sparkles,
} from 'lucide-react';
import { DB } from '../../services/db';
import { WhatsAppService } from '../../utils/whatsapp';
import { Appointment, Business, AppointmentStatus } from '../../types';

interface DashboardViewProps {
  business: Business;
  onOpenNewAppointment: () => void;
  onNavigateToTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  business,
  onOpenNewAppointment,
  onNavigateToTab,
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [totalCommissions, setTotalCommissions] = useState(0);
  const [loyaltyActiveCards, setLoyaltyActiveCards] = useState(0);
  const [loyaltyRewardsAvailable, setLoyaltyRewardsAvailable] = useState(0);

  const todayStr = new Date().toISOString().slice(0, 10);

  const loadDashboardData = async () => {
    const apts = await DB.getAppointmentsAsync(business.id);
    const todayApts = apts.filter((a) => a.date === todayStr);
    setAppointments(todayApts);

    // Fetch today's sales and calculate revenue
    const todaySales = await DB.getSalesAsync(business.id, todayStr, todayStr);
    const validTodaySales = todaySales.filter((s) => s.status !== 'CANCELADO');
    const todaySalesRev = validTodaySales.reduce((sum, s) => sum + Number(s.final_amount || 0), 0);

    const aptRev = todayApts
      .filter((a) => a.status === 'CONCLUÍDO')
      .reduce((sum, a) => sum + a.price, 0);

    setTodayRevenue(Math.max(todaySalesRev, aptRev));

    // Completed today
    const comp = todayApts.filter((a) => a.status === 'CONCLUÍDO').length;
    setCompletedToday(comp);

    // Total Clients
    const clients = await DB.getClientsAsync(business.id);
    setTotalClients(clients.length);

    // Total Commissions pending
    const comms = await DB.getCommissionsAsync(business.id);
    const pendingComms = comms
      .filter((c) => c.status === 'PENDENTE')
      .reduce((sum, c) => sum + c.amount, 0);
    setTotalCommissions(pendingComms);

    // Loyalty KPIs
    const loyaltyCards = await DB.getLoyaltyCardsAsync(business.id);
    setLoyaltyActiveCards(loyaltyCards.filter((c) => c.current_stamps > 0).length);
    setLoyaltyRewardsAvailable(loyaltyCards.filter((c) => c.reward_available).length);
  };

  useEffect(() => {
    loadDashboardData();
  }, [business.id]);

  const countByStatus = (status: AppointmentStatus) => {
    return appointments.filter((a) => a.status === status).length;
  };

  const handleUpdateStatus = async (apt: Appointment, newStatus: AppointmentStatus) => {
    await DB.updateAppointmentStatusAsync(business.id, apt.id, newStatus);
    await loadDashboardData();
  };

  const getWhatsAppLink = (apt: Appointment) => {
    const [yyyy, mm, dd] = apt.date.split('-');
    const dateFormatted = `${dd}/${mm}/${yyyy}`;
    const priceFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(apt.price);

    return WhatsAppService.sendBookingConfirmation({
      clientName: apt.client_name,
      clientPhone: apt.client_whatsapp,
      serviceName: apt.service_name,
      professionalName: apt.professional_name,
      dateFormatted,
      time: apt.start_time,
      priceFormatted,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 bg-purple-800/60 px-3 py-1 rounded-full text-xs font-bold text-purple-200 mb-2 border border-purple-700/50">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Visão Geral do Estabelecimento</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{business.name}</h2>
          <p className="text-xs sm:text-sm text-purple-200 mt-1">
            Acompanhe agendamentos, caixa e desempenho em tempo real.
          </p>
        </div>

        <button
          onClick={onOpenNewAppointment}
          className="bg-white hover:bg-purple-50 text-purple-950 font-extrabold px-5 py-3 rounded-2xl shadow-lg flex items-center space-x-2 transition shrink-0 text-sm"
        >
          <PlusCircle className="w-5 h-5 text-purple-700" />
          <span>+ NOVO AGENDAMENTO</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Agendamentos Hoje</span>
            <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900">{appointments.length}</p>
          <p className="text-[11px] text-gray-500 font-medium">Hoje ({todayStr})</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Faturamento Hoje</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600">R$ {todayRevenue.toFixed(2)}</p>
          <p className="text-[11px] text-gray-500 font-medium">Concluídos e Pagos</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Clientes Cadastrados</span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900">{totalClients}</p>
          <p className="text-[11px] text-blue-600 font-semibold cursor-pointer hover:underline" onClick={() => onNavigateToTab('clientes')}>
            Gerenciar Clientes →
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Serviços Concluídos</span>
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900">{completedToday}</p>
          <p className="text-[11px] text-gray-500 font-medium">Atendimentos finalizados</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-1 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Comissões Pendentes</span>
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-600">R$ {totalCommissions.toFixed(2)}</p>
          <p className="text-[11px] text-amber-700 font-semibold cursor-pointer hover:underline" onClick={() => onNavigateToTab('comissoes')}>
            Pagar comissões →
          </p>
        </div>
      </div>

      {/* Loyalty Indicators Banner */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-4 rounded-2xl text-white shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Award className="w-5 h-5 text-amber-300 shrink-0" />
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-purple-200">Programa de Fidelidade</h4>
            <p className="text-xs text-purple-100 font-medium">Indicadores de Engajamento de Clientes</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs">
          <div>
            <span className="text-purple-200 block text-[10px] font-bold uppercase">Cartões em Progresso</span>
            <span className="text-lg font-black text-white">{loyaltyActiveCards} clientes com selos</span>
          </div>

          <div>
            <span className="text-amber-200 block text-[10px] font-bold uppercase">Prêmios Liberados</span>
            <span className="text-lg font-black text-amber-300 flex items-center gap-1">
              🎁 {loyaltyRewardsAvailable} prontos p/ resgate
            </span>
          </div>

          <button
            onClick={() => onNavigateToTab('fidelidade')}
            className="px-3 py-1.5 bg-white text-purple-950 hover:bg-purple-50 font-bold rounded-xl text-xs transition shadow-xs"
          >
            Ver Programa →
          </button>
        </div>
      </div>
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-wrap gap-3 items-center justify-around text-xs font-semibold">
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-sky-50 text-sky-800 rounded-xl border border-sky-100">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
          <span>Agendados: <strong>{countByStatus('AGENDADO')}</strong></span>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 text-blue-800 rounded-xl border border-blue-100">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
          <span>Confirmados: <strong>{countByStatus('CONFIRMADO')}</strong></span>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-purple-50 text-purple-800 rounded-xl border border-purple-100">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
          <span>Em Atendimento: <strong>{countByStatus('EM_ATENDIMENTO')}</strong></span>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
          <span>Concluídos: <strong>{countByStatus('CONCLUÍDO')}</strong></span>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-rose-50 text-rose-800 rounded-xl border border-rose-100">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          <span>Cancelados: <strong>{countByStatus('CANCELADO')}</strong></span>
        </div>
      </div>

      {/* Upcoming Appointments List */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-gray-900">Agendamentos de Hoje</h3>
            <p className="text-xs text-gray-500">Ações imediatas para gerenciamento do fluxo</p>
          </div>
          <button
            onClick={() => onNavigateToTab('agenda')}
            className="text-xs font-bold text-purple-700 hover:text-purple-900 underline"
          >
            Ver Agenda Completa →
          </button>
        </div>

        {appointments.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-3">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="font-semibold text-sm">Nenhum agendamento para hoje ainda.</p>
            <button
              onClick={onOpenNewAppointment}
              className="px-4 py-2 bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md hover:bg-purple-800"
            >
              + Criar primeiro agendamento
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {appointments.map((apt) => (
              <div key={apt.id} className="p-4 sm:p-5 hover:bg-gray-50/80 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2.5 bg-purple-100 text-purple-900 rounded-2xl text-center shrink-0 min-w-[64px]">
                    <span className="block text-sm font-black">{apt.start_time}</span>
                    <span className="block text-[10px] text-purple-700 font-semibold">{apt.duration_minutes} min</span>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base">{apt.client_name}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        apt.status === 'CONCLUÍDO'
                          ? 'bg-emerald-100 text-emerald-800'
                          : apt.status === 'EM_ATENDIMENTO'
                          ? 'bg-purple-100 text-purple-800'
                          : apt.status === 'CONFIRMADO'
                          ? 'bg-blue-100 text-blue-800'
                          : apt.status === 'CANCELADO'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {apt.status}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 mt-0.5 font-medium">
                      ✂️ {apt.service_name} • 👤 {apt.professional_name}
                    </p>
                    <p className="text-xs font-bold text-purple-900 mt-1">
                      R$ {apt.price.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-0 border-gray-100">
                  {apt.status === 'AGENDADO' && (
                    <button
                      onClick={() => handleUpdateStatus(apt, 'CONFIRMADO')}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirmar</span>
                    </button>
                  )}

                  {(apt.status === 'AGENDADO' || apt.status === 'CONFIRMADO') && (
                    <button
                      onClick={() => handleUpdateStatus(apt, 'EM_ATENDIMENTO')}
                      className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold transition flex items-center gap-1"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Iniciar</span>
                    </button>
                  )}

                  {apt.status === 'EM_ATENDIMENTO' && (
                    <button
                      onClick={() => handleUpdateStatus(apt, 'CONCLUÍDO')}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Concluir e Pagar</span>
                    </button>
                  )}

                  {apt.status !== 'CANCELADO' && apt.status !== 'CONCLUÍDO' && (
                    <button
                      onClick={() => handleUpdateStatus(apt, 'CANCELADO')}
                      className="px-2 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition"
                      title="Cancelar"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}

                  <a
                    href={getWhatsAppLink(apt)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
                    title="Mandar Mensagem no WhatsApp"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
