import React, { useState, useEffect } from 'react';
import { Download, Filter, FileSpreadsheet, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { DB } from '../../services/db';
import { PeriodFilter, getDatesFromPeriod } from '../../services/financials';
import { Business, Appointment, Sale, Expense } from '../../types';

interface RelatoriosViewProps {
  business: Business;
}

export const RelatoriosView: React.FC<RelatoriosViewProps> = ({ business }) => {
  const [period, setPeriod] = useState<PeriodFilter>('30dias');
  const [customStart, setCustomStart] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [customEnd, setCustomEnd] = useState<string>(new Date().toISOString().slice(0, 10));

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const dates = getDatesFromPeriod(period, customStart, customEnd);
      const [apts, salesData, expData] = await Promise.all([
        DB.getAppointmentsAsync(business.id),
        DB.getSalesAsync(business.id, dates.startDate, dates.endDate),
        DB.getExpensesAsync(business.id, dates.startDate, dates.endDate),
      ]);

      const filteredApts = apts.filter(
        (a) => a.date >= dates.startDate && a.date <= dates.endDate
      );

      setAppointments(filteredApts);
      setSales(salesData);
      setExpenses(expData);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [business.id, period, customStart, customEnd]);

  const validSales = sales.filter((s) => s.status !== 'CANCELADO');
  const grossRevenue = validSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const exportSalesCSV = () => {
    let csv = 'ID;Data;Cliente;Profissional;Subtotal;Desconto;Total Final;Forma Pagamento;Status\n';
    validSales.forEach((s) => {
      csv += `${s.id};${s.created_at ? s.created_at.slice(0, 10) : ''};"${s.client_name || ''}";"${s.professional_id || ''}";${s.total_amount};${s.discount};${s.final_amount};${s.payment_method};${s.status}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_vendas_${business.slug}_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAppointmentsCSV = () => {
    let csv = 'ID;Data;Horario;Cliente;Servico;Profissional;Valor;Status\n';
    appointments.forEach((a) => {
      csv += `${a.id};${a.date};${a.start_time};"${a.client_name}";"${a.service_name}";"${a.professional_name}";${a.price};${a.status}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_agendamentos_${business.slug}_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900">Relatórios & Exportação</h2>
          <p className="text-xs text-gray-500">Exporte dados operacionais e financeiros reais em formato CSV</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportSalesCSV}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md flex items-center space-x-2 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>EXPORTAR VENDAS (CSV)</span>
          </button>

          <button
            onClick={exportAppointmentsCSV}
            className="bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md flex items-center space-x-2 transition"
          >
            <Download className="w-4 h-4" />
            <span>EXPORTAR AGENDAMENTOS</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-gray-700">
          <Filter className="w-4 h-4 text-purple-700" />
          <span>FILTRAR PERÍODO DO RELATÓRIO</span>
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
        <div className="bg-white p-12 rounded-3xl border text-center text-gray-400 font-medium text-xs">
          Carregando relatórios do período...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
            <span className="text-xs font-bold text-gray-500 uppercase">Agendamentos no Período</span>
            <p className="text-2xl font-black text-gray-900">{appointments.length}</p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
            <span className="text-xs font-bold text-gray-500 uppercase">Vendas Realizadas</span>
            <p className="text-2xl font-black text-emerald-600">{validSales.length}</p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
            <span className="text-xs font-bold text-gray-500 uppercase">Faturamento Bruto</span>
            <p className="text-2xl font-black text-purple-900">R$ {grossRevenue.toFixed(2)}</p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
            <span className="text-xs font-bold text-gray-500 uppercase">Despesas Lançadas</span>
            <p className="text-2xl font-black text-rose-600">R$ {totalExpenses.toFixed(2)}</p>
          </div>
        </div>
      )}
    </div>
  );
};
