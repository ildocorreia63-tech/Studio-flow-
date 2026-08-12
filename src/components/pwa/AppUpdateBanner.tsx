import React from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';

interface AppUpdateBannerProps {
  registration: ServiceWorkerRegistration | null;
  onApplyUpdate: (reg: ServiceWorkerRegistration) => void;
  onDismiss: () => void;
}

export const AppUpdateBanner: React.FC<AppUpdateBannerProps> = ({
  registration,
  onApplyUpdate,
  onDismiss,
}) => {
  if (!registration) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:max-w-md bg-gradient-to-r from-purple-950 to-indigo-950 text-white p-4 rounded-3xl shadow-2xl border border-purple-700/80 z-50 flex items-center justify-between space-x-3 animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center space-x-3">
        <div className="p-2.5 bg-purple-800/60 rounded-2xl shrink-0 text-amber-300 border border-purple-600/50">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-purple-200">
            Nova Versão Disponível
          </h4>
          <p className="text-xs text-purple-100 font-medium">
            Atualização do StudioFlow pronta para uso.
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        <button
          onClick={() => onApplyUpdate(registration)}
          className="bg-amber-400 hover:bg-amber-300 text-purple-950 px-3.5 py-2 rounded-xl text-xs font-black shadow-md transition flex items-center space-x-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Atualizar agora</span>
        </button>
        <button
          onClick={onDismiss}
          className="p-1.5 text-purple-300 hover:text-white rounded-xl hover:bg-purple-900/50 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
