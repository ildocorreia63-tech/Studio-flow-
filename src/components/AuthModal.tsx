import React, { useState } from 'react';
import {
  Mail,
  Lock,
  UserPlus,
  LogIn,
  AlertCircle,
  X,
  Globe,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  Phone,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  Send
} from 'lucide-react';
import { DB } from '../services/db';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { Business, UserProfile } from '../types';
import { StudioFlowLogo } from './StudioFlowLogo';
import { buildWhatsAppLink } from '../utils/whatsapp';

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
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password & Direct Reset states
  const [isForgotPass, setIsForgotPass] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetMethod, setResetMethod] = useState<'instant' | 'whatsapp' | 'email'>('instant');
  const [updatedUserBiz, setUpdatedUserBiz] = useState<{ user?: UserProfile; business?: Business } | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const cleanEmail = email.toLowerCase().trim();
      const isMasterEmail =
        cleanEmail === 'admin@studioflow.app' ||
        cleanEmail === '1980burguer@gmail.com';

      // 1. If Supabase configured, attempt sign-in safely without aborting on auth failure
      if (isSupabaseConfigured) {
        try {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          if (!authError && authData?.user) {
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
        } catch (supaErr) {
          console.warn('Supabase auth bypass/fallback:', supaErr);
        }
      }

      // 2. Local database & profiles lookup
      const businesses = DB.getBusinesses();
      const account = DB.lookupAccountByEmail(cleanEmail);

      let targetBiz = account?.business || businesses.find(
        (b) => b.email && b.email.toLowerCase().trim() === cleanEmail
      );

      let matchedProfile: UserProfile | undefined = account?.user;

      if (!targetBiz && businesses.length > 0) {
        targetBiz = businesses[0];
      }

      // Master Administrator special handling: always granted access with SUPER_ADMIN privileges
      if (isMasterEmail) {
        if (!targetBiz) {
          targetBiz = businesses[0];
        }

        if (!matchedProfile && targetBiz) {
          const allProfs = DB.getProfiles(targetBiz.id);
          matchedProfile = allProfs.find((p) => p.email?.toLowerCase().trim() === cleanEmail);
        }

        if (!matchedProfile && targetBiz) {
          matchedProfile = DB.createProfile({
            business_id: targetBiz.id,
            name: targetBiz.owner_name || 'Administrador StudioFlow',
            email: cleanEmail,
            role: 'SUPER_ADMIN',
            phone: targetBiz.whatsapp || targetBiz.phone || '11988887777',
            theme_preference: 'light',
            password: password || 'admin123',
          });
        } else if (matchedProfile) {
          matchedProfile = { ...matchedProfile, role: 'SUPER_ADMIN' };
          if (password) {
            DB.updateProfile(matchedProfile.id, { role: 'SUPER_ADMIN', password });
          }
        }

        if (targetBiz && matchedProfile) {
          onLoginSuccess(matchedProfile, targetBiz);
          return;
        }
      }

      // Standard user lookup
      if (targetBiz && !matchedProfile) {
        const bizProfiles = DB.getProfiles(targetBiz.id);
        matchedProfile =
          bizProfiles.find((p) => p.email && p.email.toLowerCase().trim() === cleanEmail) ||
          bizProfiles[0];
      }

      if (targetBiz && matchedProfile) {
        if (matchedProfile.password && password && matchedProfile.password !== password) {
          setErrorMsg('Senha incorreta. Verifique a senha digitada ou clique em "ESQUECI SENHA" para redefinir na hora.');
          return;
        }
        onLoginSuccess(matchedProfile, targetBiz);
      } else {
        setErrorMsg('E-mail não cadastrado. Verifique o e-mail digitado ou crie uma nova conta em "Criar Conta & Testar Grátis".');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  const handleInstantPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim()) {
      setErrorMsg('Informe o seu e-mail cadastrado.');
      return;
    }
    if (!newPassword.trim()) {
      setErrorMsg('Digite a sua nova senha.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('A confirmação de senha não confere com a nova senha digitada.');
      return;
    }

    setLoading(true);
    try {
      // 1. Reset in local database & profiles
      const res = DB.resetPasswordByEmail(email, newPassword);

      if (!res.success) {
        setErrorMsg(res.message);
        setLoading(false);
        return;
      }

      // 2. If Supabase configured, attempt sync
      if (isSupabaseConfigured) {
        try {
          await supabase.auth.updateUser({ password: newPassword });
        } catch (supaErr) {
          console.warn('Supabase password sync note:', supaErr);
        }
      }

      setPassword(newPassword);
      setUpdatedUserBiz({ user: res.user, business: res.business });
      setResetSuccess(true);
      setSuccessMsg('Senha alterada com sucesso! Você já pode acessar seu painel.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao redefinir a senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailReset = async () => {
    if (!email.trim()) {
      setErrorMsg('Informe seu e-mail para solicitar o envio.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.resetPasswordForEmail(email);
      }
      setSuccessMsg(`Solicitação enviada para ${email}. Se não receber o e-mail em instantes, use a Redefinição Instantânea acima para alterar agora sem depender de e-mail.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Não foi possível disparar o e-mail automático.');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppRecovery = () => {
    if (!email.trim()) {
      setErrorMsg('Informe seu e-mail para localizar os dados de recuperação.');
      return;
    }
    const acc = DB.lookupAccountByEmail(email);
    const targetPhone = acc?.business?.whatsapp || acc?.business?.phone || acc?.user?.phone || '';
    const bizName = acc?.business?.name || 'sua barbearia';
    const message = `Olá! Preciso de ajuda para acessar o painel StudioFlow da empresa *${bizName}* (E-mail: ${email}). Poderia me ajudar com o acesso?`;

    const link = buildWhatsAppLink(targetPhone, message);
    window.open(link, '_blank');
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
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-purple-900/60 hover:bg-purple-800 text-purple-200 flex items-center justify-center transition border border-purple-700/50 cursor-pointer"
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

          {successMsg && !resetSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold rounded-xl flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {resetSuccess ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto text-2xl font-bold shadow-inner">
                ✓
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">Senha Atualizada com Sucesso!</h3>
                <p className="text-xs text-gray-600 dark:text-slate-300 mt-1">
                  A nova senha para o e-mail <strong>{email}</strong> foi gravada.
                </p>
              </div>

              <div className="p-3.5 bg-purple-50 dark:bg-slate-800/80 rounded-2xl border border-purple-100 dark:border-slate-700 text-left space-y-1">
                <p className="text-[11px] font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider">Suas Novas Credenciais:</p>
                <p className="text-xs text-gray-700 dark:text-slate-300"><strong>E-mail:</strong> {email}</p>
                <p className="text-xs text-gray-700 dark:text-slate-300"><strong>Senha:</strong> {newPassword}</p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (updatedUserBiz?.user && updatedUserBiz?.business) {
                      onLoginSuccess(updatedUserBiz.user, updatedUserBiz.business);
                    } else {
                      setResetSuccess(false);
                      setIsForgotPass(false);
                    }
                  }}
                  className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 rounded-xl shadow-lg text-xs tracking-wider uppercase transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Entrar no Painel Agora</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setResetSuccess(false);
                    setIsForgotPass(false);
                  }}
                  className="w-full text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-purple-700 dark:hover:text-purple-400 hover:underline pt-1"
                >
                  Voltar à tela de login
                </button>
              </div>
            </div>
          ) : isForgotPass ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <KeyRound className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">Recuperação de Senha</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPass(false);
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-xs font-semibold text-purple-700 dark:text-purple-400 hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar</span>
                </button>
              </div>

              {/* Notice explaining why instant reset is guaranteed */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-[11px] text-amber-900 dark:text-amber-200">
                <span className="font-bold">⚡ Não precisa esperar pelo e-mail:</span> Defina a sua nova senha diretamente no formulário abaixo para entrar na hora.
              </div>

              <form onSubmit={handleInstantPasswordReset} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    E-mail Cadastrado *
                  </label>
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                      Nova Senha *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 hover:underline flex items-center space-x-1 cursor-pointer"
                      title={showNewPassword ? 'Ocultar senha' : 'Ver senha enquanto digita'}
                    >
                      {showNewPassword ? (
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
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-purple-600 outline-none"
                      placeholder="Mínimo 6 dígitos (ex: novaSenha123)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                      Confirmar Nova Senha *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      {showConfirmPassword ? (
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
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-purple-600 outline-none"
                      placeholder="Repita a nova senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-purple-700 hover:bg-purple-800 text-white font-extrabold py-3 rounded-xl shadow-lg shadow-purple-900/30 text-xs uppercase tracking-wider transition flex items-center justify-center space-x-2 cursor-pointer mt-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{loading ? 'Salvando...' : 'REDEFINIR SENHA & ENTRAR'}</span>
                </button>
              </form>

              {/* Alternative recovery options */}
              <div className="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-2">
                <p className="text-[11px] text-gray-500 dark:text-slate-400 font-semibold text-center">
                  Outras opções de recuperação:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleWhatsAppRecovery}
                    className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-900 dark:text-emerald-300 text-[11px] font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Via WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendEmailReset}
                    className="p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-700 dark:text-slate-300 text-[11px] font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-purple-600" />
                    <span>Tentar E-mail</span>
                  </button>
                </div>
              </div>
            </div>
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
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-purple-700 dark:text-purple-400 hover:underline font-semibold flex items-center space-x-1 cursor-pointer"
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
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPass(true);
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="text-[11px] text-purple-700 dark:text-purple-400 hover:underline font-bold"
                    >
                      ESQUECI SENHA
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-purple-600 outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer"
                    title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
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

              <div className="pt-3 space-y-2 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onOpenSignup}
                  className="w-full border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 font-bold py-2.5 rounded-xl hover:bg-purple-50 dark:hover:bg-slate-800 text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>CRIAR CONTA & TESTAR GRÁTIS</span>
                </button>

                {onViewLandingPage && (
                  <button
                    type="button"
                    onClick={onViewLandingPage}
                    className="w-full text-slate-500 dark:text-slate-400 hover:text-purple-700 dark:hover:text-purple-300 text-xs font-semibold py-1.5 flex items-center justify-center space-x-1 transition cursor-pointer"
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

