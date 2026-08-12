import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  UserCheck,
  AlertTriangle,
  UserX,
  UserMinus,
  Search,
  Filter,
  ArrowUpDown,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Award,
  FileText,
  Sparkles,
  Plus,
  X,
  Trash2,
  Edit3,
  Clock,
  TrendingUp,
  CheckCircle2,
  ExternalLink,
  Scissors,
  User as UserIcon,
  ShoppingBag,
  Star,
  RefreshCw,
  Heart,
  ShieldAlert,
  Target,
  ClipboardList,
  Settings,
} from 'lucide-react';
import { CrmOpportunitiesTab } from '../crm/CrmOpportunitiesTab';
import { CrmTasksTab } from '../crm/CrmTasksTab';
import { CrmRulesTab } from '../crm/CrmRulesTab';
import { Business, Client, LoyaltyProgram, Anamnese } from '../../types';
import { DB } from '../../services/db';
import {
  ClientCrmSummary,
  CrmFilterType,
  CrmSortType,
  RelationshipStatus,
  NEW_CLIENT_MAX_APPOINTMENTS,
  ACTIVE_MAX_DAYS,
  AT_RISK_MAX_DAYS,
  HIGH_VALUE_CUSTOMER_THRESHOLD,
  loadCrmSummariesAsync,
  filterCrmSummaries,
  sortCrmSummaries,
  getCrmKpis,
} from '../../services/crm';

interface ClientesViewProps {
  business: Business;
}

