import React from 'react';
import { Sparkles, ShieldAlert, Check, ArrowRight, X, Lock } from 'lucide-react';
import { SaaSPlan, FeatureKey } from '../../types';
import { PLANS } from '../../services/subscription';

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToAssinatura: () => void;
  currentPlan: SaaSPlan;
  requiredPlan?: SaaSPlan;
  featureName?: string;
  customMessage?: string;
}

export const UpgradePlanModal: React.FC<UpgradePlanModalProps> = ({
  isOpen,
  onClose,
  onNavigateToAssinatura,
  currentPlan,
  requiredPlan = 'professional',
  featureName = 'Recurso Exclusivo',
  customMessage,
}) => {
  if (!isOpen) return null;

  const reqPlanDef = PLANS[requiredPlan] || PLANS.professional;
  const currentPlanDef = PLANS[currentPlan] || PLANS.basic;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-purple-100 relative overflow-hidden">
        {/* Background Decorative Gradient */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-200/50 rounded-full blur-2xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-purple-100 rounded-2xl text-purple-800 shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black text-purple-800 uppercase tracking-wider block">
              Recurso Bloqueado
            </span>
            <h3 className="text-lg font-black text-gray-900">{featureName}</h3>
          </div>
        </div>

        <p className="text-xs text-gray-600 mb-4 leading-relaxed">
          {customMessage ||
            `O recurso "${featureName}" não está disponível no seu plano atual (${currentPlanDef.name}). Faça upgrade para o plano ${reqPlanDef.name} para liberar esta funcionalidade e escalar seu negócio.`}
        </p>

        {/* Comparison Card Preview */}
        <div className="bg-gradient-to-br from-purple-950 to-indigo-950 text-white rounded-2xl p-4 mb-5 border border-purple-800 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-purple-300 uppercase">
              Plano Recomendado: {reqPlanDef.name}
            </span>
            <span className="text-sm font-black text-amber-300">{reqPlanDef.priceMonthly}</span>
          </div>
          <p className="text-[11px] text-purple-200 mb-3">{reqPlanDef.description}</p>

          <ul className="space-y-1.5 text-[11px] text-purple-100">
            <li className="flex items-center space-x-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Acesso ao módulo {featureName}</span>
            </li>
            <li className="flex items-center space-x-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                Até {reqPlanDef.limits.maxProfessionals === 999999 ? 'Ilimitados' : reqPlanDef.limits.maxProfessionals} Profissionais
              </span>
            </li>
            <li className="flex items-center space-x-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                Até {reqPlanDef.limits.maxClients === 999999 ? 'Ilimitados' : reqPlanDef.limits.maxClients} Clientes Cadastrados
              </span>
            </li>
          </ul>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-2xl text-xs font-bold transition"
          >
            Agora não
          </button>
          <button
            onClick={() => {
              onClose();
              onNavigateToAssinatura();
            }}
            className="flex-1 py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-2xl text-xs font-extrabold shadow-lg transition flex items-center justify-center space-x-2"
          >
            <span>Ver Todos os Planos</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
