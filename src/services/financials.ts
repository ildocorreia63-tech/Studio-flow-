import { DB } from './db';
import { PaymentMethod } from '../types';

export type PeriodFilter =
  | 'hoje'
  | 'ontem'
  | '7dias'
  | '30dias'
  | 'este_mes'
  | 'mes_anterior'
  | 'custom';

export interface PaymentMethodBreakdown {
  method: string;
  label: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface ProfessionalPerformance {
  professional_id: string;
  professional_name: string;
  total_appointments: number;
  gross_revenue: number;
  commission_amount: number;
  net_revenue: number;
}

export interface ServicePerformance {
  service_name: string;
  quantity: number;
  total_revenue: number;
  average_ticket: number;
}

export interface ExpenseCategorySummary {
  category: string;
  amount: number;
  percentage: number;
}

export interface FinancialSummary {
  periodLabel: string;
  startDate: string;
  endDate: string;

  // Revenue & Sales
  grossRevenue: number;
  discounts: number;
  netRevenue: number;
  receivedAmount: number;
  validSalesCount: number;
  averageTicket: number;

  // Payment Methods
  paymentMethods: PaymentMethodBreakdown[];

  // Expenses & DRE
  totalExpenses: number;
  expensesByCategory: ExpenseCategorySummary[];
  totalCommissions: number;
  commissionsPaid: number;
  commissionsPending: number;
  operationalResult: number;

  // Performance
  professionalPerformance: ProfessionalPerformance[];
  servicePerformance: ServicePerformance[];

  // Clients
  clientsAttended: number;
  newClients: number;

  // Comparison
  prevNetRevenue: number | null;
  revenueVariationPercent: number | null;
}

export function getDatesFromPeriod(
  period: PeriodFilter,
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string; label: string } {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  if (period === 'hoje') {
    return { startDate: todayStr, endDate: todayStr, label: 'Hoje' };
  }
  if (period === 'ontem') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);
    return { startDate: yStr, endDate: yStr, label: 'Ontem' };
  }
  if (period === '7dias') {
    const d7 = new Date(now);
    d7.setDate(d7.getDate() - 6);
    return { startDate: d7.toISOString().slice(0, 10), endDate: todayStr, label: 'Últimos 7 dias' };
  }
  if (period === '30dias') {
    const d30 = new Date(now);
    d30.setDate(d30.getDate() - 29);
    return { startDate: d30.toISOString().slice(0, 10), endDate: todayStr, label: 'Últimos 30 dias' };
  }
  if (period === 'este_mes') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    return { startDate: startOfMonth, endDate: todayStr, label: 'Este Mês' };
  }
  if (period === 'mes_anterior') {
    const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
    const endPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
    return { startDate: startPrevMonth, endDate: endPrevMonth, label: 'Mês Anterior' };
  }
  if (period === 'custom' && customStart && customEnd) {
    return { startDate: customStart, endDate: customEnd, label: `Período (${customStart} a ${customEnd})` };
  }
  return { startDate: todayStr, endDate: todayStr, label: 'Hoje' };
}

