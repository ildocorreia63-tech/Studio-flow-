import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCheck,
  Scissors,
  ShoppingCart,
  DollarSign,
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
  Sparkles,
  PlusCircle,
  Building,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';
import { ActiveTab, Business, UserProfile, UserRole } from '../types';
import { isPlatformOwner } from '../utils/auth';
import { StudioFlowLogo } from './StudioFlowLogo';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentBusiness: Business;
  userRole: UserRole;
  currentUser?: UserProfile | null;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onOpenNewAppointment: () => void;
  onOpenBusinessSwitcher: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentBusiness,
  userRole,
  currentUser,
  theme = 'light',
  onToggleTheme,
  onOpenNewAppointment,
  onOpenBusinessSwitcher,
  onLogout,
}) => {
  const isSaasOwner = isPlatformOwner(currentUser, currentBusiness);

  const menuItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }>; roles?: UserRole[] }[] = [
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

  const filteredItems = menuItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole) || isSaasOwner;
  });

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-slate-100 border-r border-slate-800 min-h-screen fixed left-0 top-0 bottom-0 z-30 shadow-xl select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <StudioFlowLogo
          size="md"
          variant="horizontal"
          showSubtitle={true}
          onClick={() => setActiveTab('dashboard')}
          className="cursor-pointer"
        />
      </div>

      {/* Business Switcher Badge */}
      <div
        className="p-3.5 mx-3 mt-3 bg-slate-800/90 hover:bg-slate-800 border-2 border-purple-900/50 hover:border-purple-600/60 rounded-2xl transition cursor-pointer flex items-center justify-between shadow-md group"
        onClick={onOpenBusinessSwitcher}
        title="Alternar ou gerenciar estabelecimento"
      >
        <div className="flex items-center space-x-3 truncate min-w-0">
          <div className="w-12 h-12 rounded-xl bg-slate-950 text-purple-300 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden border-2 border-purple-500/60 p-1 group-hover:border-purple-400 shadow-inner">
            {currentBusiness?.logo_url ? (
              <img src={currentBusiness.logo_url} alt={currentBusiness.name} className="max-w-full max-h-full object-contain" />
            ) : (
              <Building className="w-6 h-6 text-purple-400" />
            )}
          </div>
          <div className="truncate min-w-0">
            <p className="text-sm font-black text-white truncate group-hover:text-purple-200 transition">{currentBusiness?.name || 'StudioFlow'}</p>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="text-[10px] font-bold text-purple-300 capitalize truncate">
                {currentBusiness?.type || 'Barbearia'}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-purple-950 text-purple-300 font-bold border border-purple-800 uppercase shrink-0">
                {userRole}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="p-3">
        <button
          onClick={onOpenNewAppointment}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-purple-950/50 flex items-center justify-center space-x-2 text-sm transition transform active:scale-98"
        >
          <PlusCircle className="w-5 h-5" />
          <span>+ NOVO AGENDAMENTO</span>
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive
                  ? 'bg-purple-700/90 text-white shadow-md shadow-purple-950/40 border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-purple-200' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Footer info, Theme Toggle & Logout */}
      <div className="p-3 border-t border-slate-800 space-y-2 bg-slate-950/40">
        {currentUser && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center space-x-2.5 truncate min-w-0">
              <div className="w-8 h-8 rounded-lg bg-purple-600/30 text-purple-200 border border-purple-400/30 font-black text-xs flex items-center justify-center shrink-0">
                {currentUser.name ? currentUser.name.charAt(0) : 'U'}
              </div>
              <div className="truncate min-w-0">
                <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                <p className="text-[9px] text-purple-300 font-semibold uppercase">{currentUser.role}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 shrink-0">
              {onToggleTheme && (
                <button
                  onClick={onToggleTheme}
                  className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-700/60 rounded-lg transition"
                  title={theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
                  aria-label="Alternar tema"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
                </button>
              )}
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 rounded-lg transition"
                  title="Sair do sistema"
                  aria-label="Sair da conta"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 font-medium">
          <span>StudioFlow SaaS &copy; 2026</span>
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold flex items-center space-x-1"
            >
              <span>{theme === 'dark' ? '☀️ Claro' : '🌙 Escuro'}</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
