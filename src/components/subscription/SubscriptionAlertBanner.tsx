import React from 'react';
import { AlertTriangle, Clock, ArrowRight, ShieldAlert } from 'lucide-react';
import { CompanySubscription, UsageStats } from '../../types';
import { PLANS } from '../../services/subscription';

interface SubscriptionAlertBannerProps {
  subscription: CompanySubscription | null;
  usage: UsageStats | null;
  onNavigateToAssinatura: () => void;
}

export const SubscriptionAlertBanner: React.FC<SubscriptionAlertBannerProps> = ({
  subscription,
  usage,
  onNavigateToAssinatura,
}) => {
  if (!subscription || subscription.expires_at === null) return null;

  const now = Date.now();

  // 1. Check EXPIRED or SUSPENDED status
  if (subscription.status === 'EXPIRED') {
    return (
      <div className="bg-rose-600 text-white px-4 py-3 rounded-2xl mb-4 shadow-sm flex items-center justify-between text-xs font-medium animate-in fade-in">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-200" />
          <span>
            <strong>Assinatura Expirada:</strong> Seu período de uso terminou. Faça upgrade do seu plano para continuar utilizando todos os recursos sem interrupções.
          </span>
        </div>
        <button
          onClick={onNavigateToAssinatura}
          className="ml-3 shrink-0 bg-white text-rose-700 px-3 py-1.5 rounded-xl font-bold hover:bg-rose-50 transition text-xs flex items-center space-x-1"
        >
          <span>Renovar Plano</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  if (subscription.status === 'SUSPENDED') {
    return (
      <div className="bg-amber-600 text-white px-4 py-3 rounded-2xl mb-4 shadow-sm flex items-center justify-between text-xs font-medium animate-in fade-in">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-200" />
          <span>
            <strong>Assinatura Suspensa:</strong> Alguns recursos avançados foram temporariamente pausados. Seus dados permanecem 100% seguros.
          </span>
        </div>
        <button
          onClick={onNavigateToAssinatura}
          className="ml-3 shrink-0 bg-white text-amber-800 px-3 py-1.5 rounded-xl font-bold hover:bg-amber-50 transition text-xs flex items-center space-x-1"
        >
          <span>Regularizar Assinatura</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  if (subscription.status === 'PAST_DUE') {
    return (
      <div className="bg-amber-500 text-white px-4 py-3 rounded-2xl mb-4 shadow-sm flex items-center justify-between text-xs font-medium animate-in fade-in">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-100" />
          <span>
            <strong>Aviso de Pagamento:</strong> Sua assinatura está pendente de renovação. Atualize seu plano para evitar suspensão.
          </span>
        </div>
        <button
          onClick={onNavigateToAssinatura}
          className="ml-3 shrink-0 bg-white text-amber-900 px-3 py-1.5 rounded-xl font-bold hover:bg-amber-50 transition text-xs flex items-center space-x-1"
        >
          <span>Ver Planos</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // 2. Check TRIAL near end
  if (subscription.status === 'TRIAL' && subscription.trial_ends_at) {
    const trialEndMs = new Date(subscription.trial_ends_at).getTime();
    const daysLeft = Math.ceil((trialEndMs - now) / 86400000);

    if (daysLeft <= 5) {
      return (
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white px-4 py-3 rounded-2xl mb-4 shadow-sm flex items-center justify-between text-xs font-medium animate-in fade-in border border-purple-700">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 shrink-0 text-purple-300" />
            <span>
              <strong>Período de Teste:</strong> Restam <strong>{daysLeft <= 0 ? 'poucas horas' : `${daysLeft} dia(s)`}</strong> do seu teste gratuito. Escolha um plano definitivo para manter o acesso.
            </span>
          </div>
          <button
            onClick={onNavigateToAssinatura}
            className="ml-3 shrink-0 bg-amber-400 text-purple-950 px-3 py-1.5 rounded-xl font-black hover:bg-amber-300 transition text-xs flex items-center space-x-1"
          >
            <span>Escolher Plano</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }
  }

  // 3. Check Usage Limits Warnings (>= 80% usage)
  if (usage) {
    if (usage.clientUsagePercent >= 80 && usage.limits.maxClients < 999999) {
      return (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2.5 rounded-2xl mb-4 shadow-2xs flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Limite de Clientes Próximo:</strong> Você utilizou {usage.clientCount} de {usage.limits.maxClients} clientes ({usage.clientUsagePercent}%).
            </span>
          </div>
          <button
            onClick={onNavigateToAssinatura}
            className="text-amber-800 font-extrabold hover:underline text-xs shrink-0 flex items-center space-x-1"
          >
            <span>Fazer Upgrade</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      );
    }

    if (usage.professionalUsagePercent >= 80 && usage.limits.maxProfessionals < 999999) {
      return (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2.5 rounded-2xl mb-4 shadow-2xs flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Limite de Profissionais Próximo:</strong> {usage.professionalCount} de {usage.limits.maxProfessionals} cadastrados ({usage.professionalUsagePercent}%).
            </span>
          </div>
          <button
            onClick={onNavigateToAssinatura}
            className="text-amber-800 font-extrabold hover:underline text-xs shrink-0 flex items-center space-x-1"
          >
            <span>Fazer Upgrade</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      );
    }
  }

  return null;
};