export async function getFinancialSummaryAsync(
  businessId: string,
  period: PeriodFilter,
  customStart?: string,
  customEnd?: string
): Promise<FinancialSummary> {
  const { startDate, endDate, label } = getDatesFromPeriod(period, customStart, customEnd);

  // Calculate Previous Period Dates for comparison
  const startTs = new Date(startDate + 'T00:00:00').getTime();
  const endTs = new Date(endDate + 'T00:00:00').getTime();
  const durationMs = Math.max(24 * 60 * 60 * 1000, endTs - startTs + 24 * 60 * 60 * 1000);
  const prevEndTs = startTs - 24 * 60 * 60 * 1000;
  const prevStartTs = prevEndTs - durationMs + 24 * 60 * 60 * 1000;

  const prevStartDate = new Date(prevStartTs).toISOString().slice(0, 10);
  const prevEndDate = new Date(prevEndTs).toISOString().slice(0, 10);

  // Fetch Async Data in parallel
  const [sales, expenses, commissions, professionals, clients, prevSales] = await Promise.all([
    DB.getSalesAsync(businessId, startDate, endDate),
    DB.getExpensesAsync(businessId, startDate, endDate),
    DB.getCommissionsAsync(businessId),
    DB.getProfessionalsAsync(businessId),
    DB.getClientsAsync(businessId),
    DB.getSalesAsync(businessId, prevStartDate, prevEndDate),
  ]);

  // 1. Sales & Revenue Calculation (excluding canceled sales)
  const validSales = sales.filter((s) => s.status !== 'CANCELADO');
  const grossRevenue = validSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const discounts = validSales.reduce((sum, s) => sum + Number(s.discount || 0), 0);
  const netRevenue = Math.max(0, grossRevenue - discounts);
  const validSalesCount = validSales.length;
  const averageTicket = validSalesCount > 0 ? netRevenue / validSalesCount : 0;

  // 2. Payments & Methods Breakdown (Received amount)
  let receivedAmount = 0;
  const methodsMap: Record<string, { amount: number; count: number }> = {
    pix: { amount: 0, count: 0 },
    dinheiro: { amount: 0, count: 0 },
    debito: { amount: 0, count: 0 },
    credito: { amount: 0, count: 0 },
    outros: { amount: 0, count: 0 },
  };

  validSales.forEach((s) => {
    if (s.payments && s.payments.length > 0) {
      s.payments.forEach((p) => {
        const amt = Number(p.amount || 0);
        receivedAmount += amt;
        const m = (p.method || 'pix').toLowerCase();
        if (m.includes('pix')) {
          methodsMap.pix.amount += amt;
          methodsMap.pix.count++;
        } else if (m.includes('dinheiro') || m.includes('cash')) {
          methodsMap.dinheiro.amount += amt;
          methodsMap.dinheiro.count++;
        } else if (m.includes('debito') || m.includes('débito')) {
          methodsMap.debito.amount += amt;
          methodsMap.debito.count++;
        } else if (m.includes('credito') || m.includes('crédito')) {
          methodsMap.credito.amount += amt;
          methodsMap.credito.count++;
        } else {
          methodsMap.outros.amount += amt;
          methodsMap.outros.count++;
        }
      });
    } else {
      const amt = Number(s.final_amount || 0);
      receivedAmount += amt;
      const m = (s.payment_method || 'pix').toLowerCase();
      if (m.includes('pix')) {
        methodsMap.pix.amount += amt;
        methodsMap.pix.count++;
      } else if (m.includes('dinheiro') || m.includes('cash')) {
        methodsMap.dinheiro.amount += amt;
        methodsMap.dinheiro.count++;
      } else if (m.includes('debito') || m.includes('débito')) {
        methodsMap.debito.amount += amt;
        methodsMap.debito.count++;
      } else if (m.includes('credito') || m.includes('crédito')) {
        methodsMap.credito.amount += amt;
        methodsMap.credito.count++;
      } else {
        methodsMap.outros.amount += amt;
        methodsMap.outros.count++;
      }
    }
  });

  const paymentMethods: PaymentMethodBreakdown[] = [
    {
      method: 'pix',
      label: 'PIX',
      amount: methodsMap.pix.amount,
      percentage: receivedAmount > 0 ? (methodsMap.pix.amount / receivedAmount) * 100 : 0,
      count: methodsMap.pix.count,
    },
    {
      method: 'dinheiro',
      label: 'Dinheiro',
      amount: methodsMap.dinheiro.amount,
      percentage: receivedAmount > 0 ? (methodsMap.dinheiro.amount / receivedAmount) * 100 : 0,
      count: methodsMap.dinheiro.count,
    },
    {
      method: 'debito',
      label: 'Cartão de Débito',
      amount: methodsMap.debito.amount,
      percentage: receivedAmount > 0 ? (methodsMap.debito.amount / receivedAmount) * 100 : 0,
      count: methodsMap.debito.count,
    },
    {
      method: 'credito',
      label: 'Cartão de Crédito',
      amount: methodsMap.credito.amount,
      percentage: receivedAmount > 0 ? (methodsMap.credito.amount / receivedAmount) * 100 : 0,
      count: methodsMap.credito.count,
    },
    {
      method: 'outros',
      label: 'Outros Métodos',
      amount: methodsMap.outros.amount,
      percentage: receivedAmount > 0 ? (methodsMap.outros.amount / receivedAmount) * 100 : 0,
      count: methodsMap.outros.count,
    },
  ];

  // 3. Expenses & Categories
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const catMap: Record<string, number> = {};
  expenses.forEach((e) => {
    const cat = e.category || 'Outros';
    catMap[cat] = (catMap[cat] || 0) + Number(e.amount || 0);
  });

  const expensesByCategory: ExpenseCategorySummary[] = Object.entries(catMap).map(([category, amount]) => ({
    category,
    amount,
    percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
  }));

  // 4. Commissions
  const commissionsInPeriod = commissions.filter((c) => {
    const d = c.date || (c.created_at ? c.created_at.slice(0, 10) : '');
    return d >= startDate && d <= endDate;
  });

  const totalCommissions = commissionsInPeriod.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const commissionsPaid = commissionsInPeriod
    .filter((c) => c.status === 'PAGO')
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const commissionsPending = commissionsInPeriod
    .filter((c) => c.status === 'PENDENTE')
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);

  // 5. DRE Operational Result
  const operationalResult = netRevenue - totalExpenses - totalCommissions;

  // 6. Professional Performance
  const profPerformanceMap: Record<string, ProfessionalPerformance> = {};

  professionals.forEach((p) => {
    profPerformanceMap[p.id] = {
      professional_id: p.id,
      professional_name: p.name,
      total_appointments: 0,
      gross_revenue: 0,
      commission_amount: 0,
      net_revenue: 0,
    };
  });

  validSales.forEach((s) => {
    if (s.professional_id && profPerformanceMap[s.professional_id]) {
      const p = profPerformanceMap[s.professional_id];
      p.total_appointments += 1;
      p.gross_revenue += Number(s.final_amount || s.total_amount || 0);
    }
  });

  commissionsInPeriod.forEach((c) => {
    if (c.professional_id && profPerformanceMap[c.professional_id]) {
      profPerformanceMap[c.professional_id].commission_amount += Number(c.amount || 0);
    }
  });

  const professionalPerformance = Object.values(profPerformanceMap)
    .map((p) => ({
      ...p,
      net_revenue: p.gross_revenue - p.commission_amount,
    }))
    .sort((a, b) => b.gross_revenue - a.gross_revenue);

  // 7. Service Performance
  const serviceMap: Record<string, { quantity: number; total_revenue: number }> = {};

  validSales.forEach((s) => {
    (s.items || []).forEach((item) => {
      if (item.item_type === 'service' || !item.item_type) {
        const name = item.name || 'Serviço';
        if (!serviceMap[name]) {
          serviceMap[name] = { quantity: 0, total_revenue: 0 };
        }
        serviceMap[name].quantity += Number(item.quantity || 1);
        serviceMap[name].total_revenue += Number(item.total_price || item.unit_price * item.quantity || 0);
      }
    });
  });

  const servicePerformance: ServicePerformance[] = Object.entries(serviceMap)
    .map(([service_name, val]) => ({
      service_name,
      quantity: val.quantity,
      total_revenue: val.total_revenue,
      average_ticket: val.quantity > 0 ? val.total_revenue / val.quantity : 0,
    }))
    .sort((a, b) => b.total_revenue - a.total_revenue);

  // 8. Clients Metrics
  const uniqueClientsAttended = new Set(validSales.map((s) => s.client_id).filter(Boolean)).size;
  const newClients = clients.filter((c) => {
    const createdDate = (c.created_at || '').slice(0, 10);
    return createdDate >= startDate && createdDate <= endDate;
  }).length;

  // 9. Period Comparison
  const prevValidSales = prevSales.filter((s) => s.status !== 'CANCELADO');
  const prevGross = prevValidSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const prevDisc = prevValidSales.reduce((sum, s) => sum + Number(s.discount || 0), 0);
  const prevNetRevenue = Math.max(0, prevGross - prevDisc);

  const revenueVariationPercent =
    prevNetRevenue > 0 ? ((netRevenue - prevNetRevenue) / prevNetRevenue) * 100 : null;

  return {
    periodLabel: label,
    startDate,
    endDate,

    grossRevenue,
    discounts,
    netRevenue,
    receivedAmount,
    validSalesCount,
    averageTicket,

    paymentMethods,

    totalExpenses,
    expensesByCategory,
    totalCommissions,
    commissionsPaid,
    commissionsPending,
    operationalResult,

    professionalPerformance,
    servicePerformance,

    clientsAttended: uniqueClientsAttended,
    newClients,

    prevNetRevenue: prevNetRevenue > 0 ? prevNetRevenue : null,
    revenueVariationPercent,
  };
}
