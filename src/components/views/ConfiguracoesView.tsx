import React, { useState, useRef } from 'react';
import {
  Settings, Save, RefreshCw, Check, AlertTriangle, Scissors, UserCheck, Globe, Upload,
  Image as ImageIcon, Link as LinkIcon, Trash2, Sparkles, Building, Crown, X, Smartphone,
  Share, MoreVertical, PlusSquare, Monitor, Bell, CheckCircle2, Copy, ExternalLink, AlertCircle,
  Sun, Moon, Palette, CreditCard, Building2, Lock, Eye, EyeOff, KeyRound, ShieldCheck
} from 'lucide-react';
import { DB } from '../../services/db';
import { Business, ActiveTab, UserProfile } from '../../types';
import { PwaService } from '../../services/pwaService';
import { getPublicAppBaseUrl } from '../../utils/url';

interface ConfiguracoesViewProps {
  business: Business;
  currentUser?: UserProfile | null;
  theme?: 'light' | 'dark';
  onUpdateTheme?: (theme: 'light' | 'dark') => void;
  onUpdateBusiness: (updated: Business) => void;
  onNavigate?: (tab: ActiveTab) => void;
}

// Sample preset barbershop logo avatars
const PRESET_LOGOS = [
  { id: 'classic', name: 'Barbearia Clássica', url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=300&q=80' },
  { id: 'vintage', name: 'Vintage Barber', url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=300&q=80' },
  { id: 'modern', name: 'Studio Moderno', url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=300&q=80' },
  { id: 'gold', name: 'Barber Gold', url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=300&q=80' },
  { id: 'gentleman', name: 'Gentleman Club', url: 'https://images.unsplash.com/photo-1517832606589-7150a6d71c82?auto=format&fit=crop&w=300&q=80' },
  { id: 'luxury', name: 'Premium Studio', url: 'https://images.unsplash.com/photo-1532710093739-9470acff878f?auto=format&fit=crop&w=300&q=80' },
];

export const ConfiguracoesView: React.FC<ConfiguracoesViewProps> = ({
  business,
  currentUser,
  theme = 'light',
  onUpdateTheme,
  onUpdateBusiness,
  onNavigate,
}) => {
  const [name, setName] = useState(business.name);
  const [phone, setPhone] = useState(business.phone);
  const [whatsapp, setWhatsapp] = useState(business.whatsapp);
  const [address, setAddress] = useState(business.address);
  const [city, setCity] = useState(business.city);
  const [state, setState] = useState(business.state);
  const [logoUrl, setLogoUrl] = useState(business.logo_url || '');

  const [inputMode, setInputMode] = useState<'upload' | 'preset' | 'url'>('upload');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Password & Security State
  const [accountEmail, setAccountEmail] = useState(currentUser?.email || business.email || '');
  const [accountPassword, setAccountPassword] = useState(currentUser?.password || '123456');
  const [showAccountPassword, setShowAccountPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSavedSuccess, setPasswordSavedSuccess] = useState(false);

  // Modals state
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showPwaModal, setShowPwaModal] = useState(false);
  const [pwaDeviceTab, setPwaDeviceTab] = useState<'ios' | 'android' | 'desktop'>('android');
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const compressImageFile = (file: File, maxWidth = 350, maxHeight = 350, quality = 0.82): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
          } else {
            resolve((e.target?.result as string) || '');
          }
        };
        img.onerror = () => resolve((e.target?.result as string) || '');
        img.src = (e.target?.result as string) || '';
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    setTimeout(() => {
      try {
        const updated = DB.updateBusiness(business.id, {
          name,
          phone,
          whatsapp,
          address,
          city,
          state,
          logo_url: logoUrl,
        });
        if (updated) {
          onUpdateBusiness(updated);
          PwaService.updateDynamicAppManifest(updated);
          setIsSaving(false);
          setSavedSuccess(true);
          triggerToast('✅ Configurações e logo salvas no dispositivo!');
          setTimeout(() => setSavedSuccess(false), 3500);
        } else {
          setIsSaving(false);
        }
      } catch (err) {
        setIsSaving(false);
        triggerToast('⚠️ Erro ao salvar dados no dispositivo.');
      }
    }, 200);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      triggerToast('⚠️ A imagem é muito grande. Escolha um arquivo de até 10MB.');
      return;
    }

    try {
      const compressedDataUrl = await compressImageFile(file);
      if (compressedDataUrl) {
        setLogoUrl(compressedDataUrl);
        triggerToast('📸 Imagem otimizada! Clique em "Salvar Alterações" para aplicar.');
      }
    } catch (err) {
      triggerToast('Erro ao processar imagem.');
    }
  };

  const handleApplyUrl = () => {
    if (customUrlInput.trim()) {
      setLogoUrl(customUrlInput.trim());
      setCustomUrlInput('');
      triggerToast('🔗 Link da imagem aplicado! Clique em "Salvar Alterações".');
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    triggerToast('🗑️ Logo removido. Clique em "Salvar Alterações" para confirmar.');
  };

  const handleResetSeedData = () => {
    DB.resetDatabase();
    window.location.reload();
  };

  const handleRequestNotification = async () => {
    try {
      const perm = await PwaService.requestNotificationPermission();
      if (perm === 'granted') {
        triggerToast('🔔 Permissão concedida! Notificações de sistema ativadas.');
        if ('Notification' in window) {
          try {
            new Notification(`StudioFlow - ${business.name}`, {
              body: 'As notificações do seu estabelecimento foram ativadas com sucesso!',
              icon: logoUrl || '/icon-192.png',
            });
          } catch (e) {
            console.log('Test notification error:', e);
          }
        }
      } else {
        setShowNotificationModal(true);
      }
    } catch (err: any) {
      setShowNotificationModal(true);
    }
  };

  const handleInstallPwa = async () => {
    const installed = await PwaService.promptInstall();
    if (installed) {
      triggerToast('🎉 Aplicativo PWA instalado com sucesso!');
    } else {
      // Open step-by-step modal
      setShowPwaModal(true);
    }
  };

  const copyAppUrl = () => {
    const url = getPublicAppBaseUrl();
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountPassword || accountPassword.length < 6) {
      triggerToast('⚠️ A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    setIsSavingPassword(true);
    setTimeout(() => {
      try {
        const emailToUpdate = accountEmail || currentUser?.email || business.email;
        DB.resetPasswordByEmail(emailToUpdate, accountPassword);
        if (currentUser?.id) {
          DB.updateProfile(currentUser.id, { password: accountPassword });
        }
        setIsSavingPassword(false);
        setPasswordSavedSuccess(true);
        triggerToast('✅ Senha de acesso atualizada com sucesso!');
        setTimeout(() => setPasswordSavedSuccess(false), 4000);
      } catch (err) {
        setIsSavingPassword(false);
        triggerToast('⚠️ Erro ao atualizar senha.');
      }
    }, 250);
  };

  return (
    <div className="space-y-6 pb-12 relative">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-purple-500/50 flex items-center space-x-3 text-xs font-bold animate-in fade-in slide-in-from-bottom-4">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-white ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-xs transition-colors">
        <h2 className="text-xl font-black text-gray-900 dark:text-white">Configurações do Estabelecimento</h2>
        <p className="text-xs text-gray-500 dark:text-slate-400">Altere informações cadastrais, tema da interface, logo público, contato e endereço</p>
      </div>

      {/* Theme Preference / Dark Mode Section */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-purple-600 text-white rounded-xl shadow-xs">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Aparência do Sistema & Tema Visual</h3>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                Sua preferência de tema é salva no banco de dados e sincronizada em todos os seus dispositivos
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
            {theme === 'dark' ? 'Modo Escuro Ativo' : 'Modo Claro Ativo'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {/* Light Theme Card */}
          <button
            type="button"
            onClick={() => {
              if (onUpdateTheme) onUpdateTheme('light');
              triggerToast('Tema Claro ativado e salvo no seu perfil!');
            }}
            className={`p-4 rounded-2xl border-2 text-left transition flex items-start gap-3.5 cursor-pointer ${
              theme === 'light'
                ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 shadow-sm'
                : 'border-gray-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-slate-700 bg-gray-50/50 dark:bg-slate-800/40'
            }`}
          >
            <div className={`p-2.5 rounded-xl shrink-0 ${theme === 'light' ? 'bg-amber-500 text-white shadow-xs' : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300'}`}>
              <Sun className="w-5 h-5" />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-gray-900 dark:text-white">Tema Claro (Light Mode)</h4>
                {theme === 'light' && <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />}
              </div>
              <p className="text-[11px] text-gray-600 dark:text-slate-400 leading-relaxed">
                Interface com fundo claro, alto contraste e visual limpo para uso diurno.
              </p>
            </div>
          </button>

          {/* Dark Theme Card */}
          <button
            type="button"
            onClick={() => {
              if (onUpdateTheme) onUpdateTheme('dark');
              triggerToast('Tema Escuro ativado e salvo no seu perfil!');
            }}
            className={`p-4 rounded-2xl border-2 text-left transition flex items-start gap-3.5 cursor-pointer ${
              theme === 'dark'
                ? 'border-purple-500 bg-purple-950/50 text-white shadow-md'
                : 'border-gray-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-slate-700 bg-gray-50/50 dark:bg-slate-800/40'
            }`}
          >
            <div className={`p-2.5 rounded-xl shrink-0 ${theme === 'dark' ? 'bg-purple-600 text-white shadow-xs' : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300'}`}>
              <Moon className="w-5 h-5" />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-gray-900 dark:text-white">Tema Escuro (Dark Mode)</h4>
                {theme === 'dark' && <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />}
              </div>
              <p className="text-[11px] text-gray-600 dark:text-slate-400 leading-relaxed">
                Visual escuro refinado para reduzir a fadiga ocular em ambientes de pouca luz.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Navigation Quick Links */}
      {onNavigate && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => onNavigate('servicos')}
            className="p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 rounded-2xl flex items-center gap-3 text-left transition cursor-pointer shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-purple-950">Serviços & Preços</h4>
              <p className="text-[11px] text-purple-700">Cortes, barba e valores</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('profissionais')}
            className="p-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-2xl flex items-center gap-3 text-left transition cursor-pointer shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-indigo-950">Equipe de Barbeiros</h4>
              <p className="text-[11px] text-indigo-700">Profissionais e horários</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('agendamento_online')}
            className="p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-2xl flex items-center gap-3 text-left transition cursor-pointer shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-blue-950">Agendamento Online</h4>
              <p className="text-[11px] text-blue-700">Link público e personalização</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('assinatura')}
            className="p-4 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-2xl flex items-center gap-3 text-left transition cursor-pointer shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-950">Assinaturas SaaS</h4>
              <p className="text-[11px] text-amber-700">Lista de barbearias e planos</p>
            </div>
          </button>
        </div>
      )}

      {/* SaaS Admin Banner in Configurações */}
      {onNavigate && (
        <div className="p-5 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 border border-purple-700/60 rounded-3xl text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/90 text-white flex items-center justify-center shrink-0 shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  Assinaturas SaaS & Lista de Barbearias Assinantes
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Painel Admin
                </span>
              </div>
              <p className="text-xs text-purple-200/90 mt-0.5">
                Visualize todas as barbearias cadastradas, gerencie planos, ative períodos de teste e acompanhe o faturamento recorrente.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('assinatura')}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-extrabold shadow-md transition flex items-center space-x-2 shrink-0 cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Ver Lista de Barbearias Assinantes</span>
          </button>
        </div>
      )}

      {/* Unified Settings & Logo Form */}
      <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-6">
        {savedSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-extrabold flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Informações do estabelecimento e logo atualizadas com sucesso!</span>
          </div>
        )}

        {/* LOGO CUSTOMIZATION SECTION */}
        <div className="p-5 bg-gradient-to-br from-purple-50/60 via-slate-50 to-indigo-50/40 rounded-2xl border border-purple-100/90 space-y-4">
          <div className="flex items-center justify-between border-b border-purple-100/80 pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-purple-600 text-white rounded-xl shadow-xs">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-purple-950">Logo & Identidade da Barbearia</h3>
                <p className="text-[11px] text-purple-700">Exibido no cabeçalho, na barra lateral e na página pública de agendamento</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 pt-1">
            {/* Logo Preview Box */}
            <div className="flex flex-col items-center shrink-0 space-y-2">
              <div className="w-36 h-36 rounded-3xl bg-slate-900 border-2 border-purple-400 shadow-lg overflow-hidden flex items-center justify-center p-3 relative group">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo da Barbearia" className="max-w-full max-h-full object-contain drop-shadow-sm" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-purple-300">
                    <Building className="w-10 h-10 mb-1" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-300">Sem Logo</span>
                  </div>
                )}
              </div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pré-visualização da Marca</span>
              {logoUrl && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="text-[11px] text-rose-600 hover:text-rose-800 font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remover Logo</span>
                </button>
              )}
            </div>

            {/* Logo Upload Options */}
            <div className="flex-1 space-y-3 w-full">
              {/* Input Mode Tabs */}
              <div className="flex items-center space-x-2 bg-white p-1 rounded-xl border border-gray-200/80 text-xs font-bold text-gray-600 w-fit">
                <button
                  type="button"
                  onClick={() => setInputMode('upload')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 cursor-pointer ${
                    inputMode === 'upload' ? 'bg-purple-700 text-white shadow-xs' : 'hover:bg-gray-100'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Enviar Foto</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInputMode('preset')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 cursor-pointer ${
                    inputMode === 'preset' ? 'bg-purple-700 text-white shadow-xs' : 'hover:bg-gray-100'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Logos Prontas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInputMode('url')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 cursor-pointer ${
                    inputMode === 'url' ? 'bg-purple-700 text-white shadow-xs' : 'hover:bg-gray-100'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Link da Imagem</span>
                </button>
              </div>

              {/* Upload File Input */}
              {inputMode === 'upload' && (
                <div className="space-y-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-2 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Escolher Imagem do Computador ou Celular</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500">Suporta arquivos PNG, JPG, WEBP ou SVG (Máx 5MB).</p>
                </div>
              )}

              {/* Preset Barber Logos Selector */}
              {inputMode === 'preset' && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600 font-medium">Selecione uma imagem de marca predefinida:</p>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {PRESET_LOGOS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setLogoUrl(preset.url);
                          triggerToast(`✨ Logo "${preset.name}" selecionado!`);
                        }}
                        className={`p-1.5 rounded-xl border transition flex flex-col items-center gap-1 cursor-pointer ${
                          logoUrl === preset.url
                            ? 'bg-purple-100 border-purple-600 ring-2 ring-purple-500/50'
                            : 'bg-white border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-lg bg-slate-900 overflow-hidden flex items-center justify-center p-0.5 shrink-0 border border-purple-200/60">
                          <img src={preset.url} alt={preset.name} className="max-w-full max-h-full object-contain" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-700 truncate w-full text-center">
                          {preset.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Image URL Input */}
              {inputMode === 'url' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 max-w-md">
                    <input
                      type="url"
                      placeholder="https://exemplo.com/minha-logo.png"
                      value={customUrlInput}
                      onChange={(e) => setCustomUrlInput(e.target.value)}
                      className="flex-1 p-2 border rounded-xl text-xs bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleApplyUrl}
                      className="px-3 py-2 bg-purple-700 text-white text-xs font-bold rounded-xl hover:bg-purple-800 transition shrink-0 cursor-pointer"
                    >
                      Aplicar URL
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* DETAILS INPUTS */}
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Nome do Estabelecimento *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-purple-500/50 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">WhatsApp Comercial *</label>
              <input
                type="text"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-purple-500/50 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">Telefone Fixo / Celular</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-purple-500/50 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">Endereço Completo</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-purple-500/50 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">Cidade</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-purple-500/50 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">Estado (UF)</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs uppercase bg-white focus:ring-2 focus:ring-purple-500/50 outline-hidden"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className={`w-full sm:w-auto px-8 py-3.5 rounded-xl text-xs font-extrabold shadow-md transition flex items-center justify-center space-x-2 cursor-pointer ${
                savedSuccess
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-purple-700 hover:bg-purple-800 text-white'
              }`}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>SALVANDO ALTERAÇÕES...</span>
                </>
              ) : savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>ALTERAÇÕES E LOGO SALVAS!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>SALVAR ALTERAÇÕES & LOGO</span>
                </>
              )}
            </button>

            {savedSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center space-x-1">
                <Check className="w-4 h-4" />
                <span>Marca e cadastro salvos no sistema.</span>
              </span>
            )}
          </div>
        </div>
      </form>

      {/* Access Credentials & Password Management Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-xl">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 dark:text-white">Credenciais de Acesso & Senha</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Gerencie o e-mail e a senha utilizada para fazer login e administrar seu painel.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-full text-[10px] font-black uppercase flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Segurança Ativa</span>
          </span>
        </div>

        <form onSubmit={handleSavePassword} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-1 text-gray-700 dark:text-slate-300">
                E-mail de Login Cadastrado
              </label>
              <input
                type="email"
                readOnly
                value={accountEmail}
                className="w-full p-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-xs bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 outline-hidden cursor-not-allowed font-medium"
              />
              <p className="text-[10px] text-gray-400 mt-1">E-mail vinculado ao acesso da sua empresa.</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold uppercase text-gray-700 dark:text-slate-300">
                  Senha de Acesso ao Painel *
                </label>
                <button
                  type="button"
                  onClick={() => setShowAccountPassword(!showAccountPassword)}
                  className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  {showAccountPassword ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Ocultar</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver senha</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type={showAccountPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  className="w-full pl-9 pr-10 p-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/50 outline-hidden font-medium"
                  placeholder="Mínimo 6 dígitos (ex: minhaSenha123)"
                />
                <button
                  type="button"
                  onClick={() => setShowAccountPassword(!showAccountPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showAccountPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Altere sua senha a qualquer momento e clique em salvar.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={isSavingPassword}
              className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center space-x-2 cursor-pointer"
            >
              {isSavingPassword ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando Senha...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Nova Senha</span>
                </>
              )}
            </button>

            {passwordSavedSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center space-x-1">
                <Check className="w-4 h-4" />
                <span>Senha salva com sucesso!</span>
              </span>
            )}
          </div>
        </form>
      </div>

      {/* PWA & Notification Settings */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
        <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
          <span>Notificações & Aplicativo PWA</span>
        </h3>
        <p className="text-xs text-gray-500">
          Gerencie permissões de alertas do navegador e instalação do aplicativo na sua área de trabalho ou celular.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Notifications Card */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Notificações no Navegador
                </span>
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                  'Notification' in window && Notification.permission === 'granted'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}>
                  {'Notification' in window ? Notification.permission.toUpperCase() : 'NÃO SUPORTADO'}
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Receba lembretes de novos agendamentos e alertas importantes diretamente no seu dispositivo.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRequestNotification}
              className="w-full py-3 px-4 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span>Ativar Notificações no Dispositivo</span>
            </button>
          </div>

          {/* PWA Mobile App Card */}
          <div className="p-5 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white rounded-2xl border border-purple-800 space-y-3.5 shadow-md flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                  Aplicativo PWA Personalizado
                </span>
                <span className="bg-purple-800/80 text-purple-200 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border border-purple-600/50">
                  White-Label
                </span>
              </div>
              
              <p className="text-xs text-purple-200 leading-relaxed">
                Ao instalar o aplicativo no celular (Android ou iPhone) ou no computador, a marca exibida na tela inicial será <strong>automaticamente a sua logo e o nome da sua barbearia</strong>!
              </p>

              {/* Home Screen Icon Mockup Preview */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-purple-800/50 flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-purple-400 shadow-md flex items-center justify-center overflow-hidden p-1 shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt={name} className="max-w-full max-h-full object-contain" />
                  ) : (
                    <Scissors className="w-6 h-6 text-purple-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white truncate">{name || 'Minha Barbearia'}</p>
                  <p className="text-[10px] text-purple-300">Ícone instalado na tela do celular</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleInstallPwa}
              className="w-full py-3 px-4 bg-amber-400 hover:bg-amber-300 text-purple-950 font-black rounded-xl text-xs transition shadow-sm flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>Instalar App da Barbearia no Celular</span>
            </button>
          </div>
        </div>
      </div>

      {/* Backup & Data Security Section */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex items-center space-x-3 text-gray-900 font-extrabold text-sm">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900">Segurança & Backup de Dados</h3>
            <p className="text-xs text-gray-500 font-normal">Garantia de retenção do cadastro da barbearia, clientes, agendamentos e vendas</p>
          </div>
        </div>

        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/80 text-xs text-emerald-900 space-y-2">
          <p className="font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Todos os dados estão salvos e protegidos localmente neste dispositivo!</span>
          </p>
          <p className="text-[11px] text-emerald-800 leading-relaxed">
            Seus dados de assinante, cadastro de clientes, histórico de cortes, agendamentos e caixa financeiro são salvos em tempo real e não são perdidos ao fechar o app. Para maior segurança, você pode baixar uma cópia de segurança (backup) a qualquer momento.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => {
              try {
                const jsonStr = DB.exportDBBackup();
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `backup-studioflow-${name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                triggerToast('💾 Backup completo baixado com sucesso!');
              } catch (e) {
                triggerToast('⚠️ Erro ao gerar backup de dados.');
              }
            }}
            className="p-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
          >
            <Copy className="w-4 h-4 text-amber-400" />
            <span>Exportar Cópia de Segurança (Backup JSON)</span>
          </button>

          <label className="p-3.5 bg-purple-100 hover:bg-purple-200 text-purple-950 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer shadow-xs border border-purple-200/80">
            <Upload className="w-4 h-4 text-purple-700" />
            <span>Restaurar de um Arquivo de Backup</span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                  if (event.target?.result) {
                    const ok = DB.importDBBackup(event.target.result as string);
                    if (ok) {
                      triggerToast('🎉 Backup restaurado com sucesso! Atualizando página...');
                      setTimeout(() => window.location.reload(), 1500);
                    } else {
                      triggerToast('⚠️ Arquivo de backup inválido.');
                    }
                  }
                };
                reader.readAsText(file);
              }}
            />
          </label>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-rose-50 p-6 rounded-3xl border border-rose-200 space-y-3">
        <div className="flex items-center space-x-2 text-rose-800 font-bold text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>Zona de Teste / Reset de Dados</span>
        </div>
        <p className="text-xs text-rose-700">
          Você pode restaurar o banco de dados com os dados iniciais de demonstração a qualquer momento.
        </p>
        <button
          type="button"
          onClick={() => setShowResetConfirmModal(true)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
        >
          Restaurar Dados Demo
        </button>
      </div>

      {/* MODAL 1: NOTIFICATION GUIDANCE MODAL */}
      {showNotificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-purple-100 space-y-4 relative">
            <button
              onClick={() => setShowNotificationModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">Notificações no Navegador</h3>
                <p className="text-xs text-gray-500">Como ativar os alertas no seu dispositivo</p>
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200/80 text-xs text-amber-900 space-y-2">
              <p className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>A permissão de notificação está bloqueada ou em modo preview iFrame.</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                Para autorizar o envio de lembretes de agendamentos no seu navegador ou celular, siga os passos simples abaixo:
              </p>
            </div>

            <div className="space-y-3 text-xs text-gray-700">
              <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                <div>
                  <span className="font-bold block text-gray-900">Clique no ícone de Cadeado / Configurações</span>
                  <span className="text-[11px] text-gray-500">Localizado na barra de endereços (topo) do seu navegador.</span>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <div>
                  <span className="font-bold block text-gray-900">Altere "Notificações" para "Permitir"</span>
                  <span className="text-[11px] text-gray-500">Desbloqueie a permissão para este site.</span>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                <div>
                  <span className="font-bold block text-gray-900">Recarregue a página</span>
                  <span className="text-[11px] text-gray-500">Atualize para aplicar as novas permissões ativas.</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  triggerToast('🔔 Alerta de teste enviado com sucesso!');
                  setShowNotificationModal(false);
                }}
                className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Simular Alerta de Teste Agora
              </button>
              <button
                type="button"
                onClick={() => setShowNotificationModal(false)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PWA INSTALL INSTRUCTIONS MODAL */}
      {showPwaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-purple-100 space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowPwaModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-900 text-amber-300 flex items-center justify-center shrink-0 shadow-md">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">Instalar Aplicativo da Barbearia</h3>
                <p className="text-xs text-gray-500">Adicione um ícone direto na tela inicial do seu dispositivo</p>
              </div>
            </div>

            {/* Device Selector Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-2xl gap-1 text-xs font-bold text-gray-600">
              <button
                type="button"
                onClick={() => setPwaDeviceTab('android')}
                className={`flex-1 py-2 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                  pwaDeviceTab === 'android' ? 'bg-purple-700 text-white shadow-xs' : 'hover:bg-gray-200'
                }`}
              >
                <span>📱 Android</span>
              </button>
              <button
                type="button"
                onClick={() => setPwaDeviceTab('ios')}
                className={`flex-1 py-2 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                  pwaDeviceTab === 'ios' ? 'bg-purple-700 text-white shadow-xs' : 'hover:bg-gray-200'
                }`}
              >
                <span>🍎 iPhone (iOS)</span>
              </button>
              <button
                type="button"
                onClick={() => setPwaDeviceTab('desktop')}
                className={`flex-1 py-2 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                  pwaDeviceTab === 'desktop' ? 'bg-purple-700 text-white shadow-xs' : 'hover:bg-gray-200'
                }`}
              >
                <span>💻 Computador</span>
              </button>
            </div>

            {/* Android Tab Content */}
            {pwaDeviceTab === 'android' && (
              <div className="space-y-3 text-xs text-gray-700">
                <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center shrink-0">
                    <MoreVertical className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-purple-950 block">1. Abra o menu do Chrome</span>
                    <span className="text-[11px] text-purple-800">Toque nos 3 pontinhos vertical no canto superior direito.</span>
                  </div>
                </div>

                <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-purple-950 block">2. Selecione "Instalar aplicativo"</span>
                    <span className="text-[11px] text-purple-800">Ou toque em "Adicionar à Tela Inicial".</span>
                  </div>
                </div>

                <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-purple-950 block">3. Confirme a instalação</span>
                    <span className="text-[11px] text-purple-800">O ícone com a logo da sua barbearia será criado automaticamente!</span>
                  </div>
                </div>
              </div>
            )}

            {/* iOS Tab Content */}
            {pwaDeviceTab === 'ios' && (
              <div className="space-y-3 text-xs text-gray-700">
                <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center shrink-0">
                    <Share className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-purple-950 block">1. Toque no botão Compartilhar</span>
                    <span className="text-[11px] text-purple-800">Botão quadrado com seta apontada para cima no Safari do iPhone.</span>
                  </div>
                </div>

                <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center shrink-0">
                    <PlusSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-purple-950 block">2. Toque em "Adicionar à Tela de Início"</span>
                    <span className="text-[11px] text-purple-800">Role a lista de opções para baixo até encontrar a opção.</span>
                  </div>
                </div>

                <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-purple-950 block">3. Toque em "Adicionar"</span>
                    <span className="text-[11px] text-purple-800">No canto superior direito para finalizar a criação do App.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Desktop Tab Content */}
            {pwaDeviceTab === 'desktop' && (
              <div className="space-y-3 text-xs text-gray-700">
                <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center shrink-0">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-purple-950 block">1. Clique no ícone da barra de endereço</span>
                    <span className="text-[11px] text-purple-800">Clique no ícone de monitor com seta para baixo no Chrome / Edge.</span>
                  </div>
                </div>

                <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-purple-950 block">2. Confirme a instalação</span>
                    <span className="text-[11px] text-purple-800">O StudioFlow funcionará como um programa de computador dedicado!</span>
                  </div>
                </div>
              </div>
            )}

            {/* Copy Link Action */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2">
              <span className="text-[11px] font-bold text-gray-300 block">Link Direto da Aplicação:</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getPublicAppBaseUrl()}
                  className="flex-1 bg-slate-800 p-2 rounded-xl text-xs text-purple-200 border border-slate-700 font-mono"
                />
                <button
                  type="button"
                  onClick={copyAppUrl}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1 shrink-0 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPwaModal(false)}
              className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: RESET SEED CONFIRMATION MODAL */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4 relative">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-rose-950">Restaurar Dados Demonstrativos?</h3>
                <p className="text-xs text-gray-500">Atenção: Ação irreversível</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Isso irá restaurar o banco de dados local com as informações padrão de demonstração. Deseja continuar?
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleResetSeedData}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Sim, Restaurar Dados
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

