import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, AlertTriangle } from 'lucide-react';

export const OfflineNetworkBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 4000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (showReconnected) {
    return (
      <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-2xl mb-4 text-xs font-bold flex items-center space-x-2 shadow-sm animate-in fade-in">
        <Wifi className="w-4 h-4 text-emerald-200 shrink-0" />
        <span>Conexão reestabelecida! Sincronizado com Supabase.</span>
      </div>
    );
  }

  if (isOffline) {
    return (
      <div className="bg-amber-600 text-white px-4 py-2.5 rounded-2xl mb-4 text-xs font-medium flex items-center justify-between shadow-sm animate-in fade-in border border-amber-500">
        <div className="flex items-center space-x-2">
          <WifiOff className="w-4 h-4 text-amber-200 shrink-0" />
          <span>
            <strong>Sem Conexão à Internet:</strong> Você está em modo leitura temporário. Novas alterações serão salvas assim que a rede retornar.
          </span>
        </div>
      </div>
    );
  }

  return null;
};
