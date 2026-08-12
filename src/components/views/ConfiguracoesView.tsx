import React, { useState, useRef } from 'react';
import { Settings, Save, RefreshCw, Check, AlertTriangle, Scissors, UserCheck, Globe, Upload, Image as ImageIcon, Link as LinkIcon, Trash2, Sparkles, Building, Crown } from 'lucide-react';
import { DB } from '../../services/db';
import { Business, ActiveTab } from '../../types';
import { PwaService } from '../../services/pwaService';

interface ConfiguracoesViewProps {
  business: Business;
  onUpdateBusiness: (updated: Business) => void;
  onNavigate?: (tab: ActiveTab) => void;
}

// Sample preset barbershop logo avatars (high resolution stylized Unsplash barbershop/grooming avatars)
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
  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
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
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem é muito grande. Escolha um arquivo de até 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setLogoUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    if (customUrlInput.trim()) {
      setLogoUrl(customUrlInput.trim());
      setCustomUrlInput('');
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
  };

  const handleResetSeedData = () => {
    if (confirm('Atenção: Isso irá restaurar o banco de dados com os dados de demonstração padrão. Deseja continuar?')) {
      DB.resetDatabase();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs">
        <h2 className="text-xl font-black text-gray-900">Configurações do Estabelecimento</h2>
        <p className="text-xs text-gray-500">Altere informações cadastrais, logo público, contato e endereço</p>
      </div>

      {onNavigate && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => onNavigate('servicos')}
            className="p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 rounded-2xl flex items-center gap-3 text-left transition cursor-pointer shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-purple-950">Serviços, Preços & Duração</h4>
              <p className="text-[11px] text-purple-700">Cadastrar cortes, barba, valores e tempo</p>
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
              <h4 className="text-xs font-bold text-indigo-950">Equipe de Profissionais</h4>
              <p className="text-[11px] text-indigo-700">Cadastrar barbeiros e horários</p>
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
              <p className="text-[11px] text-blue-700">Personalizar página e link público</p>
            </div>
          </button>
        </div>
      )}

      {/* Main Settings & Logo Form */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs space-y-6">
        {savedSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Dados e logo salvos com sucesso!</span>
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
                  className="text-[11px] text-rose-600 hover:text-rose-800 font-bold flex items-center space-x-1"
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
                  className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
                    inputMode === 'upload' ? 'bg-purple-700 text-white shadow-xs' : 'hover:bg-gray-100'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Enviar Foto</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInputMode('preset')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
                    inputMode === 'preset' ? 'bg-purple-700 text-white shadow-xs' : 'hover:bg-gray-100'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Logos Prontas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInputMode('url')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
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
                        onClick={() => setLogoUrl(preset.url)}
                        className={`p-1.5 rounded-xl border transition flex flex-col items-center gap-1 ${
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
                      className="px-3 py-2 bg-purple-700 text-white text-xs font-bold rounded-xl hover:bg-purple-800 transition shrink-0"
                    >
                      Aplicar URL
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* DETAILS FORM */}
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Nome do Estabelecimento *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">WhatsApp Comercial *</label>
              <input
                type="text"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">Telefone Fixo / Celular</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">Endereço Completo</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">Cidade</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">Estado (UF)</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-xs uppercase"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-6 py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>SALVAR ALTERAÇÕES & LOGO</span>
          </button>
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
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Notificações no Navegador
              </span>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                'Notification' in window && Notification.permission === 'granted'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {'Notification' in window ? Notification.permission : 'Não Suportado'}
              </span>
            </div>
            <p className="text-xs text-gray-600">
              Receba lembretes de novos agendamentos e alertas importantes diretamente no seu dispositivo.
            </p>
            <button
              onClick={async () => {
                try {
                  const perm = await PwaService.requestNotificationPermission();
                  if (perm === 'granted') {
                    alert('Permissão concedida! Notificações de sistema ativadas com sucesso.');
                    window.location.reload();
                  } else {
                    alert('Permissão de notificações negada ou bloqueada no navegador.');
                  }
                } catch (err: any) {
                  alert(err.message || 'Erro ao solicitar permissão de notificações.');
                }
              }}
              className="w-full py-2.5 px-4 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs transition"
            >
              Ativar Notificações no Dispositivo
            </button>
          </div>

          {/* PWA Mobile App Card */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
              Aplicativo PWA Standalone
            </span>
            <p className="text-xs text-gray-600">
              O StudioFlow pode ser adicionado à sua tela de início como aplicativo nativo no Android, iPhone ou Desktop.
            </p>
            <button
              onClick={async () => {
                const installed = await PwaService.promptInstall();
                if (installed) {
                  alert('Aplicativo instalado com sucesso!');
                } else {
                  alert('Para instalar no iPhone/iPad, toque no ícone Compartilhar do Safari e selecione "Adicionar à Tela de Início".');
                }
              }}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition"
            >
              Instalar / Adicionar à Tela Inicial
            </button>
          </div>
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
          onClick={handleResetSeedData}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
        >
          Restaurar Dados Demo
        </button>
      </div>
    </div>
  );
};
