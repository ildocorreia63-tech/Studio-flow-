import React, { useState, useEffect } from 'react';
import { Sparkles, PlusCircle, Globe, LogOut, Bell, Check, ArrowRight, Building, Sun, Moon } from 'lucide-react';
import { ActiveTab, Business, UserProfile, CrmNotification } from '../types';
import { DB } from '../services/db';

interface HeaderProps {
  currentBusiness: Business;
  currentUser: UserProfile;
  activeTab: ActiveTab;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onOpenNewAppointment: () => void;
  onOpenPublicBooking: () => void;
  onNavigateToTab?: (tab: ActiveTab) => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentBusiness,
  currentUser,
  activeTab,
  theme = 'light',
  onToggleTheme,
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
    <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-purple-100/80 dark:border-slate-800/80 px-3 sm:px-4 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between shadow-xs transition-colors">
      {/* Title / Mobile Brand */}
      <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 pr-1">
        {/* Mobile Logo & Name */}
        <div className="lg:hidden flex items-center space-x-2 min-w-0">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-black text-white flex items-center justify-center overflow-hidden border-2 border-purple-500/70 p-0.5 sm:p-1 shadow-sm shrink-0">
            <img
              src={currentBusiness?.logo_url || '/studioflow-logo.png'}
              alt={currentBusiness?.name || 'StudioFlow'}
              className="max-w-full max-h-full object-cover rounded-lg"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-black text-sm sm:text-lg text-gray-900 dark:text-white tracking-tight leading-tight truncate max-w-[110px] xs:max-w-[150px] sm:max-w-xs">
              {currentBusiness?.name || 'StudioFlow'}
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider truncate">
              {getTabTitle(activeTab)}
            </span>
          </div>
        </div>

        {/* Desktop Logo & Page Title Header */}
        <div className="hidden lg:flex items-center space-x-3.5">
          {currentBusiness?.logo_url && (
            <div className="h-12 w-12 rounded-xl bg-slate-900 border-2 border-purple-300/90 dark:border-purple-500/50 shadow-sm shrink-0 flex items-center justify-center overflow-hidden p-1">
              <img
                src={currentBusiness.logo_url}
                alt={currentBusiness.name}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}
          <div className="flex flex-col">
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-snug">{getTabTitle(activeTab)}</h1>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100/80 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/50">
                <Building className="w-3 h-3 mr-1 text-purple-700 dark:text-purple-400" />
                {currentBusiness?.name || 'StudioFlow'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & User Profile */}
      <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
        {/* Theme Toggle Button */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className="p-1.5 sm:p-2 rounded-xl border border-gray-200/80 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-800/80 text-gray-700 dark:text-amber-300 hover:bg-purple-50 dark:hover:bg-slate-700 hover:text-purple-700 transition flex items-center justify-center shadow-2xs"
            title={theme === 'dark' ? 'Mudar para Tema Claro (Light Mode)' : 'Mudar para Tema Escuro (Dark Mode)'}
            aria-label="Alternar tema claro/escuro"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-300" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 dark:text-slate-200 animate-in spin-in-180 duration-300" />
            )}
          </button>
        )}

        {/* Public Booking Link Button */}
        <button
          onClick={onOpenPublicBooking}
          className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-900 dark:text-purple-200 rounded-xl border border-purple-200/80 dark:border-purple-800/50 text-xs font-semibold transition"
          title="Ver página de agendamento online do cliente"
        >
          <Globe className="w-4 h-4 text-purple-700 dark:text-purple-300" />
          <span>Link Online</span>
        </button>

        {/* CRM Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-1.5 sm:p-2 text-gray-600 dark:text-slate-300 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-slate-800 rounded-xl transition border border-gray-200/80 dark:border-slate-700"
            title="Notificações Internas CRM"
          >
            <Bell className="w-4 h-4 text-gray-700 dark:text-slate-200" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Popover Dropdown */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-purple-100 dark:border-slate-800 p-4 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3 mb-3">
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                  <span className="font-extrabold text-sm text-gray-900 dark:text-white">Notificações CRM</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 text-[10px] font-bold rounded-full">
                      {unreadCount} novas
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-[11px] text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 font-semibold flex items-center space-x-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>Lidas</span>
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {notifications.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-slate-400 text-center py-6">Nenhuma notificação no momento.</p>
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
                          ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-gray-600 dark:text-slate-400'
                          : 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60 text-gray-900 dark:text-slate-100 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs text-purple-950 dark:text-purple-200 truncate">{n.title}</span>
                        {!n.read && (
                          <button
                            onClick={(e) => handleMarkAsRead(n.id, e)}
                            className="text-[10px] bg-purple-200 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 hover:bg-purple-300 font-bold px-1.5 py-0.5 rounded transition shrink-0"
                          >
                            Lida
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-700 dark:text-slate-300 mt-1 line-clamp-2">{n.message}</p>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1.5 block font-medium">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {onNavigateToTab && (
                <div className="border-t border-gray-100 dark:border-slate-800 mt-3 pt-2 text-center">
                  <button
                    onClick={() => {
                      setIsNotifOpen(false);
                      onNavigateToTab('clientes');
                    }}
                    className="text-xs font-bold text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 inline-flex items-center space-x-1 py-1"
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
          className="bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white font-semibold px-2.5 sm:px-3.5 py-1.5 rounded-xl shadow-xs text-xs sm:text-sm flex items-center space-x-1 sm:space-x-1.5 transition active:scale-98 shrink-0"
        >
          <PlusCircle className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">+ NOVO AGENDAMENTO</span>
          <span className="sm:hidden text-xs">Agendar</span>
        </button>

        {/* Profile / Logout Section */}
        <div className="flex items-center pl-1.5 sm:pl-2 border-l border-gray-200 dark:border-slate-800 space-x-1.5 sm:space-x-2 shrink-0">
          <div
            className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 font-bold text-xs flex items-center justify-center border border-purple-200 dark:border-purple-800 shrink-0"
            title={`${currentUser?.name || 'Usuário'} (${currentUser?.role || 'PROFESSIONAL'})`}
          >
            {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
          </div>

          <div className="hidden md:block text-left max-w-[140px]">
            <p className="text-xs font-bold text-gray-800 dark:text-slate-100 leading-tight truncate">{currentUser?.name || 'Usuário'}</p>
            <p className="text-[10px] text-purple-700 dark:text-purple-400 font-semibold uppercase truncate">{currentUser?.role || 'PROFESSIONAL'}</p>
          </div>

          {/* Explicit, high-contrast Sair / Logout Button */}
          <button
            onClick={onLogout}
            className="p-1.5 sm:px-2.5 sm:py-1 text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 active:bg-rose-200 border border-rose-200/80 dark:border-rose-900/50 rounded-xl transition flex items-center space-x-1 shrink-0 shadow-2xs"
            title="Sair da conta / Desconectar"
            aria-label="Sair da conta"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="hidden lg:inline text-xs font-bold">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
};