export const ClientesView: React.FC<ClientesViewProps> = ({ business }) => {
  const [subTab, setSubTab] = useState<'CARTEIRA' | 'OPORTUNIDADES' | 'TAREFAS' | 'AUTOMACOES'>('CARTEIRA');
  const [summaries, setSummaries] = useState<ClientCrmSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Sorting
  const [filter, setFilter] = useState<CrmFilterType>('TODOS');
  const [sort, setSort] = useState<CrmSortType>('LAST_VISIT_DESC');
  const [search, setSearch] = useState('');

  // Modals & Drawers
  const [selectedSummary, setSelectedSummary] = useState<ClientCrmSummary | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<'RESUMO' | 'HISTORICO' | 'FINANCEIRO' | 'FIDELIDADE' | 'ANAMNESE'>('RESUMO');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Partial<Client>>({});

  // Loyalty Program State
  const [loyaltyProgram, setLoyaltyProgram] = useState<LoyaltyProgram>(
    DB.getLoyaltyProgram(business.id)
  );

  // Anamnese Form State for Modal/Profile
  const [editingAnamnese, setEditingAnamnese] = useState<Partial<Anamnese>>({});
  const [isSavingAnamnese, setIsSavingAnamnese] = useState(false);

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await loadCrmSummariesAsync(business.id);
      setSummaries(data);

      const prog = await DB.getLoyaltyProgramAsync(business.id);
      setLoyaltyProgram(prog);

      // Refresh selected summary if open
      if (selectedSummary) {
        const updated = data.find((s) => s.client.id === selectedSummary.client.id);
        if (updated) setSelectedSummary(updated);
      }
    } catch (err) {
      console.error('Error loading CRM summaries:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [business.id]);

  // Handle client select for profile view
  const handleSelectClient = (summary: ClientCrmSummary) => {
    setSelectedSummary(summary);
    setActiveProfileTab('RESUMO');

    // Load Anamnese data
    const existingAnamnese = DB.getAnamnese(business.id, summary.client.id);
    if (existingAnamnese) {
      setEditingAnamnese(existingAnamnese);
    } else {
      setEditingAnamnese({
        business_id: business.id,
        client_id: summary.client.id,
        hair_type: '',
        chemical_history: '',
        allergies: '',
        preferences: '',
        skincare_concerns: '',
        notes: '',
      });
    }
  };

  // Save Client (Create or Update)
  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient.name || !editingClient.phone) {
      alert('Preencha o Nome e o WhatsApp/Telefone do cliente.');
      return;
    }

    try {
      await DB.saveClientAsync({
        business_id: business.id,
        name: editingClient.name,
        phone: editingClient.phone,
        whatsapp: editingClient.whatsapp || editingClient.phone,
        email: editingClient.email || '',
        birth_date: editingClient.birth_date || '',
        notes: editingClient.notes || '',
        id: editingClient.id,
      });

      setIsModalOpen(false);
      setEditingClient({});
      await loadData();
    } catch (err: any) {
      alert('Erro ao salvar cliente: ' + err.message);
    }
  };

  // Delete Client
  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente? O histórico de atendimentos continuará preservado.')) {
      return;
    }
    try {
      await DB.deleteClientAsync(business.id, clientId);
      if (selectedSummary?.client.id === clientId) {
        setSelectedSummary(null);
      }
      await loadData();
    } catch (err: any) {
      alert('Erro ao excluir cliente: ' + err.message);
    }
  };

  // Redeem Loyalty Reward
  const handleRedeemReward = (clientId: string) => {
    try {
      DB.redeemLoyaltyReward(business.id, clientId);
      alert('Recompensa resgatada com sucesso!');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao resgatar recompensa.');
    }
  };

  // Save Anamnese Record
  const handleSaveAnamnese = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSummary) return;

    setIsSavingAnamnese(true);
    try {
      DB.saveAnamneseRecord({
        business_id: business.id,
        client_id: selectedSummary.client.id,
        hair_type: editingAnamnese.hair_type || '',
        chemical_history: editingAnamnese.chemical_history || '',
        allergies: editingAnamnese.allergies || '',
        preferences: editingAnamnese.preferences || '',
        skincare_concerns: editingAnamnese.skincare_concerns || '',
        notes: editingAnamnese.notes || '',
        id: editingAnamnese.id,
      });
      alert('Ficha de Anamnese salva com sucesso!');
      loadData();
    } catch (err: any) {
      alert('Erro ao salvar anamnese: ' + err.message);
    } finally {
      setIsSavingAnamnese(false);
    }
  };

  // Calculate filtered and sorted items
  const filteredSummaries = filterCrmSummaries(summaries, filter, search);
  const displayedSummaries = sortCrmSummaries(filteredSummaries, sort);
  const kpis = getCrmKpis(summaries);

  // List of At-Risk clients for dedicated warning banner
  const atRiskClients = summaries.filter((s) => s.relationshipStatus === 'EM RISCO');
  const highValueClients = summaries.filter((s) => s.isHighValue);

  // Status Badge Component
  const renderStatusBadge = (status: RelationshipStatus, size: 'sm' | 'md' = 'md') => {
    const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
    switch (status) {
      case 'NOVO':
        return (
          <span className={`inline-flex items-center gap-1 font-extrabold rounded-full bg-blue-100 text-blue-800 ${sizeClasses}`}>
            <UserPlus className="w-3 h-3" /> NOVO
          </span>
        );
      case 'ATIVO':
        return (
          <span className={`inline-flex items-center gap-1 font-extrabold rounded-full bg-emerald-100 text-emerald-800 ${sizeClasses}`}>
            <UserCheck className="w-3 h-3" /> ATIVO
          </span>
        );
      case 'EM RISCO':
        return (
          <span className={`inline-flex items-center gap-1 font-extrabold rounded-full bg-amber-100 text-amber-800 ${sizeClasses}`}>
            <AlertTriangle className="w-3 h-3" /> EM RISCO
          </span>
        );
      case 'INATIVO':
        return (
          <span className={`inline-flex items-center gap-1 font-extrabold rounded-full bg-rose-100 text-rose-800 ${sizeClasses}`}>
            <UserX className="w-3 h-3" /> INATIVO
          </span>
        );
      case 'NUNCA VISITOU':
      default:
        return (
          <span className={`inline-flex items-center gap-1 font-extrabold rounded-full bg-slate-100 text-slate-700 ${sizeClasses}`}>
            <UserMinus className="w-3 h-3" /> NUNCA VISITOU
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Main Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-purple-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-purple-100 text-purple-800 rounded-xl">
              <Users className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">CRM e Retenção de Clientes</h1>
              <p className="text-xs text-gray-500 font-medium">
                Monitore a frequência, ticket médio, histórico e status de relacionamento da sua carteira de clientes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2.5 border border-gray-200 hover:border-purple-300 text-gray-600 rounded-2xl hover:bg-purple-50 transition flex items-center gap-1.5 text-xs font-bold"
            title="Atualizar dados CRM"
          >
            <RefreshCw className={`w-4 h-4 text-purple-700 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            onClick={() => {
              setEditingClient({});
              setIsModalOpen(true);
            }}
            className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Cliente</span>
          </button>
        </div>
      </div>

      {/* CRM Sub-Navigation Bar */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-purple-100 shadow-xs overflow-x-auto scrollbar-none">
        <button
          onClick={() => setSubTab('CARTEIRA')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            subTab === 'CARTEIRA'
              ? 'bg-purple-900 text-white shadow-xs'
              : 'text-gray-600 hover:bg-purple-50 hover:text-purple-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Carteira & Retenção</span>
        </button>

        <button
          onClick={() => setSubTab('OPORTUNIDADES')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            subTab === 'OPORTUNIDADES'
              ? 'bg-purple-900 text-white shadow-xs'
              : 'text-gray-600 hover:bg-purple-50 hover:text-purple-900'
          }`}
        >
          <Target className="w-4 h-4 text-purple-300" />
          <span>Central de Oportunidades</span>
        </button>

        <button
          onClick={() => setSubTab('TAREFAS')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            subTab === 'TAREFAS'
              ? 'bg-purple-900 text-white shadow-xs'
              : 'text-gray-600 hover:bg-purple-50 hover:text-purple-900'
          }`}
        >
          <ClipboardList className="w-4 h-4 text-purple-300" />
          <span>Tarefas CRM</span>
        </button>

        <button
          onClick={() => setSubTab('AUTOMACOES')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            subTab === 'AUTOMACOES'
              ? 'bg-purple-900 text-white shadow-xs'
              : 'text-gray-600 hover:bg-purple-50 hover:text-purple-900'
          }`}
        >
          <Settings className="w-4 h-4 text-purple-300" />
          <span>Regras de Automação</span>
        </button>
      </div>

      {subTab === 'OPORTUNIDADES' && (
        <CrmOpportunitiesTab business={business} onTaskCreated={() => setSubTab('TAREFAS')} />
      )}

      {subTab === 'TAREFAS' && (
        <CrmTasksTab business={business} />
      )}

      {subTab === 'AUTOMACOES' && (
        <CrmRulesTab business={business} />
      )}

      {subTab === 'CARTEIRA' && (
        <>
      {/* CRM KPI Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total */}
        <div
          onClick={() => setFilter('TODOS')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            filter === 'TODOS'
              ? 'bg-purple-900 text-white border-purple-900 shadow-md ring-2 ring-purple-400'
              : 'bg-white text-gray-800 border-gray-100 hover:border-purple-200'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-[10px] font-bold uppercase ${filter === 'TODOS' ? 'text-purple-200' : 'text-gray-400'}`}>
              Total Clientes
            </span>
            <Users className={`w-4 h-4 ${filter === 'TODOS' ? 'text-purple-200' : 'text-purple-600'}`} />
          </div>
          <div className="text-2xl font-black mt-1">{kpis.totalClients}</div>
          <p className={`text-[10px] mt-0.5 ${filter === 'TODOS' ? 'text-purple-200' : 'text-gray-500'}`}>
            Carteira cadastrada
          </p>
        </div>

        {/* Novos */}
        <div
          onClick={() => setFilter('NOVOS')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            filter === 'NOVOS'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
              : 'bg-blue-50/60 text-blue-900 border-blue-100 hover:border-blue-300'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-[10px] font-bold uppercase ${filter === 'NOVOS' ? 'text-blue-100' : 'text-blue-700'}`}>
              Novos (≤1 visit)
            </span>
            <UserPlus className={`w-4 h-4 ${filter === 'NOVOS' ? 'text-blue-100' : 'text-blue-600'}`} />
          </div>
          <div className="text-2xl font-black mt-1">{kpis.newClients}</div>
          <p className={`text-[10px] mt-0.5 ${filter === 'NOVOS' ? 'text-blue-100' : 'text-blue-600'}`}>
            Primeiros atendimentos
          </p>
        </div>

        {/* Ativos */}
        <div
          onClick={() => setFilter('ATIVOS')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            filter === 'ATIVOS'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300'
              : 'bg-emerald-50/60 text-emerald-900 border-emerald-100 hover:border-emerald-300'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-[10px] font-bold uppercase ${filter === 'ATIVOS' ? 'text-emerald-100' : 'text-emerald-700'}`}>
              Ativos (≤{ACTIVE_MAX_DAYS}d)
            </span>
            <UserCheck className={`w-4 h-4 ${filter === 'ATIVOS' ? 'text-emerald-100' : 'text-emerald-600'}`} />
          </div>
          <div className="text-2xl font-black mt-1">{kpis.activeClients}</div>
          <p className={`text-[10px] mt-0.5 ${filter === 'ATIVOS' ? 'text-emerald-100' : 'text-emerald-600'}`}>
            Frequência regular
          </p>
        </div>

        {/* Em Risco */}
        <div
          onClick={() => setFilter('EM_RISCO')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            filter === 'EM_RISCO'
              ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-300'
              : 'bg-amber-50/60 text-amber-900 border-amber-100 hover:border-amber-300'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-[10px] font-bold uppercase ${filter === 'EM_RISCO' ? 'text-amber-100' : 'text-amber-800'}`}>
              Em Risco (46-90d)
            </span>
            <AlertTriangle className={`w-4 h-4 ${filter === 'EM_RISCO' ? 'text-amber-100' : 'text-amber-600'}`} />
          </div>
          <div className="text-2xl font-black mt-1">{kpis.atRiskClients}</div>
          <p className={`text-[10px] mt-0.5 ${filter === 'EM_RISCO' ? 'text-amber-100' : 'text-amber-800'}`}>
            Sem retorno recente
          </p>
        </div>

        {/* Inativos */}
        <div
          onClick={() => setFilter('INATIVOS')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            filter === 'INATIVOS'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-300'
              : 'bg-rose-50/60 text-rose-900 border-rose-100 hover:border-rose-300'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-[10px] font-bold uppercase ${filter === 'INATIVOS' ? 'text-rose-100' : 'text-rose-700'}`}>
              Inativos (&gt;90d)
            </span>
            <UserX className={`w-4 h-4 ${filter === 'INATIVOS' ? 'text-rose-100' : 'text-rose-600'}`} />
          </div>
          <div className="text-2xl font-black mt-1">{kpis.inactiveClients}</div>
          <p className={`text-[10px] mt-0.5 ${filter === 'INATIVOS' ? 'text-rose-100' : 'text-rose-700'}`}>
            Longo tempo sumidos
          </p>
        </div>

        {/* Nunca Visitaram */}
        <div
          onClick={() => setFilter('NUNCA_VISITARAM')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            filter === 'NUNCA_VISITARAM'
              ? 'bg-slate-700 text-white border-slate-700 shadow-md ring-2 ring-slate-400'
              : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-[10px] font-bold uppercase ${filter === 'NUNCA_VISITARAM' ? 'text-slate-200' : 'text-slate-500'}`}>
              Sem Visitas
            </span>
            <UserMinus className={`w-4 h-4 ${filter === 'NUNCA_VISITARAM' ? 'text-slate-200' : 'text-slate-500'}`} />
          </div>
          <div className="text-2xl font-black mt-1">{kpis.neverVisitedClients}</div>
          <p className={`text-[10px] mt-0.5 ${filter === 'NUNCA_VISITARAM' ? 'text-slate-200' : 'text-slate-500'}`}>
            Sem atendimento
          </p>
        </div>
      </div>

      {/* Special Banner: At-Risk Warning */}
      {atRiskClients.length > 0 && filter !== 'EM_RISCO' && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-2xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-amber-950">
                {atRiskClients.length} {atRiskClients.length === 1 ? 'cliente está' : 'clientes estão'} em risco de evasão
              </h3>
              <p className="text-xs text-amber-800 font-medium">
                Clientes que possuem histórico de atendimentos no estabelecimento, mas não retornam há mais de 45 dias.
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilter('EM_RISCO')}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition shrink-0"
          >
            Ver Clientes em Risco
          </button>
        </div>
      )}

      {/* Filter Tabs & Search / Sort Controls */}
      <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-xs space-y-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilter('TODOS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition ${
              filter === 'TODOS'
                ? 'bg-purple-900 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todos ({kpis.totalClients})
          </button>
          <button
            onClick={() => setFilter('NOVOS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition ${
              filter === 'NOVOS'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Novos ({kpis.newClients})
          </button>
          <button
            onClick={() => setFilter('ATIVOS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition ${
              filter === 'ATIVOS'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Ativos ({kpis.activeClients})
          </button>
          <button
            onClick={() => setFilter('EM_RISCO')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition ${
              filter === 'EM_RISCO'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Em Risco ({kpis.atRiskClients})
          </button>
          <button
            onClick={() => setFilter('INATIVOS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition ${
              filter === 'INATIVOS'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            Inativos ({kpis.inactiveClients})
          </button>
          <button
            onClick={() => setFilter('NUNCA_VISITARAM')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition ${
              filter === 'NUNCA_VISITARAM'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Nunca Visitaram ({kpis.neverVisitedClients})
          </button>
          <button
            onClick={() => setFilter('ALTO_VALOR')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition flex items-center gap-1 ${
              filter === 'ALTO_VALOR'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>Alto Valor (≥R$ {HIGH_VALUE_CUSTOMER_THRESHOLD})</span>
            <span className="ml-0.5 px-1.5 py-0.2 bg-black/10 rounded-full text-[10px]">
              {kpis.highValueClients}
            </span>
          </button>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2 border-t">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone, WhatsApp, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-600 bg-gray-50 focus:bg-white"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <span className="text-xs text-gray-500 font-bold flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" /> Ordenar por:
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as CrmSortType)}
              className="px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-600 bg-white font-bold text-gray-800"
            >
              <option value="LAST_VISIT_DESC">Última Visita (Mais Recente)</option>
              <option value="NAME_ASC">Nome (A-Z)</option>
              <option value="SPENT_DESC">Maior Valor Gasto (R$)</option>
              <option value="FREQUENCY_DESC">Maior Frequência (Atendimentos)</option>
              <option value="TICKET_DESC">Maior Ticket Médio (R$)</option>
              <option value="NEWEST">Data de Cadastro (Mais Recente)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content List / Loading */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-purple-100 space-y-3">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-gray-500 font-bold">Carregando inteligência CRM dos clientes...</p>
        </div>
      ) : displayedSummaries.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-purple-100 space-y-3">
          <Users className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="font-extrabold text-base text-gray-800">Nenhum cliente encontrado</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {search
              ? `Nenhum resultado para "${search}". Tente buscar por outros termos.`
              : 'Não há clientes correspondentes ao filtro selecionado.'}
          </p>
          <button
            onClick={() => {
              setFilter('TODOS');
              setSearch('');
            }}
            className="px-4 py-2 bg-purple-100 text-purple-800 font-bold text-xs rounded-xl hover:bg-purple-200 transition"
          >
            Limpar Filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedSummaries.map((s) => (
            <div
              key={s.client.id}
              className={`bg-white rounded-3xl p-5 border shadow-xs transition hover:shadow-md flex flex-col justify-between ${
                s.relationshipStatus === 'EM RISCO'
                  ? 'border-amber-200 bg-amber-50/20'
                  : s.isHighValue
                  ? 'border-amber-300 bg-gradient-to-b from-amber-50/30 to-white'
                  : 'border-purple-100 hover:border-purple-300'
              }`}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-900 font-black flex items-center justify-center text-base shrink-0 shadow-xs">
                      {s.client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-black text-sm text-gray-900 leading-snug">{s.client.name}</h3>
                        {s.isHighValue && (
                          <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-black rounded-full flex items-center gap-0.5 border border-amber-300">
                            <Star className="w-2.5 h-2.5 fill-current" /> VIP
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-purple-600 shrink-0" />
                        <span>{s.client.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">{renderStatusBadge(s.relationshipStatus, 'sm')}</div>
                </div>

                {/* CRM Summary Badges */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50/80 rounded-2xl border border-gray-100 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Última Visita
                    </span>
                    <span className="font-extrabold text-gray-800 block text-[11px]">
                      {s.lastVisitDate ? new Date(s.lastVisitDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Nunca visitou'}
                    </span>
                    {s.daysSinceLastVisit !== null && (
                      <span className="text-[10px] text-gray-500 block font-medium">
                        há {s.daysSinceLastVisit} {s.daysSinceLastVisit === 1 ? 'dia' : 'dias'}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Total Gasto
                    </span>
                    <span className="font-black text-emerald-700 block text-xs">
                      R$ {s.totalSpent.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-gray-500 block font-medium">
                      {s.totalCompletedAppointments} {s.totalCompletedAppointments === 1 ? 'atendimento' : 'atendimentos'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Ticket Médio
                    </span>
                    <span className="font-extrabold text-purple-900 block text-[11px]">
                      R$ {s.averageTicket.toFixed(2)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Serviço Preferido
                    </span>
                    <span className="font-bold text-gray-700 block text-[11px] truncate" title={s.topService}>
                      {s.topService}
                    </span>
                  </div>
                </div>

                {/* Badges for Anamnese & Loyalty */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {s.hasAnamnese && (
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-extrabold rounded-lg flex items-center gap-1">
                      <FileText className="w-3 h-3 text-purple-600" /> Anamnese Preenchida
                    </span>
                  )}

                  <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-extrabold rounded-lg flex items-center gap-1">
                    <Award className="w-3 h-3 text-amber-600" /> {s.loyaltyStamps}/{loyaltyProgram.required_stamps || 10} Selos
                  </span>

                  {s.loyaltyRewardAvailable && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black rounded-lg animate-pulse flex items-center gap-1">
                      🎁 Recompensa Pronta!
                    </span>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between pt-4 mt-3 border-t border-gray-100 gap-2">
                <a
                  href={`https://wa.me/55${s.client.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-[11px] rounded-xl flex items-center gap-1 transition"
                  title="Abrir WhatsApp"
                >
                  <Phone className="w-3 h-3" /> WhatsApp
                </a>

                <button
                  onClick={() => handleSelectClient(s)}
                  className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-[11px] rounded-xl shadow-xs transition flex items-center gap-1"
                >
                  <span>Perfil CRM</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
        </>
      )}

      {/* MODAL: Cadastrar / Editar Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-purple-100 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-black text-lg text-gray-900">
                {editingClient.id ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingClient({});
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ana Maria Silva"
                  value={editingClient.name || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                  className="w-full px-3.5 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  WhatsApp / Telefone *
                </label>
                <input
                  type="text"
                  required
                  placeholder="(11) 99999-9999"
                  value={editingClient.phone || ''}
                  onChange={(e) =>
                    setEditingClient({
                      ...editingClient,
                      phone: e.target.value,
                      whatsapp: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">E-mail</label>
                <input
                  type="email"
                  placeholder="cliente@email.com"
                  value={editingClient.email || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                  className="w-full px-3.5 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={editingClient.birth_date || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, birth_date: e.target.value })}
                  className="w-full px-3.5 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Observações</label>
                <textarea
                  rows={2}
                  placeholder="Anotações gerais do cliente..."
                  value={editingClient.notes || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, notes: e.target.value })}
                  className="w-full px-3.5 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingClient({});
                  }}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black shadow-md"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER / MODAL: Perfil do Cliente CRM */}
      {selectedSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl bg-white rounded-3xl p-6 shadow-2xl border border-purple-100 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header Profile */}
            <div className="flex justify-between items-start pb-4 border-b">
              <div className="flex items-center space-x-3">
                <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-900 font-black flex items-center justify-center text-xl shadow-xs">
                  {selectedSummary.client.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-black text-xl text-gray-900">{selectedSummary.client.name}</h2>
                    {selectedSummary.isHighValue && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-xs font-black rounded-full flex items-center gap-1 border border-amber-300">
                        <Star className="w-3 h-3 fill-current" /> Cliente VIP
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Cadastrado em {new Date(selectedSummary.client.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {renderStatusBadge(selectedSummary.relationshipStatus, 'md')}
                <button
                  onClick={() => setSelectedSummary(null)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Profile Navigation Tabs */}
            <div className="flex items-center gap-2 border-b pb-2 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setActiveProfileTab('RESUMO')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                  activeProfileTab === 'RESUMO'
                    ? 'bg-purple-900 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Resumo CRM</span>
              </button>

              <button
                onClick={() => setActiveProfileTab('HISTORICO')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                  activeProfileTab === 'HISTORICO'
                    ? 'bg-purple-900 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Agendamentos ({selectedSummary.completedAppointmentsList.length})</span>
              </button>

              <button
                onClick={() => setActiveProfileTab('FINANCEIRO')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                  activeProfileTab === 'FINANCEIRO'
                    ? 'bg-purple-900 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Compras ({selectedSummary.salesList.length})</span>
              </button>

              <button
                onClick={() => setActiveProfileTab('FIDELIDADE')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                  activeProfileTab === 'FIDELIDADE'
                    ? 'bg-purple-900 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Fidelidade ({selectedSummary.loyaltyStamps}/{loyaltyProgram.required_stamps || 10})</span>
              </button>

              <button
                onClick={() => setActiveProfileTab('ANAMNESE')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                  activeProfileTab === 'ANAMNESE'
                    ? 'bg-purple-900 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Ficha de Anamnese</span>
              </button>
            </div>

            {/* TAB CONTENT: RESUMO */}
            {activeProfileTab === 'RESUMO' && (
              <div className="space-y-4">
                {/* Contact Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Informações de Contato
                    </span>
                    <div className="space-y-1 text-xs">
                      <p className="font-bold text-gray-800 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-purple-600" /> WhatsApp: {selectedSummary.client.phone}
                      </p>
                      {selectedSummary.client.email && (
                        <p className="text-gray-600 flex items-center gap-2">
                          <Mail className="w-4 h-4 text-purple-600" /> {selectedSummary.client.email}
                        </p>
                      )}
                      {selectedSummary.client.birth_date && (
                        <p className="text-gray-600 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-purple-600" /> Nascimento: {selectedSummary.client.birth_date}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-2">
                    <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
                      Resumo da Carteira
                    </span>
                    <div className="space-y-1 text-xs">
                      <p className="font-extrabold text-emerald-700">
                        Valor Total Gasto: R$ {selectedSummary.totalSpent.toFixed(2)}
                      </p>
                      <p className="font-bold text-purple-900">
                        Ticket Médio: R$ {selectedSummary.averageTicket.toFixed(2)}
                      </p>
                      <p className="text-gray-600 font-medium">
                        Atendimentos Concluídos: {selectedSummary.totalCompletedAppointments}
                      </p>
                    </div>
                  </div>
                </div>

                {/* CRM Key Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Última Visita
                    </span>
                    <span className="font-black text-xs text-gray-900 block mt-1">
                      {selectedSummary.lastVisitDate
                        ? new Date(selectedSummary.lastVisitDate + 'T12:00:00').toLocaleDateString('pt-BR')
                        : 'Nunca visitou'}
                    </span>
                    {selectedSummary.daysSinceLastVisit !== null && (
                      <span className="text-[10px] text-gray-500 font-medium">
                        há {selectedSummary.daysSinceLastVisit} dias
                      </span>
                    )}
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Serviço Mais Utilizado
                    </span>
                    <span className="font-black text-xs text-purple-900 block mt-1 truncate">
                      {selectedSummary.topService}
                    </span>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Profissional Preferido
                    </span>
                    <span className="font-black text-xs text-purple-900 block mt-1 truncate">
                      {selectedSummary.topProfessional}
                    </span>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Recompensas Fidelidade
                    </span>
                    <span className="font-black text-xs text-amber-900 block mt-1">
                      {selectedSummary.loyaltyTotalRewards} Resgate(s)
                    </span>
                  </div>
                </div>

                {selectedSummary.client.notes && (
                  <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100">
                    <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block mb-1">
                      Observações Gerais
                    </span>
                    <p className="text-xs text-purple-900 italic">{selectedSummary.client.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: HISTORICO */}
            {activeProfileTab === 'HISTORICO' && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span>Histórico de Agendamentos ({selectedSummary.completedAppointmentsList.length})</span>
                </h4>

                {selectedSummary.completedAppointmentsList.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200">
                    <p className="text-xs text-gray-500 font-bold">Nenhum agendamento concluído até o momento.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 border rounded-2xl overflow-hidden bg-white max-h-80 overflow-y-auto">
                    {selectedSummary.completedAppointmentsList.map((apt) => (
                      <div key={apt.id} className="p-3.5 hover:bg-gray-50 text-xs flex justify-between items-center">
                        <div>
                          <div className="font-bold text-gray-900">
                            {apt.service_name} • {apt.professional_name}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {apt.date} às {apt.start_time} - {apt.end_time}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-gray-900 block">R$ {apt.price.toFixed(2)}</span>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-black text-[10px] rounded-full inline-block mt-0.5">
                            {apt.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: FINANCEIRO */}
            {activeProfileTab === 'FINANCEIRO' && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Histórico de Vendas e Pagamentos ({selectedSummary.salesList.length})</span>
                </h4>

                {selectedSummary.salesList.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200">
                    <p className="text-xs text-gray-500 font-bold">Este cliente ainda não possui compras registradas.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 border rounded-2xl overflow-hidden bg-white max-h-80 overflow-y-auto">
                    {selectedSummary.salesList.map((s) => (
                      <div key={s.id} className="p-3.5 hover:bg-gray-50 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-gray-900">
                            {new Date(s.created_at).toLocaleDateString('pt-BR')}
                          </span>
                          <span className="font-black text-emerald-700">
                            R$ {(s.final_amount || s.total_amount).toFixed(2)}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 flex justify-between">
                          <span>
                            Método: <strong className="uppercase">{s.payment_method}</strong>
                          </span>
                          <span className="text-purple-700 font-bold">Status: {s.status}</span>
                        </div>
                        {s.items && s.items.length > 0 && (
                          <div className="text-[10px] text-gray-500 pt-1 border-t border-gray-100">
                            Itens: {s.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: FIDELIDADE */}
            {activeProfileTab === 'FIDELIDADE' && (
              <div className="space-y-4">
                <div
                  className={`p-5 rounded-2xl border space-y-3 ${
                    selectedSummary.loyaltyRewardAvailable
                      ? 'bg-amber-50 border-amber-300'
                      : 'bg-purple-50/50 border-purple-100'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Award className="w-5 h-5 text-purple-700" />
                      <h4 className="font-extrabold text-sm text-gray-900">Cartão Fidelidade</h4>
                    </div>
                    <span className="text-xs font-black text-purple-800 bg-purple-100 px-3 py-1 rounded-full">
                      {selectedSummary.loyaltyStamps} / {loyaltyProgram.required_stamps || 10} selos
                    </span>
                  </div>

                  {/* Stamps Grid */}
                  <div className="flex flex-wrap gap-2 py-2">
                    {Array.from({ length: loyaltyProgram.required_stamps || 10 }).map((_, idx) => {
                      const isStamped = idx < selectedSummary.loyaltyStamps;
                      return (
                        <div
                          key={idx}
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm transition ${
                            isStamped
                              ? 'bg-purple-700 text-white shadow-sm'
                              : 'bg-white text-gray-300 border border-gray-200'
                          }`}
                        >
                          {isStamped ? '★' : idx + 1}
                        </div>
                      );
                    })}
                  </div>

                  {selectedSummary.loyaltyRewardAvailable ? (
                    <div className="p-4 bg-amber-100 border border-amber-300 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black text-amber-900 block">🎁 Recompensa Disponível!</span>
                        <span className="text-xs text-amber-800">{loyaltyProgram.reward_description}</span>
                      </div>
                      <button
                        onClick={() => handleRedeemReward(selectedSummary.client.id)}
                        className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition"
                      >
                        Resgatar Prêmio
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">
                      Recompensa configurada: {loyaltyProgram.reward_description}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: ANAMNESE */}
            {activeProfileTab === 'ANAMNESE' && (
              <form onSubmit={handleSaveAnamnese} className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <span>Ficha de Anamnese / Preferências Técnicas</span>
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      Registre histórico de química, alergias, tipo de cabelo e preferências do cliente.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">
                      Tipo de Cabelo / Pele
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Liso 1B, Oleoso, Fino"
                      value={editingAnamnese.hair_type || ''}
                      onChange={(e) => setEditingAnamnese({ ...editingAnamnese, hair_type: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">
                      Alergias / Restrições
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Alergia a amônia, látex, etc."
                      value={editingAnamnese.allergies || ''}
                      onChange={(e) => setEditingAnamnese({ ...editingAnamnese, allergies: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">
                      Histórico de Química
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Descoloração recente, progressiva há 2 meses"
                      value={editingAnamnese.chemical_history || ''}
                      onChange={(e) => setEditingAnamnese({ ...editingAnamnese, chemical_history: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">
                      Preferências do Cliente
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Café sem açúcar, corte degradê baixo"
                      value={editingAnamnese.preferences || ''}
                      onChange={(e) => setEditingAnamnese({ ...editingAnamnese, preferences: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">
                      Cuidados Especiais & Anotações Técnicas
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Outros detalhes relevantes sobre atendimentos anteriores..."
                      value={editingAnamnese.notes || ''}
                      onChange={(e) => setEditingAnamnese({ ...editingAnamnese, notes: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSavingAnamnese}
                    className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5"
                  >
                    <FileText className="w-4 h-4" />
                    <span>{isSavingAnamnese ? 'Salvando...' : 'Salvar Ficha de Anamnese'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Modal Footer Actions */}
            <div className="flex justify-between items-center pt-4 border-t">
              <button
                onClick={() => handleDeleteClient(selectedSummary.client.id)}
                className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-extrabold flex items-center space-x-1 transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Cliente</span>
              </button>

              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setEditingClient(selectedSummary.client);
                    setSelectedSummary(null);
                    setIsModalOpen(true);
                  }}
                  className="px-4 py-2 border border-purple-200 text-purple-700 hover:bg-purple-50 rounded-xl text-xs font-extrabold transition"
                >
                  Editar Dados
                </button>
                <button
                  onClick={() => setSelectedSummary(null)}
                  className="px-5 py-2 bg-gray-900 text-white rounded-xl text-xs font-black hover:bg-black transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
