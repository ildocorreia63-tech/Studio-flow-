import React from 'react';

interface StudioFlowLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'horizontal';
  showSubtitle?: boolean;
  className?: string;
  onClick?: () => void;
}

export const StudioFlowLogo: React.FC<StudioFlowLogoProps> = ({
  size = 'md',
  variant = 'horizontal',
  showSubtitle = true,
  className = '',
  onClick,
}) => {
  const iconSizeClasses = {
    xs: 'w-7 h-7 rounded-lg',
    sm: 'w-9 h-9 rounded-xl',
    md: 'w-11 h-11 rounded-2xl',
    lg: 'w-14 h-14 rounded-2xl',
    xl: 'w-20 h-20 rounded-3xl',
  };

  const titleSizeClasses = {
    xs: 'text-sm',
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  if (variant === 'icon') {
    return (
      <div
        onClick={onClick}
        className={`relative overflow-hidden bg-black flex items-center justify-center border border-purple-500/40 shadow-md ${iconSizeClasses[size]} ${className} ${onClick ? 'cursor-pointer hover:border-purple-400 transition' : ''}`}
      >
        <img
          src="/studioflow-logo.png"
          alt="StudioFlow Logo"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div
        onClick={onClick}
        className={`flex flex-col items-center text-center space-y-3 ${className} ${onClick ? 'cursor-pointer' : ''}`}
      >
        <div className={`relative overflow-hidden bg-black p-1 rounded-3xl border-2 border-purple-500/50 shadow-2xl shadow-purple-950/80 ${iconSizeClasses[size]}`}>
          <img
            src="/studioflow-logo.png"
            alt="StudioFlow Logo"
            className="w-full h-full object-contain rounded-2xl"
            referrerPolicy="no-referrer"
          />
        </div>
        <div>
          <div className={`font-black tracking-tight flex items-center justify-center space-x-1 ${titleSizeClasses[size]}`}>
            <span className="text-white">Studio</span>
            <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">Flow</span>
          </div>
          {showSubtitle && (
            <p className="text-[11px] font-bold text-purple-300/90 uppercase tracking-widest mt-0.5">
              Barbearia e Cia. • SaaS
            </p>
          )}
        </div>
      </div>
    );
  }

  // Default: Horizontal
  return (
    <div
      onClick={onClick}
      className={`flex items-center space-x-3 ${className} ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className={`relative overflow-hidden bg-black p-0.5 rounded-xl border border-purple-500/50 shadow-md shrink-0 ${iconSizeClasses[size]}`}>
        <img
          src="/studioflow-logo.png"
          alt="StudioFlow Logo"
          className="w-full h-full object-cover rounded-lg"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="flex flex-col min-w-0 leading-tight">
        <div className={`font-black tracking-tight flex items-center space-x-0.5 ${titleSizeClasses[size]}`}>
          <span className="text-white dark:text-white">Studio</span>
          <span className="bg-gradient-to-r from-purple-400 via-purple-300 to-indigo-400 bg-clip-text text-transparent">Flow</span>
        </div>
        {showSubtitle && (
          <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider truncate">
            Barbearia e Cia. • SaaS
          </span>
        )}
      </div>
    </div>
  );
};
