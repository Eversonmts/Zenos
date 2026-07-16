
import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { login, register, resetPassword, loginAsTest, updatePassword } from '../services/auth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isPage?: boolean;
  initialView?: 'login' | 'register' | 'forgot' | 'reset';
}

export default function LoginModal({ isOpen, onClose, onSuccess, isPage = false, initialView = 'login' }: LoginModalProps) {
  const [view, setView] = useState<'login' | 'register' | 'forgot' | 'reset'>(initialView);

  React.useEffect(() => {
    setView(initialView);
  }, [initialView]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  if (!isOpen && !isPage) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (view === 'login') {
        const res = await login(formData.email, formData.password);
        if (res.success) {
          onSuccess();
          onClose();
        } else {
          if (res.message?.includes('Email not confirmed')) {
            setError('Verifique seu e-mail para confirmar seu cadastro antes de entrar.');
          } else {
            setError(res.message || 'E-mail ou senha incorretos.');
          }
        }
      } else if (view === 'register') {
        const res = await register(formData.name, formData.email, formData.password);
        if (res.success) {
          if (res.sessionExists) {
            onSuccess();
            onClose();
          } else {
            setSuccess(res.message || 'Cadastro realizado com sucesso! Por favor, confirme seu cadastro no e-mail recebido antes de entrar.');
            setView('login');
          }
        } else {
          setError(res.message || 'Erro ao cadastrar.');
          if (res.message?.includes('uso')) {
            setTimeout(() => {
              setError('Este e-mail já possui conta. Tente fazer login.');
              setView('login');
            }, 2000);
          }
        }
      } else if (view === 'forgot') {
        const res = await resetPassword(formData.email);
        if (res.success) {
          setSuccess('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
        } else {
          setError(res.message || 'Erro ao processar solicitação.');
        }
      } else if (view === 'reset') {
        const res = await updatePassword(formData.password);
        if (res.success) {
          setSuccess('Senha redefinida com sucesso! Você já está conectado.');
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 1500);
        } else {
          setError(res.message || 'Erro ao redefinir a senha.');
        }
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestLogin = () => {
    setLoading(true);
    setTimeout(() => {
      loginAsTest();
      onSuccess();
      onClose();
      setLoading(false);
    }, 800);
  };

  const containerClasses = isPage 
    ? "min-h-screen bg-slate-50 dark:bg-[#030712] flex items-center justify-center p-6"
    : "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300";

  return (
    <div className={containerClasses}>
      <div className="bg-white dark:bg-[#0a0c14] w-full max-w-md rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-3">
              {view === 'forgot' && (
                <button onClick={() => setView('login')} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                  <ArrowLeft className="w-5 h-5 text-[#5c636a]" />
                </button>
              )}
              <div>
                <h2 className="text-2xl font-black text-[#212529] dark:text-white uppercase tracking-tighter">
                  {view === 'login' ? 'Bem-vindo de volta' : view === 'register' ? 'Criar Conta' : view === 'forgot' ? 'Recuperar Senha' : 'Nova Senha'}
                </h2>
                <p className="text-[#5c636a] dark:text-slate-600 text-xs font-bold uppercase tracking-widest mt-1">
                  {view === 'login' ? 'Acesse sua conta admin ou pessoal' : view === 'register' ? 'Comece sua jornada financeira' : view === 'forgot' ? 'Enviaremos um link para o seu e-mail' : 'Defina sua nova senha de acesso'}
                </p>
              </div>
            </div>
            {!isPage && (
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-[#5c636a]" />
              </button>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-600 animate-in shake duration-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-xs font-bold">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-600 animate-in slide-in-from-top duration-300">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <p className="text-xs font-bold">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {view === 'register' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#5c636a] dark:text-slate-700 uppercase tracking-widest ml-1">Nome Completo</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5c636a]" />
                  <input 
                    type="text" 
                    required 
                    className="w-full pl-12 pr-5 py-4 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl text-sm text-[#212529] dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="Seu nome"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>
            )}

            {view !== 'forgot' && view !== 'reset' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#5c636a] dark:text-slate-700 uppercase tracking-widest ml-1">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5c636a]" />
                  <input 
                    type="email" 
                    required 
                    className="w-full pl-12 pr-5 py-4 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl text-sm text-[#212529] dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="exemplo@email.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>
            )}

            {view !== 'forgot' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black text-[#5c636a] dark:text-slate-700 uppercase tracking-widest">{view === 'reset' ? 'Nova Senha' : 'Senha'}</label>
                  {view === 'login' && (
                    <button 
                      type="button"
                      onClick={() => setView('forgot')}
                      className="text-[10px] font-black text-indigo-600 hover:text-indigo-500 uppercase tracking-widest"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5c636a]" />
                  <input 
                    type="password" 
                    required 
                    className="w-full pl-12 pr-5 py-4 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl text-sm text-[#212529] dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (view === 'login' ? 'Entrar' : view === 'register' ? 'Cadastrar' : view === 'forgot' ? 'Enviar Link' : 'Salvar Senha')}
            </button>

            {view === 'login' && (
              <button 
                type="button"
                onClick={handleTestLogin}
                disabled={loading}
                className="w-full py-4 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                Modo Teste
              </button>
            )}
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 text-center">
            {view === 'forgot' || view === 'reset' ? (
              <button 
                onClick={() => setView('login')}
                className="text-xs font-bold text-[#5c636a] hover:text-indigo-600 transition-colors"
              >
                Voltar para o Login
              </button>
            ) : (
              <button 
                onClick={() => setView(view === 'login' ? 'register' : 'login')}
                className="text-xs font-bold text-[#5c636a] hover:text-indigo-600 transition-colors"
              >
                {view === 'login' ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre agora'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
