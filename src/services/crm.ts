/**
 * STUDIOFLOW V1.0 - FASE 5A CRM & Customer Retention Engine
 */

import { Client, Appointment, Sale, LoyaltyCard } from '../types';
import { DB } from './db';

// ==========================================
// THRESHOLD CONSTANTS
// ==========================================
export const NEW_CLIENT_MAX_APPOINTMENTS = 1;
export const ACTIVE_MAX_DAYS = 45;
export const AT_RISK_MAX_DAYS = 90;
export const HIGH_VALUE_CUSTOMER_THRESHOLD = 500;

export type RelationshipStatus = 'NOVO' | 'ATIVO' | 'EM RISCO' | 'INATIVO' | 'NUNCA VISITOU';

export type CrmFilterType =
  | 'TODOS'
  | 'NOVOS'
  | 'ATIVOS'
  | 'EM_RISCO'
  | 'INATIVOS'
  | 'NUNCA_VISITARAM'
  | 'ALTO_VALOR';

export type CrmSortType =
  | 'NAME_ASC'
  | 'LAST_VISIT_DESC'
  | 'SPENT_DESC'
  | 'FREQUENCY_DESC'
  | 'TICKET_DESC'
  | 'NEWEST';

export interface ClientCrmSummary {
  client: Client;
  lastVisitDate: string | null; // YYYY-MM-DD or null
  daysSinceLastVisit: number | null; // Days or null
  totalCompletedAppointments: number;
  totalSpent: number;
  validSalesCount: number;
  averageTicket: number;
  topService: string;
  topProfessional: string;
  relationshipStatus: RelationshipStatus;
  isHighValue: boolean;
  hasAnamnese: boolean;
  loyaltyStamps: number;
  loyaltyTotalRewards: number;
  loyaltyRewardAvailable: boolean;
  completedAppointmentsList: Appointment[];
  salesList: Sale[];
}

export interface CrmOverviewKpis {
  totalClients: number;
  newClients: number;
  activeClients: number;
  atRiskClients: number;
  inactiveClients: number;
  neverVisitedClients: number;
  highValueClients: number;
}

/**
 * Calculates days between a YYYY-MM-DD date and today
 */
