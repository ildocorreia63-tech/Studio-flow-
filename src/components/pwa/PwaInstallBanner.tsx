import React from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { PwaService } from '../../services/pwaService';
import { Business } from '../../types';

interface PwaInstallBannerProps {
  canInstall: boolean;
  business?: Business | null;
  onDismiss: () => void;
}

export const PwaInstallBanner: React.FC<PwaInstallBannerProps> = ({
  canInstall,
  business,
  onDismiss,
}) => {
  if (!canInstall) return null;

  const handleInstallClick = async () => {
    const installed = await PwaService.promptInstall();
    if (installed) {
      onDismiss();
    }
  };

  const appTitle = business?.name ? `Instalar App ${business.name}` : 'Instalar o App StudioFlow';
  const logo = business?.logo_url;

  return (
    <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white p-4 rounded-2xl mb-4 border border-purple-700/80 shadow-md flex items-center justify-between gap-3 text-xs animate-in fade-in">
      <div className="flex items-center space-x-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-purple-400/80 p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
          {logo ? (
            <img src={logo} alt={business?.name} className="max-w-full max-h-full object-contain" />
          ) : (
            <Smartphone className="w-5 h-5 text-amber-300" />
          )}
        </div>
        <div className="min-w-0">
          <h4 className="font-extrabold text-white text-xs truncate">{appTitle}</h4>
          <p className="text-purple-200 text-[11px] font-normal truncate">
            Adicionar ícone e atalho direto na tela inicial do seu celular.
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        <button
          onClick={handleInstallClick}
          className="bg-amber-400 hover:bg-amber-300 text-purple-950 px-3.5 py-2 rounded-xl font-black transition flex items-center space-x-1.5 shadow-sm text-xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Instalar</span>
        </button>
        <button
          onClick={onDismiss}
          className="p-1.5 text-purple-300 hover:text-white rounded-lg hover:bg-purple-800/50 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
