import React, { useState } from 'react';
import { Sparkles, Mail, Lock, ArrowRight, UserPlus, LogIn, AlertCircle } from 'lucide-react';
import { DB } from '../services/db';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { Business, UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: UserProfile, business: Business) => void;
  onOpenSignup: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onLoginSuccess, onOpenSignup }) => {
  const [email, setEmail] = useState('admin@studioflow.app');
  const [password, setPassword] = useState('123456');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isForgotPass, setIsForgotPass] = useState(false);

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

      // Default fallback if admin@studioflow.app
      if (!targetBiz && email.toLowerCase() === 'admin@studioflow.app') {
        targetBiz = businesses[0];
        if (targetBiz) {
          matchedProfile = DB.getProfiles(targetBiz.id)[0] || ({
            id: 'usr-admin',
            business_id: targetBiz.id,
            name: targetBiz.owner_name,
            email: 'admin@studioflow.app',
            role: 'OWNER',
            created_at: new Date().toISOString(),
          } as UserProfile);
        }
      }

      if (targetBiz && matchedProfile) {
        onLoginSuccess(matchedProfile, targetBiz);
      } else {
        setErrorMsg('E-mail não cadastrado. Verifique o e-mail ou crie uma nova conta em "Criar Conta".');
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
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-purple-100 my-8">
        {/* Header */}
        <div className="bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 p-8 text-white text-center">
          <div className="w-14 h-14 rounded-2xl bg-purple-700/60 mx-auto flex items-center justify-center mb-3 shadow-lg shadow-purple-950">
            <Sparkles className="w-8 h-8 text-purple-200" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">STUDIOFLOW</h2>
          <p className="text-xs text-purple-200 mt-1">Gestão inteligente para seu negócio de beleza.</p>
        </div>

        <div className="p-8">
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {resetSuccess ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl">
                ✓
              </div>
              <h3 className="text-lg font-bold text-gray-900">Link enviado!</h3>
              <p className="text-xs text-gray-600">
                Enviamos as instruções de recuperação de senha para <strong>{email}</strong>.
              </p>
              <button
                type="button"
                onClick={() => {
                  setResetSuccess(false);
                  setIsForgotPass(false);
                }}
                className="mt-2 text-xs font-bold text-purple-700 hover:underline"
              >
                Voltar para o Login
              </button>
            </div>
          ) : isForgotPass ? (
            <form onSubmit={handleForgotPass} className="space-y-4">
              <h3 className="text-base font-bold text-gray-900 text-center">Recuperação de Senha</h3>
              <p className="text-xs text-gray-500 text-center">Digite seu e-mail para receber o link de redefinição.</p>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">E-mail</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-600 outline-none"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 rounded-xl shadow-md text-sm transition"
              >
                RECUPERAR SENHA
              </button>

              <button
                type="button"
                onClick={() => setIsForgotPass(false)}
                className="w-full text-xs font-bold text-gray-600 hover:underline text-center block pt-2"
              >
                Voltar ao Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">E-mail</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-600 outline-none"
                    placeholder="admin@studioflow.app"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Senha</label>
                  <button
                    type="button"
                    onClick={() => setIsForgotPass(true)}
                    className="text-[11px] text-purple-700 hover:underline font-semibold"
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
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-600 outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-900/30 text-sm flex items-center justify-center space-x-2 transition"
              >
                <LogIn className="w-4 h-4" />
                <span>ENTRAR</span>
              </button>

              <div className="pt-4 text-center border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Novo por aqui?</p>
                <button
                  type="button"
                  onClick={onOpenSignup}
                  className="w-full border border-purple-200 text-purple-800 font-bold py-2.5 rounded-xl hover:bg-purple-50 text-xs transition"
                >
                  CRIAR CONTA & ONBOARDING
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