export function calculateDaysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const visit = new Date(dateStr + 'T00:00:00');
  if (isNaN(visit.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - visit.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Loads and calculates CRM summaries for all clients in a business
 */
export async function loadCrmSummariesAsync(businessId: string): Promise<ClientCrmSummary[]> {
  const [clients, appointments, sales, loyaltyCards] = await Promise.all([
    DB.getClientsAsync(businessId),
    DB.getAppointmentsAsync(businessId),
    DB.getSalesAsync(businessId),
    DB.getLoyaltyCardsAsync(businessId),
  ]);

  const summaries: ClientCrmSummary[] = clients.map((client) => {
    // 1. Filter completed appointments for this client
    const clientCompletedAppointments = appointments.filter((a) => {
      const matchId = a.client_id === client.id;
      const matchName =
        a.client_name &&
        client.name &&
        a.client_name.trim().toLowerCase() === client.name.trim().toLowerCase();
      const isCompleted = a.status === 'CONCLUÍDO' || a.status === ('COMPLETED' as any);
      return (matchId || matchName) && isCompleted;
    });

    // Sort completed appointments by date descending
    clientCompletedAppointments.sort((a, b) => {
      const dateA = `${a.date}T${a.start_time || '00:00'}`;
      const dateB = `${b.date}T${b.start_time || '00:00'}`;
      return dateB.localeCompare(dateA);
    });

    // 2. Last visit date & days since
    const lastVisitDate =
      clientCompletedAppointments.length > 0 ? clientCompletedAppointments[0].date : null;
    const daysSinceLastVisit = calculateDaysSince(lastVisitDate);

    // 3. Completed appointments count
    const totalCompletedAppointments = clientCompletedAppointments.length;

    // 4. Valid Sales for this client
    const clientSales = sales.filter((s) => {
      if (s.status === 'CANCELADO') return false;
      const matchId = s.client_id === client.id;
      const matchName =
        s.client_name &&
        client.name &&
        s.client_name.trim().toLowerCase() === client.name.trim().toLowerCase();
      return matchId || matchName;
    });

    const totalSpent = clientSales.reduce((acc, s) => acc + (s.final_amount || s.total_amount || 0), 0);
    const validSalesCount = clientSales.length;
    const averageTicket = validSalesCount > 0 ? totalSpent / validSalesCount : 0;

    // 5. Top Service
    const serviceCounts: Record<string, number> = {};
    clientCompletedAppointments.forEach((a) => {
      if (a.service_name) {
        serviceCounts[a.service_name] = (serviceCounts[a.service_name] || 0) + 1;
      }
    });
    clientSales.forEach((s) => {
      if (s.items) {
        s.items.forEach((item) => {
          if (item.name) {
            serviceCounts[item.name] = (serviceCounts[item.name] || 0) + (item.quantity || 1);
          }
        });
      }
    });

    let topService = 'Sem histórico';
    let maxServiceCount = 0;
    Object.entries(serviceCounts).forEach(([name, count]) => {
      if (count > maxServiceCount) {
        maxServiceCount = count;
        topService = name;
      }
    });

    // 6. Top Professional
    const profCounts: Record<string, number> = {};
    clientCompletedAppointments.forEach((a) => {
      if (a.professional_name) {
        profCounts[a.professional_name] = (profCounts[a.professional_name] || 0) + 1;
      }
    });

    let topProfessional = 'Sem histórico';
    let maxProfCount = 0;
    Object.entries(profCounts).forEach(([name, count]) => {
      if (count > maxProfCount) {
        maxProfCount = count;
        topProfessional = name;
      }
    });

    // 7. Relationship Status
    let relationshipStatus: RelationshipStatus = 'NUNCA VISITOU';

    if (totalCompletedAppointments === 0) {
      relationshipStatus = 'NUNCA VISITOU';
    } else if (daysSinceLastVisit !== null && daysSinceLastVisit <= ACTIVE_MAX_DAYS) {
      if (totalCompletedAppointments <= NEW_CLIENT_MAX_APPOINTMENTS) {
        relationshipStatus = 'NOVO';
      } else {
        relationshipStatus = 'ATIVO';
      }
    } else if (daysSinceLastVisit !== null && daysSinceLastVisit <= AT_RISK_MAX_DAYS) {
      relationshipStatus = 'EM RISCO';
    } else {
      relationshipStatus = 'INATIVO';
    }

    // 8. High Value Check
    const isHighValue = totalSpent >= HIGH_VALUE_CUSTOMER_THRESHOLD;

    // 9. Anamnese Check
    const anamnese = DB.getAnamnese(businessId, client.id);
    const hasAnamnese = !!(
      anamnese &&
      (anamnese.hair_type ||
        anamnese.chemical_history ||
        anamnese.allergies ||
        anamnese.preferences ||
        anamnese.skincare_concerns ||
        anamnese.notes)
    );

    // 10. Loyalty Info
    const loyaltyCard = loyaltyCards.find((c) => c.client_id === client.id);

    return {
      client,
      lastVisitDate,
      daysSinceLastVisit,
      totalCompletedAppointments,
      totalSpent,
      validSalesCount,
      averageTicket,
      topService,
      topProfessional,
      relationshipStatus,
      isHighValue,
      hasAnamnese,
      loyaltyStamps: loyaltyCard ? loyaltyCard.current_stamps : 0,
      loyaltyTotalRewards: loyaltyCard ? loyaltyCard.total_completed : 0,
      loyaltyRewardAvailable: loyaltyCard ? loyaltyCard.reward_available : false,
      completedAppointmentsList: clientCompletedAppointments,
      salesList: clientSales,
    };
  });

  return summaries;
}

/**
 * Filter CRM summaries by status tab & search term
 */
export function filterCrmSummaries(
  summaries: ClientCrmSummary[],
  filter: CrmFilterType,
  search: string
): ClientCrmSummary[] {
  let result = summaries;

  // Filter by Tab
  if (filter === 'NOVOS') {
    result = result.filter((s) => s.relationshipStatus === 'NOVO');
  } else if (filter === 'ATIVOS') {
    result = result.filter((s) => s.relationshipStatus === 'ATIVO');
  } else if (filter === 'EM_RISCO') {
    result = result.filter((s) => s.relationshipStatus === 'EM RISCO');
  } else if (filter === 'INATIVOS') {
    result = result.filter((s) => s.relationshipStatus === 'INATIVO');
  } else if (filter === 'NUNCA_VISITARAM') {
    result = result.filter((s) => s.relationshipStatus === 'NUNCA VISITOU');
  } else if (filter === 'ALTO_VALOR') {
    result = result.filter((s) => s.isHighValue);
  }

  // Filter by Search (Name, Phone, WhatsApp, Email)
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter((s) => {
      const c = s.client;
      return (
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.whatsapp && c.whatsapp.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
      );
    });
  }

  return result;
}

/**
 * Sort CRM summaries according to selected option
 */
export function sortCrmSummaries(
  summaries: ClientCrmSummary[],
  sort: CrmSortType
): ClientCrmSummary[] {
  const sorted = [...summaries];

  switch (sort) {
    case 'NAME_ASC':
      sorted.sort((a, b) => (a.client.name || '').localeCompare(b.client.name || ''));
      break;

    case 'LAST_VISIT_DESC':
      sorted.sort((a, b) => {
        if (!a.lastVisitDate) return 1;
        if (!b.lastVisitDate) return -1;
        return b.lastVisitDate.localeCompare(a.lastVisitDate);
      });
      break;

    case 'SPENT_DESC':
      sorted.sort((a, b) => b.totalSpent - a.totalSpent);
      break;

    case 'FREQUENCY_DESC':
      sorted.sort((a, b) => b.totalCompletedAppointments - a.totalCompletedAppointments);
      break;

    case 'TICKET_DESC':
      sorted.sort((a, b) => b.averageTicket - a.averageTicket);
      break;

    case 'NEWEST':
      sorted.sort((a, b) => (b.client.created_at || '').localeCompare(a.client.created_at || ''));
      break;

    default:
      break;
  }

  return sorted;
}

/**
 * Calculate KPI numbers from CRM summaries
 */
export function getCrmKpis(summaries: ClientCrmSummary[]): CrmOverviewKpis {
  return {
    totalClients: summaries.length,
    newClients: summaries.filter((s) => s.relationshipStatus === 'NOVO').length,
    activeClients: summaries.filter((s) => s.relationshipStatus === 'ATIVO').length,
    atRiskClients: summaries.filter((s) => s.relationshipStatus === 'EM RISCO').length,
    inactiveClients: summaries.filter((s) => s.relationshipStatus === 'INATIVO').length,
    neverVisitedClients: summaries.filter((s) => s.relationshipStatus === 'NUNCA VISITOU').length,
    highValueClients: summaries.filter((s) => s.isHighValue).length,
  };
}
