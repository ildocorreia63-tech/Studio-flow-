/**
 * STUDIOFLOW V1.0 - FASE 5B Marketing & Campaign Engine
 */

import {
  Business,
  MarketingCampaign,
  CampaignSegment,
  CampaignStatus,
  CampaignType,
} from '../types';
import { ClientCrmSummary } from './crm';

/**
 * Checks if a client is eligible for a birthday campaign based on birth_date
 * Handles YYYY-MM-DD or DD/MM/YYYY formats
 */
export function isClientBirthdayEligible(birthDateStr?: string, advanceDays: number = 0): boolean {
  if (!birthDateStr) return false;

  let month: number, day: number;

  if (birthDateStr.includes('/')) {
    const parts = birthDateStr.split('/');
    if (parts.length < 2) return false;
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
  } else {
    const parts = birthDateStr.split('T')[0].split('-');
    if (parts.length < 3) return false;
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  }

  if (isNaN(month) || isNaN(day) || month < 0 || month > 11 || day < 1 || day > 31) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check today up to today + advanceDays
  for (let d = 0; d <= Math.max(0, advanceDays); d++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + d);

    if (checkDate.getMonth() === month && checkDate.getDate() === day) {
      return true;
    }
  }

  return false;
}

/**
 * Filters CRM summaries based on a campaign's target segment
 */
export function filterClientsBySegment(
  summaries: ClientCrmSummary[],
  segment: CampaignSegment,
  advanceDays: number = 0
): ClientCrmSummary[] {
  switch (segment) {
    case 'TODOS':
      return summaries;

    case 'NOVOS':
      return summaries.filter((s) => s.relationshipStatus === 'NOVO');

    case 'ATIVOS':
      return summaries.filter((s) => s.relationshipStatus === 'ATIVO');

    case 'EM_RISCO':
      return summaries.filter((s) => s.relationshipStatus === 'EM RISCO');

    case 'INATIVOS':
      return summaries.filter((s) => s.relationshipStatus === 'INATIVO');

    case 'NUNCA_VISITARAM':
      return summaries.filter((s) => s.relationshipStatus === 'NUNCA VISITOU');

    case 'ALTO_VALOR':
      return summaries.filter((s) => s.isHighValue);

    case 'ANIVERSARIANTES':
      return summaries.filter((s) => isClientBirthdayEligible(s.client.birth_date, advanceDays));

    default:
      return summaries;
  }
}

/**
 * Replaces message template variables with real client & business data
 * Variables: {{nome}}, {{telefone}}, {{empresa}}, {{data}}, {{servico}}
 */
export function renderMessageTemplate(
  template: string,
  summary: ClientCrmSummary,
  business: Business
): string {
  if (!template) return '';

  let rendered = template;

  const name = summary.client.name || 'Cliente';
  const phone = summary.client.whatsapp || summary.client.phone || '';
  const businessName = business.name || 'StudioFlow';

  let formattedLastVisit = 'hoje';
  if (summary.lastVisitDate) {
    const parts = summary.lastVisitDate.split('-');
    if (parts.length === 3) {
      formattedLastVisit = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }

  const topService =
    summary.topService && summary.topService !== 'Sem histórico'
      ? summary.topService
      : 'nossos serviços';

  rendered = rendered.replace(/\{\{\s*nome\s*\}\}/gi, name);
  rendered = rendered.replace(/\{\{\s*telefone\s*\}\}/gi, phone);
  rendered = rendered.replace(/\{\{\s*empresa\s*\}\}/gi, businessName);
  rendered = rendered.replace(/\{\{\s*data\s*\}\}/gi, formattedLastVisit);
  rendered = rendered.replace(/\{\{\s*servico\s*\}\}/gi, topService);

  return rendered;
}

/**
 * Generates a wa.me URL with clean phone number and URL-encoded message
 */
export function generateWhatsAppCampaignUrl(phoneStr: string, message: string): string {
  if (!phoneStr) return '#';

  let clean = phoneStr.replace(/\D/g, '');

  if (!clean) return '#';

  if (clean.length === 10 || clean.length === 11) {
    clean = '55' + clean;
  }

  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${clean}?text=${encodedMessage}`;
}

/**
 * Preset Message Templates for quick creation
 */
export const PRESET_MESSAGE_TEMPLATES = [
  {
    label: 'Reativação (Cliente Sumido)',
    text: 'Olá {{nome}}, sentimos sua falta na {{empresa}}! Preparamos uma condição especial para o seu próximo {{servico}}. Que tal agendar seu horário?',
  },
  {
    label: 'Parabéns Aniversariante',
    text: 'Feliz Aniversário, {{nome}}! 🎉 Toda a equipe da {{empresa}} deseja um dia fantástico. Venha comemorar conosco com um presente especial!',
  },
  {
    label: 'Agradecimento Cliente VIP',
    text: 'Olá {{nome}}, você é um cliente muito especial para a {{empresa}}! Para agradecer sua preferência, reservamos horários exclusivos para seu {{servico}} este mês.',
  },
  {
    label: 'Lembrete de Retorno',
    text: 'Olá {{nome}}, tudo bem? Já faz um tempo desde sua última visita na {{empresa}} em {{data}}. Que tal renovar seu {{servico}} esta semana?',
  },
];
