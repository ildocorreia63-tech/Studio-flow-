import React, { useState, useEffect } from 'react';
import { Sparkles, Mail, Lock, ArrowRight, UserPlus, LogIn, AlertCircle, X, Globe, Building2, ChevronRight, Store } from 'lucide-react';
import { DB } from '../services/db';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { Business, UserProfile } from '../types';
import { StudioFlowLogo } from './StudioFlowLogo';

interface AuthModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: UserProfile, business: Business) => void;
  onOpenSignup: () => void;
  onClose?: () => void;
  onViewLandingPage?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onLoginSuccess,
  onOpenSignup,
  onClose,
  onViewLandingPage,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isForgotPass, setIsForgotPass] = useState(false);
  const [savedBusinesses, setSavedBusinesses] = useState<Business[]>([]);

  useEffect(() => {
    if (isOpen) {
      const bizList = DB.getBusinesses();
      setSavedBusinesses(bizList);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isSupabaseConfigured) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          throw new Error(authError.message || 'E-mail ou senha inválidos no Supabase.');
        }

        if (authData.user) {
          // Fetch user profile from Supabase
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

          if (profile && profile.business_id) {
            const { data: biz } = await supabase
              .from('businesses')
              .select('*')
              .eq('id', profile.business_id)
              .single();

            if (biz) {
              onLoginSuccess(profile, biz);
              return;
            }
          }
        }
      }

      // Fallback local lookup: search all businesses and user profiles for isolation
      const businesses = DB.getBusinesses();

      // Find business where email matches or where profile matches
      let targetBiz = businesses.find(
        (b) => b.email && b.email.toLowerCase() === email.toLowerCase()
      );

      let matchedProfile: UserProfile | undefined;

      if (targetBiz) {
        const bizProfiles = DB.getProfiles(targetBiz.id);
        matchedProfile =
          bizProfiles.find((p) => p.email.toLowerCase() === email.toLowerCase()) ||
          bizProfiles[0] ||
          ({
            id: 'usr-' + targetBiz.id,
            business_id: targetBiz.id,
            name: targetBiz.owner_name || targetBiz.name,
            email: targetBiz.email,
            role: 'OWNER',
            created_at: new Date().toISOString(),
          } as UserProfile);
      } else {
        // Search across all profiles
        for (const b of businesses) {
          const profs = DB.getProfiles(b.id);
          const p = profs.find((prof) => prof.email.toLowerCase() === email.toLowerCase());
          if (p) {
            matchedProfile = p;
            targetBiz = b;
            break;
          }
        }
      }

      // Default fallback if master admin email
      const isMasterEmail =
        email.toLowerCase().trim() === 'admin@studioflow.app' ||
        email.toLowerCase().trim() === '1980burguer@gmail.com';

      if (!targetBiz && isMasterEmail) {
        targetBiz = businesses[0];
      }

      if (isMasterEmail && matchedProfile) {
        matchedProfile = { ...matchedProfile, role: 'SUPER_ADMIN' };
      } else if (!matchedProfile && targetBiz && isMasterEmail) {
        matchedProfile = {
          id: 'usr-admin',
          business_id: targetBiz.id,
          name: targetBiz.owner_name || 'Admin StudioFlow',
          email: email.toLowerCase().trim(),
          role: 'SUPER_ADMIN',
          created_at: new Date().toISOString(),
        } as UserProfile;
      }

      if (targetBiz && matchedProfile) {
        onLoginSuccess(matchedProfile, targetBiz);
      } else {
        setErrorMsg('E-mail não cadastrado. Verifique o e-mail digitado ou crie uma nova conta em "Criar Conta & Onboarding".');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Informe seu e-mail para recuperar a senha.');
      return;
    }
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.resetPasswordForEmail(email);
      }
      setResetSuccess(true);
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao solicitar recuperação de senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-purple-100 dark:border-slate-800 my-8 transition-colors">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 p-7 text-white text-center relative border-b border-purple-900/40">
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
          <StudioFlowLogo
            variant="full"
            size="lg"
            showSubtitle={true}
            className="mx-auto"
          />
          <p className="text-xs text-purple-200/90 mt-2 font-medium">Gestão inteligente para seu negócio de beleza</p>
        </div>

        <div className="p-6 sm:p-8">
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {resetSuccess ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                ✓
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Link enviado!</h3>
              <p className="text-xs text-gray-600 dark:text-slate-300">
                Enviamos as instruções de recuperação de senha para <strong>{email}</strong>.
              </p>
              <button
                type="button"
                onClick={() => {
                  setResetSuccess(false);
                  setIsForgotPass(false);
                }}
                className="mt-2 text-xs font-bold text-purple-700 dark:text-purple-400 hover:underline"
              >
                Voltar para o Login
              </button>
            </div>
          ) : isForgotPass ? (
            <form onSubmit={handleForgotPass} className="space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white text-center">Recuperação de Senha</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 text-center">Digite seu e-mail para receber o link de redefinição.</p>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">E-mail</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-purple-600 outline-none"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 rounded-xl shadow-md text-sm transition flex items-center justify-center space-x-2"
              >
                {loading ? <span>Enviando...</span> : <span>RECUPERAR SENHA</span>}
              </button>

              <button
                type="button"
                onClick={() => setIsForgotPass(false)}
                className="w-full text-xs font-bold text-gray-600 dark:text-slate-400 hover:underline text-center block pt-2"
              >
                Voltar ao Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">E-mail</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-purple-600 outline-none"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Senha</label>
                  <button
                    type="button"
                    onClick={() => setIsForgotPass(true)}
                    className="text-[11px] text-purple-700 dark:text-purple-400 hover:underline font-semibold"
                  >
                    ESQUECI MINHA SENHA
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-purple-600 outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-900/30 text-sm flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'ACESSANDO...' : 'ENTRAR'}</span>
              </button>

              {/* Barbearias salvas neste navegador / dispositivo */}
              {savedBusinesses.length > 0 && (
                <div className="pt-2">
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1">
                    <Store className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Barbearias salvas neste dispositivo:</span>
                  </p>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {savedBusinesses.map((biz) => (
                      <button
                        key={biz.id}
                        type="button"
                        onClick={() => {
                          if (biz.email) {
                            setEmail(biz.email);
                          }
                          // Auto login if fallback
                          const profs = DB.getProfiles(biz.id);
                          const prof = profs[0] || {
                            id: 'usr-' + biz.id,
                            business_id: biz.id,
                            name: biz.owner_name || biz.name,
                            email: biz.email || 'contato@barbearia.com',
                            role: 'OWNER',
                            created_at: new Date().toISOString(),
                          };
                          onLoginSuccess(prof, biz);
                        }}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-200 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-purple-700 rounded-xl flex items-center justify-between text-left transition group cursor-pointer"
                      >
                        <div className="min-w-0 flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0">
                            {biz.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-purple-700 dark:group-hover:text-purple-300">
                              {biz.name}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {biz.email || biz.owner_name}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 transition shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 space-y-2 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onOpenSignup}
                  className="w-full border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 font-bold py-2.5 rounded-xl hover:bg-purple-50 dark:hover:bg-slate-800 text-xs transition flex items-center justify-center space-x-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>CRIAR CONTA & TESTAR GRÁTIS</span>
                </button>

                {onViewLandingPage && (
                  <button
                    type="button"
                    onClick={onViewLandingPage}
                    className="w-full text-slate-500 dark:text-slate-400 hover:text-purple-700 dark:hover:text-purple-300 text-xs font-semibold py-1.5 flex items-center justify-center space-x-1 transition"
                  >
                    <Globe className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Conhecer Planos & Apresentação (Página Inicial)</span>
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

