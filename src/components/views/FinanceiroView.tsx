import React, { useState, useEffect } from 'react';
import {
  PieChart,
  DollarSign,
  PlusCircle,
  TrendingUp,
  TrendingDown,
  Trash2,
  Edit2,
  X,
  Calendar,
  Filter,
  CreditCard,
  Users,
  Scissors,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { DB } from '../../services/db';
import {
  getFinancialSummaryAsync,
  FinancialSummary,
  PeriodFilter,
  getDatesFromPeriod,
} from '../../services/financials';
import { Business, Expense, ExpenseCategory } from '../../types';

interface FinanceiroViewProps {
  business: Business;
}

export const FinanceiroView: React.FC<FinanceiroViewProps> = ({ business }) => {
  const [period, setPeriod] = useState<PeriodFilter>('30dias');
  const [customStart, setCustomStart] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [customEnd, setCustomEnd] = useState<string>(new Date().toISOString().slice(0, 10));

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Modal Expense State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState<ExpenseCategory>('Aluguel');
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState<number>(0);
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newStatus, setNewStatus] = useState<'PAGO' | 'PENDENTE'>('PAGO');

  const expenseCategories: ExpenseCategory[] = [
    'Aluguel',
    'Água',
    'Energia',
    'Internet',
    'Produtos',
    'Salários',
    'Marketing',
    'Impostos',
    'Outros',
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const dates = getDatesFromPeriod(period, customStart, customEnd);
      const [sumData, expList] = await Promise.all([
        getFinancialSummaryAsync(business.id, period, customStart, customEnd),
        DB.getExpensesAsync(business.id, dates.startDate, dates.endDate),
      ]);
      setSummary(sumData);
      setExpenses(expList);
    } catch (err) {
      console.error('Erro ao carregar módulo financeiro:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [business.id, period, customStart, customEnd]);

  const handleOpenNewExpense = () => {
    setEditingExpenseId(null);
    setNewCategory('Aluguel');
    setNewDesc('');
    setNewAmount(0);
    setNewDate(new Date().toISOString().slice(0, 10));
    setNewStatus('PAGO');
    setIsModalOpen(true);
  };

  const handleOpenEditExpense = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setNewCategory(exp.category);
    setNewDesc(exp.description);
    setNewAmount(exp.amount);
    setNewDate(exp.date);
    setNewStatus(exp.status);
    setIsModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc || newAmount <= 0) return;

    await DB.saveExpenseAsync({
      id: editingExpenseId || undefined,
      business_id: business.id,
      category: newCategory,
      description: newDesc,
      amount: newAmount,
      date: newDate,
      status: newStatus,
    });

    setIsModalOpen(false);
    await loadData();
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta despesa?')) return;
    await DB.deleteExpenseAsync(business.id, id);
    await loadData();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-purple-100 text-purple-800 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-gray-900">Financeiro & DRE Operacional</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Gestão financeira real baseada em vendas, pagamentos, despesas e comissões.
          </p>
        </div>

        <button
          onClick={handleOpenNewExpense}
          className="bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 px-5 rounded-xl text-xs shadow-md flex items-center space-x-2 transition shrink-0 self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ CADASTRAR DESPESA</span>
        </button>
      </div>

      {/* Global Period Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-gray-700">
          <Filter className="w-4 h-4 text-purple-700" />
          <span>FILTRAR POR PERÍODO</span>
          {summary && (
            <span className="text-gray-400 font-normal">
              ({summary.startDate} até {summary.endDate})
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'hoje', label: 'Hoje' },
              { id: 'ontem', label: 'Ontem' },
              { id: '7dias', label: 'Últimos 7 dias' },
              { id: '30dias', label: 'Últimos 30 dias' },
              { id: 'este_mes', label: 'Este Mês' },
              { id: 'mes_anterior', label: 'Mês Anterior' },
              { id: 'custom', label: 'Personalizado' },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                period === p.id
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 text-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="p-2 border rounded-xl font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="p-2 border rounded-xl font-medium"
              />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-3xl border text-center text-gray-400 font-medium text-xs space-y-2">
          <div className="w-6 h-6 border-2 border-purple-700 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p>Calculando indicadores financeiros...</p>
        </div>
      ) : !summary ? (
        <div className="bg-white p-8 rounded-3xl border text-center text-rose-500 text-xs">
          Erro ao carregar dados financeiros.
        </div>
      ) : (
        <>
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Faturamento Bruto */}
            <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Faturamento Bruto
                </span>
                <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-gray-900">{formatCurrency(summary.grossRevenue)}</p>
              <div className="text-[11px] text-gray-500 flex justify-between">
                <span>{summary.validSalesCount} vendas registradas</span>
                {summary.discounts > 0 && (
                  <span className="text-rose-600 font-semibold">Desc: -{formatCurrency(summary.discounts)}</span>
                )}
              </div>
            </div>

            {/* Efetivamente Recebido */}
            <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Valor Recebido (Pago)
                </span>
                <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-blue-900">{formatCurrency(summary.receivedAmount)}</p>
              <p className="text-[11px] text-gray-500">
                Pagamentos liquidados no período
              </p>
            </div>

            {/* Despesas Operacionais */}
            <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Despesas Totais
                </span>
                <span className="p-1.5 bg-rose-50 text-rose-700 rounded-lg">
                  <TrendingDown className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-black text-rose-600">{formatCurrency(summary.totalExpenses)}</p>
              <p className="text-[11px] text-gray-500">
                {expenses.length} lançamentos de despesas
              </p>
            </div>

            {/* Resultado Operacional */}
            <div
              className={`p-5 rounded-3xl shadow-md space-y-2 ${
                summary.operationalResult >= 0
                  ? 'bg-gradient-to-br from-purple-950 to-indigo-900 text-white'
                  : 'bg-gradient-to-br from-rose-950 to-rose-900 text-white'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-purple-200 uppercase tracking-wider">
                  Resultado Operacional
                </span>
                <DollarSign className="w-5 h-5 text-purple-200" />
              </div>
              <p className="text-2xl font-black text-white">{formatCurrency(summary.operationalResult)}</p>

              <div className="flex items-center justify-between text-[11px] text-purple-200 font-medium">
                <span>Comissões: -{formatCurrency(summary.totalCommissions)}</span>
                {summary.revenueVariationPercent !== null && (
                  <span
                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      summary.revenueVariationPercent >= 0
                        ? 'bg-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/30 text-rose-300'
                    }`}
                  >
                    {summary.revenueVariationPercent >= 0 ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {summary.revenueVariationPercent >= 0 ? '+' : ''}
                    {summary.revenueVariationPercent.toFixed(1)}% vs. anterior
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* DRE Simplificado + Formas de Pagamento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* DRE Operacional Card */}
            <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-purple-700" />
                  <h3 className="font-extrabold text-gray-900 text-base">Demonstração do Resultado (DRE)</h3>
                </div>
                <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2.5 py-1 rounded-full uppercase">
                  {summary.periodLabel}
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1 font-bold text-gray-900 border-b border-gray-100">
                  <span>(+) RECEITA BRUTA DAS VENDAS</span>
                  <span className="text-emerald-700">{formatCurrency(summary.grossRevenue)}</span>
                </div>

                <div className="flex justify-between items-center py-1 text-gray-600 pl-3">
                  <span>(-) Descontos Concedidos</span>
                  <span className="text-rose-600">-{formatCurrency(summary.discounts)}</span>
                </div>

                <div className="flex justify-between items-center py-1.5 font-black text-gray-900 bg-gray-50 px-3 rounded-xl">
                  <span>(=) RECEITA LÍQUIDA DE VENDAS</span>
                  <span className="text-emerald-800">{formatCurrency(summary.netRevenue)}</span>
                </div>

                <div className="flex justify-between items-center py-1 text-gray-600 pl-3">
                  <span>(-) Despesas Operacionais</span>
                  <span className="text-rose-600">-{formatCurrency(summary.totalExpenses)}</span>
                </div>

                <div className="flex justify-between items-center py-1 text-gray-600 pl-3">
                  <span>(-) Comissões dos Profissionais</span>
                  <span className="text-rose-600">-{formatCurrency(summary.totalCommissions)}</span>
                </div>

                <div className="flex justify-between items-center py-3 font-black text-sm bg-purple-900 text-white px-4 rounded-2xl shadow-xs mt-3">
                  <span>(=) RESULTADO OPERACIONAL</span>
                  <span
                    className={
                      summary.operationalResult >= 0 ? 'text-emerald-300' : 'text-rose-300'
                    }
                  >
                    {formatCurrency(summary.operationalResult)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 text-center text-xs">
                <div className="p-3 bg-gray-50 rounded-2xl border">
                  <span className="block text-[10px] text-gray-500 font-bold uppercase">
                    Ticket Médio
                  </span>
                  <span className="font-black text-purple-900 text-sm">
                    {formatCurrency(summary.averageTicket)}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-2xl border">
                  <span className="block text-[10px] text-gray-500 font-bold uppercase">
                    Comissões Pendentes
                  </span>
                  <span className="font-black text-amber-600 text-sm">
                    {formatCurrency(summary.commissionsPending)}
                  </span>
                </div>
              </div>
            </div>

            {/* Formas de Pagamento Breakdown */}
            <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-purple-700" />
                  <h3 className="font-extrabold text-gray-900 text-base">Recebimentos por Forma de Pagamento</h3>
                </div>
                <span className="text-xs font-bold text-gray-500">
                  Total: {formatCurrency(summary.receivedAmount)}
                </span>
              </div>

              <div className="space-y-3">
                {summary.paymentMethods.map((pm) => (
                  <div key={pm.method} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-gray-800">{pm.label}</span>
                      <span className="text-gray-900">
                        {formatCurrency(pm.amount)}{' '}
                        <span className="text-gray-400 font-normal">
                          ({pm.percentage.toFixed(1)}% • {pm.count}x)
                        </span>
                      </span>
                    </div>

                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          pm.method === 'pix'
                            ? 'bg-emerald-500'
                            : pm.method === 'dinheiro'
                            ? 'bg-blue-500'
                            : pm.method === 'debito'
                            ? 'bg-indigo-500'
                            : pm.method === 'credito'
                            ? 'bg-purple-600'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, pm.percentage)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-2xl text-[11px] text-blue-900 font-medium">
                💡 <strong>Dica de Caixa:</strong> O faturamento refere-se ao valor total das vendas, enquanto os recebimentos listados acima representam os pagamentos liquidados.
              </div>
            </div>
          </div>

          {/* Desempenho por Profissional & Serviço */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profissionais */}
            <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-purple-700" />
                  <h3 className="font-extrabold text-gray-900 text-sm">Receita por Profissional</h3>
                </div>
                <span className="text-[10px] text-gray-400 font-bold uppercase">Ordenado por faturamento</span>
              </div>

              <div className="divide-y divide-gray-100 text-xs">
                {summary.professionalPerformance.length === 0 ? (
                  <div className="p-6 text-center text-gray-400">Nenhum profissional no período.</div>
                ) : (
                  summary.professionalPerformance.map((prof) => (
                    <div key={prof.professional_id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{prof.professional_name}</p>
                        <p className="text-gray-500 text-[11px]">
                          {prof.total_appointments} atendimentos • Comissões: {formatCurrency(prof.commission_amount)}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-emerald-600 text-sm block">
                          {formatCurrency(prof.gross_revenue)}
                        </span>
                        <span className="text-[10px] text-purple-900 font-semibold block">
                          Líquido loja: {formatCurrency(prof.net_revenue)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Serviços */}
            <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Scissors className="w-4 h-4 text-purple-700" />
                  <h3 className="font-extrabold text-gray-900 text-sm">Receita por Serviço</h3>
                </div>
                <span className="text-[10px] text-gray-400 font-bold uppercase">Ordenado por receita</span>
              </div>

              <div className="divide-y divide-gray-100 text-xs">
                {summary.servicePerformance.length === 0 ? (
                  <div className="p-6 text-center text-gray-400">Nenhum serviço realizado no período.</div>
                ) : (
                  summary.servicePerformance.map((serv) => (
                    <div key={serv.service_name} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{serv.service_name}</p>
                        <p className="text-gray-500 text-[11px]">
                          {serv.quantity} realizações • Ticket Médio: {formatCurrency(serv.average_ticket)}
                        </p>
                      </div>

                      <span className="font-black text-purple-950 text-sm">
                        {formatCurrency(serv.total_revenue)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Clientes & Atendimentos Indicator */}
            <div className="lg:col-span-2 bg-gradient-to-r from-purple-900 to-indigo-900 p-6 rounded-3xl text-white shadow-md flex flex-wrap items-center justify-between gap-6">
              <div className="space-y-1">
                <h4 className="font-extrabold text-base text-white">Indicadores de Base de Clientes</h4>
                <p className="text-xs text-purple-200">
                  Volume de atendimentos realizados e atração de novos clientes no período ({summary.periodLabel}).
                </p>
              </div>

              <div className="flex items-center space-x-8 text-center">
                <div>
                  <span className="block text-[10px] font-bold text-purple-300 uppercase">Clientes Atendidos</span>
                  <span className="text-2xl font-black text-white">{summary.clientsAttended}</span>
                </div>

                <div className="h-8 w-px bg-purple-700"></div>

                <div>
                  <span className="block text-[10px] font-bold text-amber-300 uppercase">Novos Clientes Cadastrados</span>
                  <span className="text-2xl font-black text-amber-300">{summary.newClients}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Expenses Table (CRUD) */}
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-gray-900 text-base">Despesas e Custos Operacionais</h3>
                <p className="text-xs text-gray-500">Lançamentos cadastrados no período selecionado</p>
              </div>

              <button
                onClick={handleOpenNewExpense}
                className="bg-purple-700 hover:bg-purple-800 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-xs flex items-center space-x-2 transition self-start sm:self-auto"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ NOVA DESPESA</span>
              </button>
            </div>

            <div className="divide-y divide-gray-100 text-xs">
              {expenses.length === 0 ? (
                <div className="p-8 text-center text-gray-400">Nenhuma despesa registrada para este período.</div>
              ) : (
                expenses.map((exp) => (
                  <div key={exp.id} className="p-4 hover:bg-gray-50 transition flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-gray-900">{exp.description}</span>
                        <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full uppercase">
                          {exp.category}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            exp.status === 'PAGO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {exp.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500">Data: {exp.date}</p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="font-black text-rose-600 text-sm">
                        -{formatCurrency(exp.amount)}
                      </span>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenEditExpense(exp)}
                          className="p-1.5 text-gray-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition"
                          title="Editar Despesa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Excluir Despesa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Expense Modal (Create/Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-lg text-gray-900">
                {editingExpenseId ? 'Editar Despesa' : 'Cadastrar Nova Despesa'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Categoria *</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as ExpenseCategory)}
                  className="w-full p-2.5 border rounded-xl text-xs font-bold"
                >
                  {expenseCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">Descrição *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aluguel da loja ref mês atual"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">Valor (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min={0.01}
                  value={newAmount || ''}
                  onChange={(e) => setNewAmount(Number(e.target.value))}
                  className="w-full p-2.5 border rounded-xl text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full p-2.5 border rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase mb-1">Status *</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as 'PAGO' | 'PENDENTE')}
                    className="w-full p-2.5 border rounded-xl text-xs font-bold"
                  >
                    <option value="PAGO">Pago</option>
                    <option value="PENDENTE">Pendente</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md hover:bg-purple-800"
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
