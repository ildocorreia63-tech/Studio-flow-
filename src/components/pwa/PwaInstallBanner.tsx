import React from 'react';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';
import { PwaService } from '../../services/pwaService';

interface PwaInstallBannerProps {
  canInstall: boolean;
  onDismiss: () => void;
}

export const PwaInstallBanner: React.FC<PwaInstallBannerProps> = ({
  canInstall,
  onDismiss,
}) => {
  if (!canInstall) return null;

  const handleInstallClick = async () => {
    const installed = await PwaService.promptInstall();
    if (installed) {
      onDismiss();
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-4 rounded-2xl mb-4 border border-purple-700 shadow-md flex items-center justify-between gap-3 text-xs animate-in fade-in">
      <div className="flex items-center space-x-3">
        <div className="p-2.5 bg-purple-800/80 rounded-xl text-amber-300 shrink-0">
          <Smartphone className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-extrabold text-white text-xs">Instalar o App StudioFlow</h4>
          <p className="text-purple-200 text-[11px] font-normal">
            Acesso rápido direto da tela inicial do seu celular ou computador sem ocupar espaço.
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        <button
          onClick={handleInstallClick}
          className="bg-amber-400 hover:bg-amber-300 text-purple-950 px-3.5 py-2 rounded-xl font-black transition flex items-center space-x-1.5 shadow-sm text-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Instalar App</span>
        </button>
        <button
          onClick={onDismiss}
          className="p-1.5 text-purple-300 hover:text-white rounded-lg hover:bg-purple-800/50 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
