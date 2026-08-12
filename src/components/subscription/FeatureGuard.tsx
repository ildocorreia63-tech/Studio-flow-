import React, { useState, useEffect } from 'react';
import { Lock, Sparkles, ArrowRight, ShieldAlert } from 'lucide-react';
import { FeatureKey, CompanySubscription, SaaSPlan } from '../../types';
import { SubscriptionService, PLANS } from '../../services/subscription';

interface FeatureGuardProps {
  businessId: string;
  feature: FeatureKey;
  children: React.ReactNode;
  onNavigateToAssinatura: () => void;
  featureTitle?: string;
  requiredPlan?: SaaSPlan;
}

export const FeatureGuard: React.FC<FeatureGuardProps> = ({
  businessId,
  feature,
  children,
  onNavigateToAssinatura,
  featureTitle = 'Módulo Exclusivo',
  requiredPlan = 'professional',
}) => {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [subscription, setSubscription] = useState<CompanySubscription | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function checkPermission() {
      try {
        const sub = await SubscriptionService.getCurrentSubscriptionAsync(businessId);
        const allowed = await SubscriptionService.hasFeatureAsync(businessId, feature);
        if (isMounted) {
          setSubscription(sub);
          setHasAccess(allowed);
        }
      } catch (err) {
        console.error('Error checking feature access:', err);
        if (isMounted) setHasAccess(true);
      }
    }

    checkPermission();
    return () => {
      isMounted = false;
    };
  }, [businessId, feature]);

  if (hasAccess === null) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    const currentPlanId = subscription?.plan_id || 'basic';
    const currentPlanDef = PLANS[currentPlanId] || PLANS.basic;
    const reqPlanDef = PLANS[requiredPlan] || PLANS.professional;

    return (
      <div className="bg-white rounded-3xl border border-gray-200/80 p-8 shadow-xs text-center max-w-2xl mx-auto my-8 space-y-6">
        <div className="w-16 h-16 bg-purple-100 text-purple-700 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-black text-purple-800 uppercase tracking-widest bg-purple-50 px-3 py-1 rounded-full border border-purple-100 inline-block">
            Recurso Bloqueado no Plano {currentPlanDef.name}
          </span>
          <h3 className="text-2xl font-black text-gray-900">{featureTitle}</h3>
          <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
            Este recurso faz parte do plano <strong>{reqPlanDef.name}</strong> ou superior.
            Faça upgrade da sua assinatura comercial para desbloquear acesso imediato a todas as funcionalidades deste módulo.
          </p>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-purple-950 text-white rounded-2xl p-5 border border-purple-800/60 shadow-lg text-left max-w-md mx-auto space-y-3">
          <div className="flex items-center justify-between border-b border-purple-800/80 pb-2">
            <span className="text-xs font-bold text-purple-300">Plano Recomendado</span>
            <span className="text-sm font-black text-amber-300">{reqPlanDef.priceMonthly}</span>
          </div>

          <ul className="space-y-1.5 text-xs text-purple-100">
            <li className="flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Acesso completo ao módulo {featureTitle}</span>
            </li>
            <li className="flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Limites expandidos de equipe e clientes</span>
            </li>
          </ul>
        </div>

        <div>
          <button
            onClick={onNavigateToAssinatura}
            className="bg-purple-700 hover:bg-purple-800 text-white font-extrabold px-6 py-3.5 rounded-2xl text-xs shadow-lg transition inline-flex items-center space-x-2"
          >
            <span>Ver Planos & Fazer Upgrade</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
