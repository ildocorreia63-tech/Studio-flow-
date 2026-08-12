import React, { useState, useEffect } from 'react';
import { Sparkles, PlusCircle, Globe, LogOut, Bell, Check, ArrowRight, Building } from 'lucide-react';
import { ActiveTab, Business, UserProfile, CrmNotification } from '../types';
import { DB } from '../services/db';

interface HeaderProps {
  currentBusiness: Business;
  currentUser: UserProfile;
  activeTab: ActiveTab;
  onOpenNewAppointment: () => void;
  onOpenPublicBooking: () => void;
  onNavigateToTab?: (tab: ActiveTab) => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentBusiness,
  currentUser,
  activeTab,
  onOpenNewAppointment,
  onOpenPublicBooking,
  onNavigateToTab,
  onLogout,
}) => {
  const [notifications, setNotifications] = useState<CrmNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const loadNotifications = async () => {
    if (!currentBusiness?.id) return;
    try {
      const data = await DB.getCrmNotificationsAsync(currentBusiness.id);
      setNotifications(data);
    } catch (err) {
      console.error('Error loading CRM notifications in Header:', err);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [currentBusiness?.id]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentBusiness?.id) return;
    await DB.markCrmNotificationAsReadAsync(currentBusiness.id, id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleMarkAllAsRead = async () => {
    if (!currentBusiness?.id) return;
    for (const notif of notifications.filter((n) => !n.read)) {
      await DB.markCrmNotificationAsReadAsync(currentBusiness.id, notif.id);
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const getTabTitle = (tab: ActiveTab) => {
    const titles: Record<ActiveTab, string> = {
      dashboard: 'Dashboard Visão Geral',
      agenda: 'Agenda de Atendimentos',
      clientes: 'Gestão de Clientes',
      profissionais: 'Equipe de Profissionais',
      servicos: 'Catálogo de Serviços',
      vendas: 'Ponto de Venda (PDV)',
      caixa: 'Controle de Caixa',
      financeiro: 'Fluxo Financeiro & DRE',
      comissoes: 'Cálculo de Comissões',
      fidelidade: 'Programa de Fidelidade Digital',
      relatorios: 'Relatórios & Métricas',
      galeria: 'Galeria de Fotos',
      anamnese: 'Ficha de Anamnese',
      agendamento_online: 'Agendamento Online & QR Code',
      whatsapp: 'WhatsApp & Central de Mensagens',
      marketing: 'Campanhas de Marketing',
      assinatura: 'Assinatura & Planos SaaS',
      configuracoes: 'Configurações do Estabelecimento',
    };
    return titles[tab] || 'StudioFlow';
  };

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-purple-100/80 px-4 lg:px-8 py-3.5 flex items-center justify-between shadow-xs">
      {/* Title / Mobile Brand */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Mobile Logo & Name */}
        <div className="lg:hidden flex items-center space-x-2.5">
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center overflow-hidden border-2 border-purple-500/70 p-1 shadow-sm shrink-0">
            {currentBusiness?.logo_url ? (
              <img src={currentBusiness.logo_url} alt={currentBusiness.name} className="max-w-full max-h-full object-contain" />
            ) : (
              <Sparkles className="w-6 h-6 text-purple-300" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-black text-base sm:text-lg text-gray-900 tracking-tight leading-tight truncate max-w-[150px] sm:max-w-xs">
              {currentBusiness?.name || 'StudioFlow'}
            </span>
            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
              {getTabTitle(activeTab)}
            </span>
          </div>
        </div>

        {/* Desktop Logo & Page Title Header */}
        <div className="hidden lg:flex items-center space-x-3.5">
          {currentBusiness?.logo_url && (
            <div className="h-12 w-12 rounded-xl bg-slate-900 border-2 border-purple-300/90 shadow-sm shrink-0 flex items-center justify-center overflow-hidden p-1">
              <img
                src={currentBusiness.logo_url}
                alt={currentBusiness.name}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}
          <div className="flex flex-col">
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight leading-snug">{getTabTitle(activeTab)}</h1>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100/80 text-purple-900 border border-purple-200/80">
                <Building className="w-3 h-3 mr-1 text-purple-700" />
                {currentBusiness?.name || 'StudioFlow'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & User Profile */}
      <div className="flex items-center space-x-2.5 sm:space-x-4">
        {/* Public Booking Link Button */}
        <button
          onClick={onOpenPublicBooking}
          className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-xl border border-purple-200/80 text-xs font-semibold transition"
          title="Ver página de agendamento online do cliente"
        >
          <Globe className="w-4 h-4 text-purple-700" />
          <span>Link Online</span>
        </button>

        {/* CRM Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 text-gray-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition border border-gray-200/80"
            title="Notificações Internas CRM"
          >
            <Bell className="w-4 h-4 text-gray-700" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Popover Dropdown */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-purple-100 p-4 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-purple-700" />
                  <span className="font-extrabold text-sm text-gray-900">Notificações CRM</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full">
                      {unreadCount} novas
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-[11px] text-purple-700 hover:text-purple-900 font-semibold flex items-center space-x-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>Lidas</span>
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {notifications.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-6">Nenhuma notificação no momento.</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        setIsNotifOpen(false);
                        if (onNavigateToTab) onNavigateToTab('clientes');
                      }}
                      className={`p-3 rounded-xl border transition cursor-pointer text-left ${
                        n.read
                          ? 'bg-slate-50/60 border-slate-100 text-gray-600'
                          : 'bg-purple-50/70 border-purple-200 text-gray-900 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs text-purple-950 truncate">{n.title}</span>
                        {!n.read && (
                          <button
                            onClick={(e) => handleMarkAsRead(n.id, e)}
                            className="text-[10px] bg-purple-200 text-purple-800 hover:bg-purple-300 font-bold px-1.5 py-0.5 rounded transition shrink-0"
                          >
                            Lida
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-700 mt-1 line-clamp-2">{n.message}</p>
                      <span className="text-[10px] text-gray-400 mt-1.5 block font-medium">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {onNavigateToTab && (
                <div className="border-t border-gray-100 mt-3 pt-2 text-center">
                  <button
                    onClick={() => {
                      setIsNotifOpen(false);
                      onNavigateToTab('clientes');
                    }}
                    className="text-xs font-bold text-purple-700 hover:text-purple-900 inline-flex items-center space-x-1 py-1"
                  >
                    <span>Ver Central de Oportunidades & Tarefas</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Primary New Appointment Action */}
        <button
          onClick={onOpenNewAppointment}
          className="bg-purple-700 hover:bg-purple-800 text-white font-semibold px-3.5 py-1.5 rounded-xl shadow-xs text-xs sm:text-sm flex items-center space-x-1.5 transition active:scale-98"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:inline">+ NOVO AGENDAMENTO</span>
          <span className="sm:hidden">+ Agendar</span>
        </button>

        {/* Profile / Logout */}
        <div className="flex items-center pl-2 border-l border-gray-200 space-x-2">
          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center border border-purple-200">
            {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-bold text-gray-800 leading-tight">{currentUser?.name || 'Usuário'}</p>
            <p className="text-[10px] text-purple-700 font-semibold uppercase">{currentUser?.role || 'PROFESSIONAL'}</p>
          </div>
          <button
            onClick={onLogout}
            className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
            title="Sair do sistema"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
