import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  Plus,
  Edit3,
  CheckCircle2,
  XCircle,
  Clock,
  Settings,
  MessageSquare,
  AlertTriangle,
  Award,
  Gift,
  Calendar,
  X,
  Play,
} from 'lucide-react';
import { Business, CrmAutomationRule, CrmEventType, CrmActionType } from '../../types';
import { DB } from '../../services/db';

interface CrmRulesTabProps {
  business: Business;
}

export const CrmRulesTab: React.FC<CrmRulesTabProps> = ({ business }) => {
  const [rules, setRules] = useState<CrmAutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Rule Modal
  const [editingRule, setEditingRule] = useState<Partial<CrmAutomationRule> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadRules = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await DB.getCrmAutomationRulesAsync(business.id);
      setRules(data);
    } catch (err) {
      console.error('Error loading CRM automation rules:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, [business.id]);

  const handleToggleStatus = async (ruleId: string, currentActive: boolean) => {
    try {
      await DB.toggleCrmAutomationRuleStatusAsync(business.id, ruleId, !currentActive);
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, is_active: !currentActive } : r))
      );
    } catch (err: any) {
      alert('Erro ao alterar status da regra: ' + err.message);
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule || !editingRule.name || !editingRule.event_type) return;

    setIsSaving(true);
    try {
      await DB.saveCrmAutomationRuleAsync(business.id, {
        id: editingRule.id,
        name: editingRule.name,
        event_type: editingRule.event_type,
        is_active: editingRule.is_active ?? true,
        period_days: editingRule.period_days || 0,
        message_template: editingRule.message_template || '',
        action_type: editingRule.action_type || 'CREATE_TASK',
      });

      setEditingRule(null);
      await loadRules();
      alert('Regra de automação salva com sucesso!');
    } catch (err: any) {
      alert('Erro ao salvar regra: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerEngine = async () => {
    setRefreshing(true);
    try {
      const result = await DB.runCrmAutomationEngineAsync(business.id);
      alert(
        `Motor de Automação executado!\n\n${result.opportunities.length} oportunidades qualificadas e ${result.tasks.length} tarefas sincronizadas.`
      );
    } catch (err: any) {
      alert('Erro ao executar motor de automação: ' + err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const insertVariable = (varName: string) => {
    if (!editingRule) return;
    setEditingRule({
      ...editingRule,
      message_template: (editingRule.message_template || '') + ` {{${varName}}}`,
    });
  };

  const getEventBadge = (eventType: CrmEventType) => {
    switch (eventType) {
      case 'CUSTOMER_AT_RISK':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900">EM RISCO (46-90d)</span>;
      case 'CUSTOMER_INACTIVE':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-900">INATIVO (&gt;90d)</span>;
      case 'CUSTOMER_HIGH_VALUE':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-100 text-purple-900">ALTO VALOR (VIP)</span>;
      case 'BIRTHDAY_APPROACHING':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-900">ANIVERSARIANTE</span>;
      case 'LOYALTY_REWARD_AVAILABLE':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900">RECOMPENSA FIDELIDADE</span>;
      case 'CUSTOMER_WITHOUT_FUTURE_APPOINTMENT':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-900">SEM PRÓXIMO AGENDAMENTO</span>;
      case 'APPOINTMENT_COMPLETED':
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-800">PÓS-ATENDIMENTO</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Control */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-purple-100 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <Settings className="w-6 h-6 text-purple-700" />
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Motor de Regras e Automações CRM</h2>
          </div>
          <p className="text-xs text-gray-500 font-medium mt-1 max-w-2xl">
            Configure as regras do ciclo de vida do cliente. O sistema detecta eventos em tempo real e gera tarefas/oportunidades recomendadas.
          </p>
        </div>

        <button
          onClick={handleTriggerEngine}
          disabled={refreshing}
          className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center space-x-2 shrink-0"
        >
          <Play className={`w-4 h-4 text-purple-300 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Executar Teste do Motor</span>
        </button>
      </div>

      {/* Rules List Grid */}
      {loading ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-purple-100 shadow-xs">
          <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-500 font-medium">Carregando regras de automação CRM...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`bg-white rounded-3xl border p-5 transition flex flex-col justify-between ${
                rule.is_active
                  ? 'border-purple-200 shadow-xs hover:border-purple-300'
                  : 'border-slate-200 bg-slate-50/50 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  {getEventBadge(rule.event_type)}

                  {/* Toggle Active Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.is_active}
                      onChange={() => handleToggleStatus(rule.id, rule.is_active)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-700"></div>
                  </label>
                </div>

                <h3 className="text-base font-extrabold text-gray-900 mb-1">{rule.name}</h3>
                {rule.period_days > 0 && (
                  <span className="inline-block text-[10px] font-bold text-gray-500 bg-slate-100 px-2 py-0.5 rounded-md mb-2">
                    Período: {rule.period_days} dias
                  </span>
                )}

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 mt-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                    Template de Mensagem:
                  </span>
                  <p className="text-xs text-gray-700 italic line-clamp-3">
                    "{rule.message_template || 'Sem template configurado'}"
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4 text-xs font-semibold">
                <span className="text-gray-500 text-[11px]">
                  Ação: <strong className="text-gray-800">{rule.action_type === 'CREATE_TASK' ? 'Criar Tarefa CRM' : 'Recomendar Ação'}</strong>
                </span>

                <button
                  onClick={() => setEditingRule(rule)}
                  className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-xl transition flex items-center space-x-1.5 font-bold"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar Regra</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Rule Modal */}
      {editingRule && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-purple-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <h3 className="text-lg font-black text-gray-900">Editar Regra de Automação</h3>
              <button
                onClick={() => setEditingRule(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome da Regra</label>
                <input
                  type="text"
                  required
                  value={editingRule.name || ''}
                  onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Período de Disparo (Dias)</label>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={editingRule.period_days || 0}
                    onChange={(e) =>
                      setEditingRule({ ...editingRule, period_days: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tipo de Ação</label>
                  <select
                    value={editingRule.action_type || 'CREATE_TASK'}
                    onChange={(e) =>
                      setEditingRule({ ...editingRule, action_type: e.target.value as CrmActionType })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none"
                  >
                    <option value="CREATE_TASK">Criar Tarefa no CRM</option>
                    <option value="RECOMMEND_ACTION">Apenas Recomendar</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-700">Template da Mensagem</label>
                  <div className="flex items-center space-x-1">
                    <span className="text-[10px] text-gray-400 font-bold">Variáveis:</span>
                    <button
                      type="button"
                      onClick={() => insertVariable('nome')}
                      className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-extrabold hover:bg-purple-200"
                    >
                      +nome
                    </button>
                    <button
                      type="button"
                      onClick={() => insertVariable('empresa')}
                      className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-extrabold hover:bg-purple-200"
                    >
                      +empresa
                    </button>
                    <button
                      type="button"
                      onClick={() => insertVariable('servico')}
                      className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-extrabold hover:bg-purple-200"
                    >
                      +servico
                    </button>
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={editingRule.message_template || ''}
                  onChange={(e) => setEditingRule({ ...editingRule, message_template: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 font-sans"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
