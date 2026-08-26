import React, { useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  DollarSign,
  Menu,
  X,
  UserCheck,
  Scissors,
  ShoppingCart,
  PieChart,
  Award,
  FileText,
  Image,
  ClipboardList,
  Globe,
  MessageSquare,
  Megaphone,
  CreditCard,
  Settings,
  PlusCircle,
  Sparkles,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';
import { ActiveTab, Business, UserProfile, UserRole } from '../types';
import { isPlatformOwner } from '../utils/auth';

interface MobileNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  userRole: UserRole;
  currentUser?: UserProfile | null;
  currentBusiness?: Business | null;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onOpenNewAppointment: () => void;
  onLogout?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  currentUser,
  currentBusiness,
  theme = 'light',
  onToggleTheme,
  onOpenNewAppointment,
  onLogout,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isSaasOwner = isPlatformOwner(currentUser, currentBusiness);

  const mainTabs: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'caixa', label: 'Caixa', icon: DollarSign },
  ];

  const allItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }>; roles?: UserRole[] }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'profissionais', label: 'Profissionais', icon: UserCheck, roles: ['OWNER', 'ADMIN'] },
    { id: 'servicos', label: 'Serviços', icon: Scissors, roles: ['OWNER', 'ADMIN'] },
    { id: 'vendas', label: 'Vendas', icon: ShoppingCart },
    { id: 'caixa', label: 'Caixa', icon: DollarSign },
    { id: 'financeiro', label: 'Financeiro', icon: PieChart, roles: ['OWNER', 'ADMIN'] },
    { id: 'comissoes', label: 'Comissões', icon: DollarSign, roles: ['OWNER', 'ADMIN', 'PROFESSIONAL'] },
    { id: 'fidelidade', label: 'Fidelidade', icon: Award },
    { id: 'relatorios', label: 'Relatórios', icon: FileText, roles: ['OWNER', 'ADMIN'] },
    { id: 'galeria', label: 'Galeria', icon: Image },
    { id: 'anamnese', label: 'Anamnese', icon: ClipboardList },
    { id: 'agendamento_online', label: 'Agendamento Online', icon: Globe },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { id: 'marketing', label: 'Marketing', icon: Megaphone, roles: ['OWNER', 'ADMIN'] },
    { id: 'assinatura', label: isSaasOwner ? 'Assinatura SaaS' : 'Assinatura', icon: CreditCard, roles: ['OWNER', 'ADMIN'] },
    { id: 'configuracoes', label: 'Configurações', icon: Settings, roles: ['OWNER', 'ADMIN'] },
  ];

  const filteredItems = allItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole) || isSaasOwner;
  });

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex flex-col justify-end lg:hidden">
          <div className="bg-slate-900 rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 text-white shadow-2xl border-t border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-black text-white flex items-center justify-center overflow-hidden border-2 border-purple-500/70 p-0.5 shadow-md shrink-0">
                  <img
                    src={currentBusiness?.logo_url || '/studioflow-logo.png'}
                    alt={currentBusiness?.name || 'StudioFlow'}
                    className="max-w-full max-h-full object-cover rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-extrabold text-base text-white truncate max-w-[190px]">
                    {currentBusiness?.name || 'StudioFlow'}
                  </span>
                  <span className="text-[11px] font-semibold text-purple-400 capitalize">
                    Menu & Funcionalidades
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {onToggleTheme && (
                  <button
                    onClick={onToggleTheme}
                    className="p-2 rounded-xl bg-slate-800 text-amber-300 hover:text-amber-200 border border-slate-700 transition"
                    title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
                  >
                    {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5 text-slate-300" />}
                  </button>
                )}
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* User Profile & Theme Quick Card */}
            {currentUser && (
              <div className="p-3 bg-slate-800/90 rounded-2xl border border-slate-700/80 flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-purple-600/30 text-purple-200 border border-purple-400/30 font-black text-sm flex items-center justify-center shrink-0">
                    {currentUser.name ? currentUser.name.charAt(0) : 'U'}
                  </div>
                  <div className="truncate min-w-0">
                    <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                    <p className="text-[10px] text-purple-300 font-semibold uppercase">{currentUser.role}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  {onToggleTheme && (
                    <button
                      onClick={onToggleTheme}
                      className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1 border border-slate-600 transition"
                    >
                      {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-300" />}
                      <span>{theme === 'dark' ? 'Claro' : 'Escuro'}</span>
                    </button>
                  )}
                  {onLogout && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onLogout();
                      }}
                      className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 active:bg-rose-500/40 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold flex items-center space-x-1 transition shrink-0"
                      title="Sair da conta"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sair</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {filteredItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMenuOpen(false);
                    }}
                    className={`flex items-center space-x-2.5 p-3 rounded-xl text-xs font-semibold text-left transition ${
                      isActive
                        ? 'bg-purple-700 text-white shadow-md'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-purple-300 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Logout Button */}
            {onLogout && (
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-rose-950/40 hover:bg-rose-900/60 active:bg-rose-900 text-rose-300 border border-rose-800/60 rounded-xl text-xs font-bold transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair do Sistema / Desconectar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-gray-200 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around lg:hidden shadow-lg transition-colors">
        {mainTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition ${
                isActive
                  ? 'text-purple-700 dark:text-purple-400 font-bold'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-purple-700 dark:text-purple-400' : 'text-gray-500 dark:text-slate-400'}`} />
              <span className="text-[10px] mt-0.5">{tab.label}</span>
            </button>
          );
        })}

        {/* Center Quick Agendar Button */}
        <button
          onClick={onOpenNewAppointment}
          className="bg-purple-700 hover:bg-purple-800 text-white p-3 rounded-full shadow-lg shadow-purple-900/40 -mt-5 transition active:scale-95"
          title="Novo Agendamento"
        >
          <PlusCircle className="w-6 h-6" />
        </button>

        {/* Mais Menu Toggle */}
        <button
          onClick={() => setIsMenuOpen(true)}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition ${
            isMenuOpen
              ? 'text-purple-700 dark:text-purple-400 font-bold'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Mais</span>
        </button>
      </nav>
    </>
  );
};
