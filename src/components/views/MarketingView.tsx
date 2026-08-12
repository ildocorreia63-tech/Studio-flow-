import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  MessageSquare,
  Gift,
  RefreshCw,
  Send,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  User,
  Users,
  Calendar,
  DollarSign,
  CheckCircle2,
  PauseCircle,
  XCircle,
  AlertTriangle,
  UserCheck,
  UserX,
  Award,
  Phone,
  Mail,
  Scissors,
  Edit3,
  Clock,
  TrendingUp,
  ExternalLink,
  Copy,
  X,
  FileText,
  ChevronRight,
  Play,
  Check,
  UserMinus,
  Heart,
  Target,
} from 'lucide-react';
import {
  Business,
  MarketingCampaign,
  CampaignStatus,
  CampaignType,
  CampaignSegment,
} from '../../types';
import { DB } from '../../services/db';
import {
  ClientCrmSummary,
  loadCrmSummariesAsync,
  RelationshipStatus,
} from '../../services/crm';
import {
  filterClientsBySegment,
  renderMessageTemplate,
  generateWhatsAppCampaignUrl,
  isClientBirthdayEligible,
  PRESET_MESSAGE_TEMPLATES,
} from '../../services/marketing';

interface MarketingViewProps {
  business: Business;
}

export const MarketingView: React.FC<MarketingViewProps> = ({ business }) => {
  // Main Data States
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [crmSummaries, setCrmSummaries] = useState<ClientCrmSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selected Campaign State
  const [selectedCampaign, setSelectedCampaign] = useState<MarketingCampaign | null>(null);

  // Campaign Filter & Tab
  const [statusFilter, setStatusFilter] = useState<'ALL' | CampaignStatus>('ALL');
  const [activeTab, setActiveTab] = useState<'CAMPAIGNS' | 'CLIENTS' | 'ANALYTICS'>('CAMPAIGNS');

  // Campaign Client Search & Sort
  const [clientSearch, setClientSearch] = useState('');
  const [clientSort, setClientSort] = useState<'NAME' | 'LAST_VISIT' | 'SPENT' | 'TICKET'>('LAST_VISIT');
  const [clientSegmentFilter, setClientSegmentFilter] = useState<'ALL' | RelationshipStatus | 'ALTO_VALOR'>('ALL');

  // Contacted state tracker for UI
  const [contactedClients, setContactedClients] = useState<Record<string, boolean>>({});

  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Partial<MarketingCampaign>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Client Profile Drawer Modal State
  const [selectedClientSummary, setSelectedClientSummary] = useState<ClientCrmSummary | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<'RESUMO' | 'HISTORICO' | 'FINANCEIRO'>('RESUMO');

  // Message Preview State in list
  const [expandedPreviewClientId, setExpandedPreviewClientId] = useState<string | null>(null);

  // Load all Data
  const loadData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [camps, crmData] = await Promise.all([
        DB.getMarketingCampaignsAsync(business.id),
        loadCrmSummariesAsync(business.id),
      ]);

      setCampaigns(camps);
      setCrmSummaries(crmData);

      // Select first active campaign by default if available
      if (camps.length > 0 && !selectedCampaign) {
        const active = camps.find((c) => c.status === 'ACTIVE') || camps[0];
        setSelectedCampaign(active);
      } else if (selectedCampaign) {
        const updated = camps.find((c) => c.id === selectedCampaign.id);
        if (updated) setSelectedCampaign(updated);
      }
    } catch (err) {
      console.error('Error loading marketing data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [business.id]);

  // Real Marketing & CRM KPIs
  const activeCampaignsCount = campaigns.filter((c) => c.status === 'ACTIVE').length;
  const pausedCampaignsCount = campaigns.filter((c) => c.status === 'PAUSED').length;
  const completedCampaignsCount = campaigns.filter((c) => c.status === 'COMPLETED').length;

  const atRiskClientsCount = crmSummaries.filter((s) => s.relationshipStatus === 'EM RISCO').length;
  const inactiveClientsCount = crmSummaries.filter((s) => s.relationshipStatus === 'INATIVO').length;
  const highValueClientsCount = crmSummaries.filter((s) => s.isHighValue).length;
  const birthdayClientsCount = crmSummaries.filter((s) => isClientBirthdayEligible(s.client.birth_date, 30)).length;

  // Selected Campaign Eligible Clients
  const selectedCampaignEligibleClients = selectedCampaign
    ? filterClientsBySegment(
        crmSummaries,
        selectedCampaign.segment,
        selectedCampaign.advance_days || 0
      )
    : [];

  // Filtered Eligible Clients in selected campaign view
  const filteredEligibleClients = selectedCampaignEligibleClients
    .filter((summary) => {
      // Search
      const searchLower = clientSearch.trim().toLowerCase();
      const matchSearch =
        !searchLower ||
        summary.client.name.toLowerCase().includes(searchLower) ||
        summary.client.phone.includes(searchLower) ||
        (summary.client.email && summary.client.email.toLowerCase().includes(searchLower));

      // Segment Filter inside campaign
      let matchSegment = true;
      if (clientSegmentFilter === 'ALTO_VALOR') {
        matchSegment = summary.isHighValue;
      } else if (clientSegmentFilter !== 'ALL') {
        matchSegment = summary.relationshipStatus === clientSegmentFilter;
      }

      return matchSearch && matchSegment;
    })
    .sort((a, b) => {
      if (clientSort === 'NAME') {
        return a.client.name.localeCompare(b.client.name);
      }
      if (clientSort === 'SPENT') {
        return b.totalSpent - a.totalSpent;
      }
      if (clientSort === 'TICKET') {
        return b.averageTicket - a.averageTicket;
      }
      // LAST_VISIT
      const dateA = a.lastVisitDate || '1970-01-01';
      const dateB = b.lastVisitDate || '1970-01-01';
      return dateB.localeCompare(dateA);
    });

  // Handle Open Create Modal
  const handleOpenCreateModal = (type: CampaignType = 'REACTIVATION') => {
    let defaultSegment: CampaignSegment = 'EM_RISCO';
    let defaultTemplate = PRESET_MESSAGE_TEMPLATES[0].text;

    if (type === 'BIRTHDAY') {
      defaultSegment = 'ANIVERSARIANTES';
      defaultTemplate = PRESET_MESSAGE_TEMPLATES[1].text;
    } else if (type === 'RELATIONSHIP') {
      defaultSegment = 'ALTO_VALOR';
      defaultTemplate = PRESET_MESSAGE_TEMPLATES[2].text;
    }

    setEditingCampaign({
      business_id: business.id,
      title: '',
      description: '',
      campaign_type: type,
      segment: defaultSegment,
      message_template: defaultTemplate,
      status: 'ACTIVE',
      advance_days: type === 'BIRTHDAY' ? 7 : 0,
      start_date: new Date().toISOString().slice(0, 10),
    });
    setIsModalOpen(true);
  };

  // Handle Edit Campaign
  const handleEditCampaign = (campaign: MarketingCampaign) => {
    setEditingCampaign(campaign);
    setIsModalOpen(true);
  };

  // Save Campaign
  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign.title || !editingCampaign.message_template) {
      alert('Preencha o Nome da Campanha e a Mensagem.');
      return;
    }

    setIsSaving(true);
    try {
      const saved = await DB.saveMarketingCampaignAsync({
        business_id: business.id,
        title: editingCampaign.title,
        description: editingCampaign.description || '',
        campaign_type: editingCampaign.campaign_type || 'REACTIVATION',
        segment: editingCampaign.segment || 'TODOS',
        message_template: editingCampaign.message_template,
        status: editingCampaign.status || 'DRAFT',
        start_date: editingCampaign.start_date || null,
        end_date: editingCampaign.end_date || null,
        advance_days: editingCampaign.advance_days || 0,
        sent_count: editingCampaign.sent_count || 0,
        id: editingCampaign.id,
      });

      setIsModalOpen(false);
      setEditingCampaign({});
      await loadData();
      setSelectedCampaign(saved);
    } catch (err: any) {
      alert('Erro ao salvar campanha: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Status Change
  const handleChangeStatus = async (campaign: MarketingCampaign, newStatus: CampaignStatus) => {
    try {
      await DB.updateCampaignStatusAsync(business.id, campaign.id, newStatus);
      await loadData();
    } catch (err: any) {
      alert('Erro ao alterar status da campanha: ' + err.message);
    }
  };

  // Action: Open WhatsApp for client
  const handleOpenWhatsApp = async (clientSummary: ClientCrmSummary, campaign: MarketingCampaign) => {
    const renderedMsg = renderMessageTemplate(campaign.message_template, clientSummary, business);
    const phone = clientSummary.client.whatsapp || clientSummary.client.phone;
    const url = generateWhatsAppCampaignUrl(phone, renderedMsg);

    // Open WhatsApp in new tab
    window.open(url, '_blank', 'noopener,noreferrer');

    // Mark client as contacted locally in UI state
    setContactedClients((prev) => ({ ...prev, [clientSummary.client.id]: true }));

    // Log manual action OPENED_WHATSAPP in audit/db
    try {
      await DB.logCampaignClientActionAsync(
        business.id,
        campaign.id,
        clientSummary.client.id,
        clientSummary.client.name,
        'OPENED_WHATSAPP'
      );
      // Reload campaigns to update sent_count
      const updatedCamps = await DB.getMarketingCampaignsAsync(business.id);
      setCampaigns(updatedCamps);
      const updatedSelected = updatedCamps.find((c) => c.id === campaign.id);
      if (updatedSelected) setSelectedCampaign(updatedSelected);
    } catch (err) {
      console.error('Error logging campaign action:', err);
    }
  };

  // Insert Variable helper into message textarea
  const insertVariable = (variable: string) => {
    setEditingCampaign((prev) => ({
      ...prev,
      message_template: (prev.message_template || '') + ` {{${variable}}}`,
    }));
  };

  // Sample client for Live Preview in Modal
  const samplePreviewClient = selectedCampaignEligibleClients[0] || crmSummaries[0] || {
    client: { id: 'sample', name: 'João Silva', phone: '(11) 99999-8888', whatsapp: '11999998888' },
    lastVisitDate: new Date().toISOString().slice(0, 10),
    topService: 'Corte Degradê',
    relationshipStatus: 'EM RISCO',
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header Card */}
      <div className="bg-gradient-to-br from-purple-900 via-purple-950 to-indigo-950 p-6 md:p-8 rounded-3xl text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-800/60 border border-purple-500/30 rounded-full text-xs font-bold text-purple-200">
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>CRM & Automação StudioFlow</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Marketing, Reativação & Campanhas
            </h1>
            <p className="text-xs md:text-sm text-purple-200 max-w-2xl font-medium">
              Segmentação real da sua base de clientes, campanhas de aniversário e mensagens de reativação personalizadas via WhatsApp.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-3 bg-purple-800/50 hover:bg-purple-800 border border-purple-600/40 rounded-2xl text-white transition flex items-center justify-center text-xs font-bold gap-1.5"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => handleOpenCreateModal('REACTIVATION')}
              className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold rounded-2xl text-xs flex items-center gap-2 shadow-lg transition"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Campanha</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real Marketing KPIs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Campanhas Ativas */}
        <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-xs">
          <div className="flex justify-between items-center text-emerald-600 mb-1">
            <span className="text-[10px] font-bold uppercase text-gray-500">Ativas</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-gray-900">{activeCampaignsCount}</div>
          <p className="text-[10px] text-gray-500 mt-0.5">Campanhas no ar</p>
        </div>

        {/* Campanhas Pausadas */}
        <div className="p-4 bg-white rounded-2xl border border-amber-100 shadow-xs">
          <div className="flex justify-between items-center text-amber-600 mb-1">
            <span className="text-[10px] font-bold uppercase text-gray-500">Pausadas</span>
            <PauseCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-gray-900">{pausedCampaignsCount}</div>
          <p className="text-[10px] text-gray-500 mt-0.5">Aguardando disparo</p>
        </div>

        {/* Concluídas */}
        <div className="p-4 bg-white rounded-2xl border border-blue-100 shadow-xs">
          <div className="flex justify-between items-center text-blue-600 mb-1">
            <span className="text-[10px] font-bold uppercase text-gray-500">Concluídas</span>
            <Check className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-gray-900">{completedCampaignsCount}</div>
          <p className="text-[10px] text-gray-500 mt-0.5">Finalizadas</p>
        </div>

        {/* Elegíveis na Campanha */}
        <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100 shadow-xs">
          <div className="flex justify-between items-center text-purple-700 mb-1">
            <span className="text-[10px] font-bold uppercase text-purple-800">Elegíveis</span>
            <Target className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-purple-950">
            {selectedCampaignEligibleClients.length}
          </div>
          <p className="text-[10px] text-purple-700 mt-0.5">Na campanha atual</p>
        </div>

        {/* Clientes Em Risco */}
        <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 shadow-xs">
          <div className="flex justify-between items-center text-amber-700 mb-1">
            <span className="text-[10px] font-bold uppercase text-amber-900">Em Risco</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-950">{atRiskClientsCount}</div>
          <p className="text-[10px] text-amber-800 mt-0.5">46-90d sem visita</p>
        </div>

        {/* Clientes Inativos */}
        <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-200/80 shadow-xs">
          <div className="flex justify-between items-center text-rose-700 mb-1">
            <span className="text-[10px] font-bold uppercase text-rose-900">Inativos</span>
            <UserX className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-rose-950">{inactiveClientsCount}</div>
          <p className="text-[10px] text-rose-800 mt-0.5">&gt;90d sem visita</p>
        </div>

        {/* Clientes VIP */}
        <div className="p-4 bg-amber-100/50 rounded-2xl border border-amber-300/80 shadow-xs">
          <div className="flex justify-between items-center text-amber-800 mb-1">
            <span className="text-[10px] font-bold uppercase text-amber-900">Clientes VIP</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-950">{highValueClientsCount}</div>
          <p className="text-[10px] text-amber-800 mt-0.5">Gasto &ge; R$500</p>
        </div>

        {/* Aniversariantes */}
        <div className="p-4 bg-pink-50/60 rounded-2xl border border-pink-200/80 shadow-xs">
          <div className="flex justify-between items-center text-pink-700 mb-1">
            <span className="text-[10px] font-bold uppercase text-pink-900">Aniversários</span>
            <Gift className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-pink-950">{birthdayClientsCount}</div>
          <p className="text-[10px] text-pink-800 mt-0.5">Próximos 30 dias</p>
        </div>
      </div>

      {/* Main Campaign Management & Client List Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Campaigns List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-extrabold text-base text-gray-900">Minhas Campanhas</h2>
                <p className="text-xs text-gray-500">Selecione uma campanha para gerenciar contatos</p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpenCreateModal('REACTIVATION')}
                  className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-xl transition text-xs font-bold flex items-center gap-1"
                  title="Criar Campanha"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Criar</span>
                </button>
              </div>
            </div>

            {/* Filter Tabs by Status */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-xs font-bold border-b border-gray-100">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  statusFilter === 'ALL'
                    ? 'bg-purple-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Todas ({campaigns.length})
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-emerald-600 text-white'
                    : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                }`}
              >
                Ativas ({activeCampaignsCount})
              </button>
              <button
                onClick={() => setStatusFilter('PAUSED')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  statusFilter === 'PAUSED'
                    ? 'bg-amber-600 text-white'
                    : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
                }`}
              >
                Pausadas ({pausedCampaignsCount})
              </button>
              <button
                onClick={() => setStatusFilter('DRAFT')}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  statusFilter === 'DRAFT'
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Rascunhos
              </button>
            </div>

            {/* List of Campaigns */}
            <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
              {campaigns
                .filter((c) => statusFilter === 'ALL' || c.status === statusFilter)
                .map((campaign) => {
                  const isSelected = selectedCampaign?.id === campaign.id;
                  const eligibleCount = filterClientsBySegment(
                    crmSummaries,
                    campaign.segment,
                    campaign.advance_days || 0
                  ).length;

                  return (
                    <div
                      key={campaign.id}
                      onClick={() => setSelectedCampaign(campaign)}
                      className={`p-4 rounded-2xl border transition cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50/40 shadow-xs ring-2 ring-purple-400/30'
                          : 'border-gray-200/80 bg-white hover:border-purple-200 hover:bg-gray-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                campaign.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : campaign.status === 'PAUSED'
                                  ? 'bg-amber-100 text-amber-800'
                                  : campaign.status === 'COMPLETED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {campaign.status === 'ACTIVE'
                                ? 'ATIVA'
                                : campaign.status === 'PAUSED'
                                ? 'PAUSADA'
                                : campaign.status === 'COMPLETED'
                                ? 'CONCLUÍDA'
                                : campaign.status === 'CANCELLED'
                                ? 'CANCELADA'
                                : 'RASCUNHO'}
                            </span>

                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900">
                              {campaign.segment}
                            </span>
                          </div>

                          <h3 className="font-extrabold text-sm text-gray-900 mt-1.5">
                            {campaign.title}
                          </h3>

                          {campaign.description && (
                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                              {campaign.description}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditCampaign(campaign);
                          }}
                          className="p-1.5 text-gray-400 hover:text-purple-700 hover:bg-purple-100 rounded-lg transition"
                          title="Editar Campanha"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Stats inside campaign card */}
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
                        <div className="flex items-center gap-1.5 text-purple-900 font-bold">
                          <Users className="w-3.5 h-3.5" />
                          <span>{eligibleCount} clientes elegíveis</span>
                        </div>

                        <div className="flex items-center gap-1 text-emerald-700 font-medium">
                          <Send className="w-3 h-3" />
                          <span>{campaign.sent_count || 0} acessos WhatsApp</span>
                        </div>
                      </div>

                      {/* Status Transition Quick Action */}
                      <div className="mt-2.5 flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {campaign.status === 'DRAFT' && (
                          <button
                            onClick={() => handleChangeStatus(campaign, 'ACTIVE')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-lg transition flex items-center gap-1"
                          >
                            <Play className="w-3 h-3" />
                            <span>Ativar</span>
                          </button>
                        )}

                        {campaign.status === 'ACTIVE' && (
                          <>
                            <button
                              onClick={() => handleChangeStatus(campaign, 'PAUSED')}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] rounded-lg transition flex items-center gap-1"
                            >
                              <PauseCircle className="w-3 h-3" />
                              <span>Pausar</span>
                            </button>
                            <button
                              onClick={() => handleChangeStatus(campaign, 'COMPLETED')}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] rounded-lg transition flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>Concluir</span>
                            </button>
                          </>
                        )}

                        {campaign.status === 'PAUSED' && (
                          <button
                            onClick={() => handleChangeStatus(campaign, 'ACTIVE')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-lg transition flex items-center gap-1"
                          >
                            <Play className="w-3 h-3" />
                            <span>Reativar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

              {campaigns.length === 0 && (
                <div className="text-center py-12 px-4 border-2 border-dashed border-gray-200 rounded-3xl space-y-3">
                  <Sparkles className="w-8 h-8 text-purple-400 mx-auto" />
                  <p className="font-bold text-sm text-gray-700">Nenhuma campanha cadastrada</p>
                  <p className="text-xs text-gray-500">
                    Crie sua primeira campanha para reativar clientes em risco.
                  </p>
                  <button
                    onClick={() => handleOpenCreateModal('REACTIVATION')}
                    className="px-4 py-2 bg-purple-900 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-purple-950 transition"
                  >
                    Criar Primeira Campanha
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Campaign Details & Eligible Client Messenger (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedCampaign ? (
            <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-5">
              {/* Campaign Header & Details */}
              <div className="border-b border-gray-100 pb-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-purple-100 text-purple-900 font-extrabold text-xs rounded-full">
                        Segmento: {selectedCampaign.segment}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                          selectedCampaign.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : selectedCampaign.status === 'PAUSED'
                            ? 'bg-amber-100 text-amber-800'
                            : selectedCampaign.status === 'COMPLETED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {selectedCampaign.status}
                      </span>
                    </div>

                    <h2 className="text-xl font-black text-gray-900 mt-2">
                      {selectedCampaign.title}
                    </h2>

                    {selectedCampaign.description && (
                      <p className="text-xs text-gray-600 mt-1">{selectedCampaign.description}</p>
                    )}
                  </div>

                  <button
                    onClick={() => handleEditCampaign(selectedCampaign)}
                    className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar Mensagem</span>
                  </button>
                </div>

                {/* Message Template Display Box */}
                <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-purple-700" />
                      Modelo de Mensagem Configurado:
                    </span>
                    <span className="text-[10px] text-purple-600 font-medium">
                      Variáveis: &#123;&#123;nome&#125;&#125;, &#123;&#123;empresa&#125;&#125;, &#123;&#123;servico&#125;&#125;, &#123;&#123;data&#125;&#125;
                    </span>
                  </div>
                  <p className="text-xs text-gray-800 font-mono whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-xl border border-purple-100/60 shadow-2xs">
                    {selectedCampaign.message_template}
                  </p>
                </div>

                {/* Live Message Sample Preview for Sample Client */}
                <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-2xl text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-emerald-900">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Pré-visualização Real com Exemplo:
                    </span>
                    <span className="text-[10px] text-emerald-700 font-medium">
                      Cliente Exemplo: {samplePreviewClient.client.name}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-950 font-medium italic">
                    "{renderMessageTemplate(selectedCampaign.message_template, samplePreviewClient, business)}"
                  </p>
                </div>
              </div>

              {/* Controls Bar for Eligible Clients Table */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-700" />
                    <span>Clientes Elegíveis para esta Campanha</span>
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-900 rounded-full text-xs font-black">
                      {filteredEligibleClients.length}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    Clique em "Abrir WhatsApp" para enviar a mensagem personalizada individual.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-48">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar cliente..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>

                  <select
                    value={clientSort}
                    onChange={(e: any) => setClientSort(e.target.value)}
                    className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none"
                  >
                    <option value="LAST_VISIT">Última Visita</option>
                    <option value="NAME">Nome A-Z</option>
                    <option value="SPENT">Maior Total Gasto</option>
                    <option value="TICKET">Maior Ticket Médio</option>
                  </select>
                </div>
              </div>

              {/* Table / List of Eligible Clients */}
              <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                {filteredEligibleClients.map((summary) => {
                  const renderedMessage = renderMessageTemplate(
                    selectedCampaign.message_template,
                    summary,
                    business
                  );
                  const isContacted = contactedClients[summary.client.id];
                  const isExpanded = expandedPreviewClientId === summary.client.id;

                  return (
                    <div
                      key={summary.client.id}
                      className="p-4 hover:bg-purple-50/20 transition space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-gray-900">
                              {summary.client.name}
                            </span>

                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                summary.relationshipStatus === 'NOVO'
                                  ? 'bg-blue-100 text-blue-800'
                                  : summary.relationshipStatus === 'ATIVO'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : summary.relationshipStatus === 'EM RISCO'
                                  ? 'bg-amber-100 text-amber-800'
                                  : summary.relationshipStatus === 'INATIVO'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {summary.relationshipStatus}
                            </span>

                            {summary.isHighValue && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 flex items-center gap-1">
                                <Award className="w-3 h-3 text-amber-600" />
                                VIP
                              </span>
                            )}

                            {isContacted && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                WhatsApp Aberto
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 font-medium">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              {summary.client.phone}
                            </span>

                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-400" />
                              Última visita:{' '}
                              {summary.lastVisitDate
                                ? `${summary.lastVisitDate.split('-').reverse().join('/')} (${summary.daysSinceLastVisit} dias atrás)`
                                : 'Sem registro'}
                            </span>

                            <span className="flex items-center gap-1 text-gray-700 font-bold">
                              <DollarSign className="w-3 h-3 text-emerald-600" />
                              R$ {summary.totalSpent.toFixed(2)} total
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() =>
                              setExpandedPreviewClientId(
                                isExpanded ? null : summary.client.id
                              )
                            }
                            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition"
                            title="Ver mensagem personalizada"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedClientSummary(summary);
                              setActiveProfileTab('RESUMO');
                            }}
                            className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs rounded-xl transition"
                          >
                            Perfil CRM
                          </button>

                          <button
                            onClick={() => handleOpenWhatsApp(summary, selectedCampaign)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Abrir WhatsApp</span>
                          </button>
                        </div>
                      </div>

                      {/* Collapsible Individual Message Preview */}
                      {isExpanded && (
                        <div className="mt-2 p-3 bg-purple-50/70 border border-purple-100 rounded-xl text-xs text-gray-800 font-mono">
                          <p className="text-[10px] font-bold text-purple-900 mb-1">
                            Mensagem para {summary.client.name}:
                          </p>
                          <p className="whitespace-pre-wrap">{renderedMessage}</p>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredEligibleClients.length === 0 && (
                  <div className="text-center py-12 px-4 space-y-2">
                    <Users className="w-8 h-8 text-gray-300 mx-auto" />
                    <p className="font-bold text-sm text-gray-700">Nenhum cliente elegível encontrado</p>
                    <p className="text-xs text-gray-500">
                      Tente alterar a busca ou a segmentação da campanha.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-gray-200/80 text-center space-y-3">
              <Sparkles className="w-10 h-10 text-purple-400 mx-auto" />
              <h3 className="font-black text-lg text-gray-900">Selecione uma Campanha</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Escolha uma campanha na lista à esquerda para visualizar os clientes elegíveis e enviar mensagens.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Campaign Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl my-8 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  {editingCampaign.id ? 'Editar Campanha' : 'Nova Campanha de Marketing'}
                </h3>
                <p className="text-xs text-gray-500">
                  Configure a segmentação e a mensagem personalizada de reativação.
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCampaign} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nome da Campanha */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-extrabold text-gray-700 mb-1">
                    Nome da Campanha *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Reativação Clientes Sumidos - Agosto"
                    value={editingCampaign.title || ''}
                    onChange={(e) => setEditingCampaign({ ...editingCampaign, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                {/* Descrição */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-extrabold text-gray-700 mb-1">
                    Descrição do Objetivo (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Convite de retorno para clientes com mais de 45 dias sem agendar"
                    value={editingCampaign.description || ''}
                    onChange={(e) => setEditingCampaign({ ...editingCampaign, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                {/* Tipo de Campanha */}
                <div>
                  <label className="block text-xs font-extrabold text-gray-700 mb-1">
                    Tipo de Campanha
                  </label>
                  <select
                    value={editingCampaign.campaign_type || 'REACTIVATION'}
                    onChange={(e: any) =>
                      setEditingCampaign({ ...editingCampaign, campaign_type: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
                  >
                    <option value="REACTIVATION">Reativação (Retorno)</option>
                    <option value="BIRTHDAY">Aniversário</option>
                    <option value="RELATIONSHIP">Relacionamento / VIP</option>
                    <option value="PROMOTIONAL">Promoção / Evento</option>
                  </select>
                </div>

                {/* Segmento CRM Alvo */}
                <div>
                  <label className="block text-xs font-extrabold text-gray-700 mb-1">
                    Segmento CRM Alvo
                  </label>
                  <select
                    value={editingCampaign.segment || 'EM_RISCO'}
                    onChange={(e: any) =>
                      setEditingCampaign({ ...editingCampaign, segment: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
                  >
                    <option value="TODOS">Todos os Clientes</option>
                    <option value="NOVOS">Novos Clientes (&le;1 visita)</option>
                    <option value="ATIVOS">Ativos (&le;45 dias)</option>
                    <option value="EM_RISCO">Em Risco (46-90 dias sem visita)</option>
                    <option value="INATIVOS">Inativos (&gt;90 dias sem visita)</option>
                    <option value="NUNCA_VISITARAM">Nunca Visitaram</option>
                    <option value="ALTO_VALOR">Alto Valor / VIP (&ge;R$500)</option>
                    <option value="ANIVERSARIANTES">Aniversariantes</option>
                  </select>
                </div>

                {/* Advance Days (if Birthday) */}
                {(editingCampaign.segment === 'ANIVERSARIANTES' ||
                  editingCampaign.campaign_type === 'BIRTHDAY') && (
                  <div>
                    <label className="block text-xs font-extrabold text-gray-700 mb-1">
                      Antecedência em Dias
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={editingCampaign.advance_days ?? 7}
                      onChange={(e) =>
                        setEditingCampaign({
                          ...editingCampaign,
                          advance_days: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      0 = Apenas no dia do aniversário. 7 = Aniversariantes nos próximos 7 dias.
                    </p>
                  </div>
                )}

                {/* Status */}
                <div>
                  <label className="block text-xs font-extrabold text-gray-700 mb-1">
                    Status Inicial
                  </label>
                  <select
                    value={editingCampaign.status || 'ACTIVE'}
                    onChange={(e: any) => setEditingCampaign({ ...editingCampaign, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
                  >
                    <option value="ACTIVE">Ativa</option>
                    <option value="DRAFT">Rascunho</option>
                    <option value="PAUSED">Pausada</option>
                    <option value="COMPLETED">Concluída</option>
                  </select>
                </div>
              </div>

              {/* Preset Model Buttons */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-extrabold text-gray-700">
                  Modelos de Mensagem Prontos:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_MESSAGE_TEMPLATES.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        setEditingCampaign({ ...editingCampaign, message_template: preset.text })
                      }
                      className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200/60 rounded-lg text-[10px] font-bold transition"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Variable Insertion Toolbar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold text-gray-700">
                    Mensagem da Campanha *
                  </label>
                  <span className="text-[10px] text-gray-500">Clique para inserir variável:</span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {['nome', 'empresa', 'servico', 'data', 'telefone'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v)}
                      className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md text-[10px] font-mono font-bold transition"
                    >
                      + &#123;&#123;{v}&#125;&#125;
                    </button>
                  ))}
                </div>

                <textarea
                  required
                  rows={4}
                  placeholder="Escreva sua mensagem aqui..."
                  value={editingCampaign.message_template || ''}
                  onChange={(e) =>
                    setEditingCampaign({ ...editingCampaign, message_template: e.target.value })
                  }
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {/* Live Preview Box */}
              <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl text-xs space-y-1">
                <span className="font-bold text-emerald-900 text-[11px] block">
                  Pré-visualização do Resultado:
                </span>
                <p className="text-xs text-emerald-950 font-medium italic">
                  "{renderMessageTemplate(editingCampaign.message_template || '', samplePreviewClient, business)}"
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-purple-900 hover:bg-purple-950 text-white font-extrabold rounded-xl text-xs shadow-md transition flex items-center gap-1.5"
                >
                  {isSaving ? (
                    <span>Salvando...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Salvar Campanha</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Integrated Client Profile Modal Drawer */}
      {selectedClientSummary && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end p-0">
          <div className="bg-white max-w-xl w-full h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-purple-900 to-indigo-900 text-white flex items-start justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-white/20 text-white">
                  {selectedClientSummary.relationshipStatus}
                </span>
                <h2 className="text-xl font-black mt-2">{selectedClientSummary.client.name}</h2>
                <p className="text-xs text-purple-200 font-medium">📞 {selectedClientSummary.client.phone}</p>
              </div>

              <button
                onClick={() => setSelectedClientSummary(null)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Tabs */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Total Gasto</span>
                  <p className="text-base font-black text-gray-900 mt-1">R$ {selectedClientSummary.totalSpent.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Ticket Médio</span>
                  <p className="text-base font-black text-gray-900 mt-1">R$ {selectedClientSummary.averageTicket.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Atendimentos</span>
                  <p className="text-base font-black text-gray-900 mt-1">{selectedClientSummary.totalCompletedAppointments}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Última Visita</span>
                  <p className="text-xs font-extrabold text-gray-900 mt-1">
                    {selectedClientSummary.lastVisitDate
                      ? `${selectedClientSummary.lastVisitDate.split('-').reverse().join('/')}`
                      : 'Nenhuma'}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 space-y-2">
                <p className="text-xs font-bold text-purple-900">Serviço mais utilizado:</p>
                <p className="text-sm font-black text-purple-950">{selectedClientSummary.topService}</p>
              </div>

              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 space-y-2">
                <p className="text-xs font-bold text-purple-900">Profissional favorito:</p>
                <p className="text-sm font-black text-purple-950">{selectedClientSummary.topProfessional}</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedClientSummary(null)}
                className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs rounded-xl transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
