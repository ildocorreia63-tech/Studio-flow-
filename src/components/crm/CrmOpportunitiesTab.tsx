import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  Send,
  Plus,
  Search,
  Filter,
  User,
  Phone,
  Calendar,
  DollarSign,
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  TrendingUp,
  MessageSquare,
  Gift,
  Target,
  UserCheck,
  UserX,
  ExternalLink,
} from 'lucide-react';
import { Business, CrmOpportunity, CrmTaskPriority, CrmEventType } from '../../types';
import { DB } from '../../services/db';

interface CrmOpportunitiesTabProps {
  business: Business;
  onTaskCreated?: () => void;
}

export const CrmOpportunitiesTab: React.FC<CrmOpportunitiesTabProps> = ({
  business,
  onTaskCreated,
}) => {
  const [opportunities, setOpportunities] = useState<CrmOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');

  const loadOpportunities = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await DB.runCrmAutomationEngineAsync(business.id);
      setOpportunities(result.opportunities);
    } catch (err) {
      console.error('Error running CRM automation engine:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOpportunities();
  }, [business.id]);

  const handleOpenWhatsApp = (opp: CrmOpportunity) => {
    const cleanPhone = opp.client_phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const encodedMsg = encodeURIComponent(opp.message_template);
    const url = `https://wa.me/${phoneWithCountry}?text=${encodedMsg}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCreateTaskFromOpportunity = async (opp: CrmOpportunity) => {
    try {
      await DB.saveCrmTaskAsync(business.id, {
        client_id: opp.client_id,
        client_name: opp.client_name,
        rule_id: opp.rule_id || null,
        origin_event: opp.event_type,
        title: `${opp.category}: ${opp.client_name}`,
        description: `${opp.reason}. Mensagem sugerida: "${opp.message_template}"`,
        status: 'PENDING',
        priority: opp.priority,
        due_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
        assigned_to: 'Equipe CRM',
        dedup_key: `${business.id}:${opp.client_id}:${opp.event_type}:${new Date().toISOString().slice(0, 7)}`,
      });

      alert(`Tarefa criada com sucesso para ${opp.client_name}!`);
      if (onTaskCreated) onTaskCreated();
    } catch (err: any) {
      alert('Erro ao criar tarefa: ' + err.message);
    }
  };

  const filtered = opportunities.filter((opp) => {
    const matchesSearch =
      opp.client_name.toLowerCase().includes(search.toLowerCase()) ||
      opp.client_phone.includes(search) ||
      opp.reason.toLowerCase().includes(search.toLowerCase());

    if (selectedCategory === 'TODAS') return matchesSearch;
    if (selectedCategory === 'Reativar') return matchesSearch && opp.category === 'Reativar';
    if (selectedCategory === 'Aniversário') return matchesSearch && opp.category === 'Aniversário';
    if (selectedCategory === 'VIP') return matchesSearch && opp.category === 'VIP';
    if (selectedCategory === 'Fidelidade') return matchesSearch && opp.category === 'Fidelidade';
    if (selectedCategory === 'Sem Próximo Agendamento')
      return matchesSearch && opp.category === 'Sem próximo agendamento';
    if (selectedCategory === 'Pós-atendimento')
      return matchesSearch && opp.category === 'Pós-atendimento';

    return matchesSearch;
  });

  const getPriorityBadge = (p: CrmTaskPriority) => {
    switch (p) {
      case 'URGENT':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">URGENTE</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">ALTA</span>;
      case 'NORMAL':
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">NORMAL</span>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Aniversário':
        return <Gift className="w-4 h-4 text-purple-600" />;
      case 'VIP':
        return <Award className="w-4 h-4 text-amber-600" />;
      case 'Fidelidade':
        return <Award className="w-4 h-4 text-emerald-600" />;
      case 'Reativar':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'Sem próximo agendamento':
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'Pós-atendimento':
      default:
        return <CheckCircle2 className="w-4 h-4 text-indigo-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 p-6 rounded-3xl text-white shadow-lg">
        <div>
          <div className="flex items-center space-x-2">
            <Target className="w-6 h-6 text-purple-300" />
            <h2 className="text-xl font-extrabold tracking-tight">Central de Oportunidades CRM</h2>
          </div>
          <p className="text-xs text-purple-200 mt-1 max-w-2xl">
            Recomendações automáticas baseadas em eventos reais: clientes inativos, aniversariantes, VIPs e sem próximo agendamento.
          </p>
        </div>

        <button
          onClick={() => loadOpportunities(true)}
          disabled={refreshing}
          className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/20 text-xs font-bold transition flex items-center space-x-2 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 text-purple-300 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Executar Automações Agora</span>
        </button>
      </div>

      {/* Categories & Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-purple-100 shadow-xs">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
          {[
            { id: 'TODAS', label: 'Todas' },
            { id: 'Reativar', label: 'Reativar (Sumiço)' },
            { id: 'Aniversário', label: 'Aniversariantes' },
            { id: 'VIP', label: 'VIP / Alto Valor' },
            { id: 'Fidelidade', label: 'Fidelidade' },
            { id: 'Sem Próximo Agendamento', label: 'Sem Agendamento' },
            { id: 'Pós-atendimento', label: 'Pós-Atendimento' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-purple-50 hover:text-purple-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar oportunidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>
      </div>

      {/* Opportunities Cards Grid */}
      {loading ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-purple-100 shadow-xs">
          <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-500 font-medium">Analisando eventos e gerando oportunidades CRM...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-purple-100 p-6 shadow-xs">
          <Target className="w-12 h-12 text-purple-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-gray-800">Nenhuma oportunidade nesta categoria</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
            Todas as regras de automação estão em dia ou não há clientes elegíveis para este filtro no momento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((opp) => (
            <div
              key={opp.id}
              className="bg-white rounded-3xl border border-purple-100 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                {/* Header Badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-xl bg-purple-50 border border-purple-100">
                      {getCategoryIcon(opp.category)}
                    </div>
                    <div>
                      <span className="text-xs font-black text-purple-950 uppercase block">{opp.category}</span>
                      <span className="text-[10px] text-gray-500 font-medium">{opp.client_phone}</span>
                    </div>
                  </div>
                  {getPriorityBadge(opp.priority)}
                </div>

                {/* Client Name & Reason */}
                <h3 className="text-base font-extrabold text-gray-900 mb-1">{opp.client_name}</h3>
                <p className="text-xs font-semibold text-purple-900 bg-purple-50/80 p-2.5 rounded-xl border border-purple-100 mb-3">
                  {opp.reason}
                </p>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 text-[11px] mb-4">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-gray-400 block text-[10px]">Última Visita</span>
                    <span className="font-bold text-gray-800">
                      {opp.last_visit_date ? new Date(opp.last_visit_date).toLocaleDateString() : 'Nunca'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-gray-400 block text-[10px]">Total Gasto</span>
                    <span className="font-bold text-emerald-700">R$ {opp.total_spent.toFixed(2)}</span>
                  </div>
                </div>

                {/* Message Template Preview */}
                <div className="bg-slate-50/90 rounded-2xl p-3 border border-slate-200/60 mb-4">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                    Mensagem Recomendada:
                  </span>
                  <p className="text-xs text-gray-700 italic line-clamp-3">"{opp.message_template}"</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => handleOpenWhatsApp(opp)}
                  className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition flex items-center justify-center space-x-1.5 shadow-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>

                <button
                  onClick={() => handleCreateTaskFromOpportunity(opp)}
                  className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-extrabold rounded-xl transition flex items-center justify-center space-x-1"
                  title="Transformar esta oportunidade em uma tarefa do CRM"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tarefa</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
