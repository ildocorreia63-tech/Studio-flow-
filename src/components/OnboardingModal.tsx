import React, { useState, useEffect } from 'react';
import { Sparkles, Building2, User, Phone, MapPin, Clock, ArrowRight, CheckCircle, ShieldCheck, Zap, X, Lock, Eye, EyeOff } from 'lucide-react';
import { DB } from '../services/db';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { Business, BusinessType, UserProfile, SaaSPlan } from '../types';
import { StudioFlowLogo } from './StudioFlowLogo';
import { PLANS, SubscriptionService } from '../services/subscription';
import { WhatsAppService } from '../utils/whatsapp';
import { getPublicBookingUrl } from '../utils/url';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (business: Business, owner: UserProfile) => void;
  initialPlan?: SaaSPlan;
  onClose?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onComplete,
  initialPlan = 'professional',
  onClose,
}) => {
  const [step, setStep] = useState(1);

  const [selectedPlan, setSelectedPlan] = useState<SaaSPlan>(initialPlan);
  const [businessName, setBusinessName] = useState('');
  const [type, setType] = useState<BusinessType>('Barbearia + Salão');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');
  const [zipCode, setZipCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialPlan) {
      setSelectedPlan(initialPlan);
    }
  }, [initialPlan, isOpen]);

  if (!isOpen) return null;

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!businessName.trim() || !ownerName.trim() || !email.trim() || !whatsapp.trim() || !password.trim()) {
      setErrorMsg('Preencha todos os campos obrigatórios (*), incluindo a sua senha de acesso.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('A senha de acesso deve ter no mínimo 6 caracteres.');
      return;
    }
    setStep(2);
  };

  const handleFinishOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      // Create slug from business name
      const slug = businessName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'studio-' + Date.now();

      const now = new Date();
      const trialEnd = new Date(now.getTime() + 14 * 86400000); // 14 days trial

      if (isSupabaseConfigured) {
        // 1. SignUp in Supabase Auth
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email,
          password: password || '123456',
        });

        if (authErr) {
          throw new Error(authErr.message || 'Erro ao criar conta no Supabase.');
        }

        const userId = authData.user?.id;

        // 2. Insert Business in Supabase
        const { data: createdBiz, error: bizErr } = await supabase
          .from('businesses')
          .insert([
            {
              name: businessName,
              slug,
              type,
              phone: phone || whatsapp,
              whatsapp,
              address: address || 'Endereço Comercial',
              city: city || 'São Paulo',
              state: state || 'SP',
              plan: selectedPlan,
            },
          ])
          .select()
          .single();

        if (bizErr) {
          throw new Error(bizErr.message || 'Erro ao criar estabelecimento no Supabase.');
        }

        // 3. Create Trial Subscription in Supabase
        if (createdBiz) {
          await supabase.from('subscriptions').upsert(
            {
              business_id: createdBiz.id,
              plan_id: selectedPlan,
              status: 'TRIAL',
              started_at: now.toISOString(),
              trial_started_at: now.toISOString(),
              trial_ends_at: trialEnd.toISOString(),
              expires_at: trialEnd.toISOString(),
              updated_at: now.toISOString(),
            },
            { onConflict: 'business_id' }
          );
        }

        // 4. Insert User Profile in Supabase
        if (userId && createdBiz) {
          const { data: createdOwner, error: profileErr } = await supabase
            .from('user_profiles')
            .insert([
              {
                id: userId,
                business_id: createdBiz.id,
                name: ownerName,
                email,
                role: 'OWNER',
                phone: whatsapp,
              },
            ])
            .select()
            .single();

          if (profileErr) {
            console.error('Error inserting user profile:', profileErr);
          }

          const ownerObj = createdOwner || {
            id: userId,
            business_id: createdBiz.id,
            name: ownerName,
            email,
            role: 'OWNER',
            phone: whatsapp,
          };

          // Also mirror and dual-persist locally so it never disappears offline or upon logout/reload
          try {
            const allBiz = DB.getBusinesses();
            if (!allBiz.some((b) => b.id === createdBiz.id)) {
              allBiz.push(createdBiz);
              localStorage.setItem('sf_businesses', JSON.stringify(allBiz));
            }

            // Record local subscription mirror
            const rawSubs = localStorage.getItem('sf_subscriptions');
            const subsList = rawSubs ? JSON.parse(rawSubs) : [];
            const existingSubIdx = subsList.findIndex((s: any) => s.business_id === createdBiz.id);
            const subData = {
              id: `sub-${createdBiz.id}`,
              business_id: createdBiz.id,
              plan_id: selectedPlan,
              status: 'TRIAL',
              started_at: now.toISOString(),
              expires_at: trialEnd.toISOString(),
              trial_started_at: now.toISOString(),
              trial_ends_at: trialEnd.toISOString(),
              created_at: now.toISOString(),
              updated_at: now.toISOString(),
            };
            if (existingSubIdx === -1) {
              subsList.push(subData);
            } else {
              subsList[existingSubIdx] = { ...subsList[existingSubIdx], ...subData };
            }
            localStorage.setItem('sf_subscriptions', JSON.stringify(subsList));

            const allProfiles = DB.getProfiles(createdBiz.id);
            if (!allProfiles.some((p) => p.id === ownerObj.id)) {
              DB.createProfile({
                business_id: createdBiz.id,
                name: ownerName,
                email,
                password: password.trim(),
                role: 'OWNER',
                phone: whatsapp,
              });
            }
            SubscriptionService.invalidateSubscriptionCache(createdBiz.id);
            DB.syncSubscribersToVault();
          } catch (e) {
            console.warn('Local mirror error:', e);
          }

          // Disparar confirmação e boas-vindas no WhatsApp do Dono
          const bookingUrl = getPublicBookingUrl(createdBiz.slug || slug);
          const planName = PLANS[selectedPlan]?.name || 'Profissional';
          const waUrl = WhatsAppService.sendOwnerWelcomeNotification({
            ownerName,
            ownerPhone: whatsapp,
            businessName,
            planName,
            email,
            bookingUrl,
          });

          // Abre mensagem de boas-vindas no WhatsApp do dono
          window.open(waUrl, '_blank');

          onComplete(createdBiz, ownerObj);
          return;
        }
      }

      // Fallback Local Storage Creation
      const createdBiz = DB.createBusiness({
        name: businessName,
        type,
        owner_name: ownerName,
        email,
        phone: phone || whatsapp,
        whatsapp,
        address: address || 'Endereço Comercial',
        city: city || 'São Paulo',
        state: state || 'SP',
        zip_code: zipCode || '00000-000',
        slug,
        plan: selectedPlan,
      });

      // Save local subscription entry
      const rawSubs = localStorage.getItem('sf_subscriptions');
      const subsList = rawSubs ? JSON.parse(rawSubs) : [];
      subsList.push({
        id: `sub-${createdBiz.id}`,
        business_id: createdBiz.id,
        plan_id: selectedPlan,
        status: 'TRIAL',
        started_at: now.toISOString(),
        expires_at: trialEnd.toISOString(),
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEnd.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });
      localStorage.setItem('sf_subscriptions', JSON.stringify(subsList));

      const createdOwner = DB.createProfile({
        business_id: createdBiz.id,
        name: ownerName,
        email,
        password: password.trim(),
        role: 'OWNER',
        phone: whatsapp,
      });

      // Disparar confirmação e boas-vindas no WhatsApp do Dono
      const bookingUrl = getPublicBookingUrl(createdBiz.slug || slug);
      const planName = PLANS[selectedPlan]?.name || 'Profissional';
      const waUrl = WhatsAppService.sendOwnerWelcomeNotification({
        ownerName,
        ownerPhone: whatsapp,
        businessName,
        planName,
        email,
        bookingUrl,
      });

      window.open(waUrl, '_blank');

      onComplete(createdBiz, createdOwner);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao finalizar cadastro do estabelecimento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-purple-100 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 p-6 sm:p-8 text-white relative">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-purple-900/60 hover:bg-purple-800 text-purple-200 flex items-center justify-center transition border border-purple-700/50"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center space-x-3.5 mb-2">
            <StudioFlowLogo
              variant="icon"
              size="md"
            />
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">Criar Minha Barbearia / Salão</h2>
              <p className="text-xs text-purple-200">14 Dias de Teste Grátis • Ativação Imediata do Painel</p>
            </div>
          </div>

          {/* Stepper Progress */}
          <div className="flex items-center space-x-4 mt-6 pt-4 border-t border-purple-800/60">
            <div className={`flex items-center space-x-2 text-xs font-bold ${step >= 1 ? 'text-purple-200' : 'text-purple-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-purple-600 text-white' : 'bg-purple-900 text-purple-400'}`}>1</span>
              <span>Dados & Plano</span>
            </div>
            <div className="flex-1 h-0.5 bg-purple-800/80"></div>
            <div className={`flex items-center space-x-2 text-xs font-bold ${step >= 2 ? 'text-purple-200' : 'text-purple-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-purple-600 text-white' : 'bg-purple-900 text-purple-400'}`}>2</span>
              <span>Endereço & Confirmação</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
              {errorMsg}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleNextStep1} className="space-y-6">
              {/* Plan Selection Box */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Selecione o Plano Inicial (14 Dias de Teste Grátis):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['basic', 'professional', 'premium'] as SaaSPlan[]).map((pKey) => {
                    const pDef = PLANS[pKey];
                    const isSelected = selectedPlan === pKey;
                    return (
                      <button
                        type="button"
                        key={pKey}
                        onClick={() => setSelectedPlan(pKey)}
                        className={`p-3.5 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-purple-50 border-2 border-purple-600 ring-2 ring-purple-600/20 shadow-md'
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {pKey === 'professional' && (
                          <span className="text-[9px] font-black uppercase tracking-wider text-purple-700 bg-purple-200/80 px-2 py-0.5 rounded-full self-start mb-1">
                            Mais Escolhido
                          </span>
                        )}
                        <div>
                          <p className="font-extrabold text-sm text-gray-900">{pDef.name}</p>
                          <p className="text-xs font-bold text-purple-700 mt-0.5">{pDef.priceMonthly}</p>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-2 font-medium">
                          {pDef.limits.maxProfessionals === 999999 ? 'Equipe Ilimitada' : `Até ${pDef.limits.maxProfessionals} profissionais`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Nome do Estabelecimento *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Barbearia & Studio Don Juan"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Tipo de Estabelecimento *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as BusinessType)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-600 outline-none"
                  >
                    <option value="Barbearia">Barbearia</option>
                    <option value="Salão">Salão de Beleza</option>
                    <option value="Barbearia + Salão">Barbearia + Salão</option>
                    <option value="Estética">Estética</option>
                    <option value="Manicure">Manicure & Nails</option>
                    <option value="Studio">Studio de Sobrancelhas / Cílios</option>
                    <option value="Outro">Outro Profissional Autônomo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Nome do Proprietário *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Andrade"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    E-mail do Proprietário *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="admin@seunegocio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    WhatsApp Comercial (com DDD) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 11988887777"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-600 outline-none"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">A confirmação e comprovante serão enviados neste WhatsApp.</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Criar Senha de Acesso *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 flex items-center space-x-1 cursor-pointer transition"
                      title={showPassword ? 'Ocultar senha' : 'Ver senha enquanto digita'}
                    >
                      {showPassword ? (
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
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Mínimo 6 dígitos (ex: senha123)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 cursor-pointer"
                      title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">Usada para fazer login no painel com o seu e-mail.</p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 px-8 rounded-xl shadow-lg flex items-center space-x-2 transition cursor-pointer"
                >
                  <span>Avançar para Endereço</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleFinishOnboarding} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Endereço Comercial
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Av. Paulista, 1000 - Bela Vista"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    placeholder="São Paulo"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Estado (UF)
                  </label>
                  <input
                    type="text"
                    placeholder="SP"
                    maxLength={2}
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-600 outline-none uppercase"
                  />
                </div>
              </div>

              {/* Confirmation Banner */}
              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 space-y-2">
                <div className="flex items-center space-x-2 text-purple-900 font-extrabold text-xs">
                  <ShieldCheck className="w-4 h-4 text-purple-700" />
                  <span>Resumo da Assinatura:</span>
                </div>
                <div className="text-xs text-purple-900 space-y-1">
                  <p>• <strong>Plano:</strong> {PLANS[selectedPlan]?.name} ({PLANS[selectedPlan]?.priceMonthly})</p>
                  <p>• <strong>Período de Teste:</strong> 14 Dias Grátis Ativados Automático</p>
                  <p>• <strong>WhatsApp Administrador:</strong> {whatsapp}</p>
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                >
                  Voltar
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 px-8 rounded-xl shadow-lg flex items-center space-x-2 transition cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <span>Cadastrando...</span>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Cadastrar & Abrir Meu Painel</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
