
import React, { useState, useEffect } from 'react';
import { Category, Profile, Subcategory, Settings as SettingsType } from '../types';
import { Settings as SettingsIcon, Plus, Trash2, Edit2, Check, X, Tag, Moon, Sun, Share2, CreditCard, Crown, Loader2, Clock, Database, Shield, Lock, Fingerprint, Cpu, RefreshCw, AlertCircle, ArrowUpCircle, Sparkles, ChevronDown, ChevronUp, KeyRound } from 'lucide-react';
import { formatDisplayDate } from '../lib/utils';
import { db } from '../services/db';
import { testSupabaseConnection } from '../services/supabase';
import { CURRENT_VERSION, checkLatestVersion, applyAndReloadUpdate, publishNewVersion } from '../services/versionService';

interface SettingsProps {
  categories: Category[];
  onUpdateCategories: (cats: Category[]) => void;
  subcategories: Subcategory[];
  onUpdateSubcategories: (subs: Subcategory[]) => void;
  settings: SettingsType[];
  onUpdateSettings: (settings: SettingsType[]) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  currentTheme: 'dark' | 'light';
  toggleTheme: () => void;
  profile: Profile;
  onUpdateProfile: (profile: Profile) => void;
  initialTab?: 'categories' | 'appearance' | 'subscription' | 'profile';
}

export default function Settings({ 
  categories, 
  onUpdateCategories, 
  subcategories,
  onUpdateSubcategories,
  settings,
  onUpdateSettings,
  showToast, 
  currentTheme, 
  toggleTheme,
  profile,
  onUpdateProfile,
  initialTab = 'categories'
}: SettingsProps) {
  const [activeTab, setActiveTab] = useState<'categories' | 'appearance' | 'subscription' | 'profile' | 'payments' | 'database' | 'security' | 'system'>(initialTab as any);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'income' | 'expense'>('expense');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [geminiKeyInput, setGeminiKeyInput] = useState(() => localStorage.getItem('zenos_gemini_api_key') || '');
  const [geminiKeySaved, setGeminiKeySaved] = useState(false);

  const [pin, setPin] = useState(profile.security_pin || '');
  const [biometry, setBiometry] = useState(profile.biometry_enabled || false);

  const [profileData, setProfileData] = useState({
    full_name: profile.full_name || '',
    email: profile.email || '',
    phone: profile.phone || '',
  });
  const [showPassword, setShowPassword] = useState(false);

  // Estados de Versionamento e Atualização
  const [latestVersion, setLatestVersion] = useState(CURRENT_VERSION);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [releaseNotes, setReleaseNotes] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  // Estados do Administrador para Publicar Versão
  const [adminNewVersion, setAdminNewVersion] = useState('');
  const [adminNewNotes, setAdminNewNotes] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    const syncedKey = settings[0]?.meta_json?.gemini_api_key;
    if (syncedKey && syncedKey !== localStorage.getItem('zenos_gemini_api_key')) {
      localStorage.setItem('zenos_gemini_api_key', syncedKey);
      setGeminiKeyInput(syncedKey);
    }
  }, [settings]);

  useEffect(() => {
    // Verificação automática de atualizações em segundo plano ao abrir as configurações
    const performBackgroundCheck = async () => {
      try {
        const res = await checkLatestVersion();
        setLatestVersion(res.latestVersion);
        setIsUpdateAvailable(res.isUpdateAvailable);
        setReleaseNotes(res.notes || '');
        setReleaseDate(res.releaseDate || '');
      } catch (err) {
        console.warn("Silent version check failed on mount:", err);
      }
    };
    performBackgroundCheck();
  }, []);

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const newCat: Category = {
      id: crypto.randomUUID(),
      user_id: profile.id,
      name: newCatName,
      type: newCatType,
      color: null,
      icon: null,
      is_default: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    onUpdateCategories([...categories, newCat]);
    setNewCatName('');
    showToast('Categoria criada com sucesso!', 'success');
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm('Tem certeza? Isso pode afetar registros históricos.')) {
      onUpdateCategories(categories.filter(c => c.id !== id));
      onUpdateSubcategories(subcategories.filter(s => s.category_id !== id));
      showToast('Categoria removida', 'info');
    }
  };

  const handleAddSubcategory = (categoryId: string) => {
    if (!newSubName.trim()) return;
    const newSub: Subcategory = {
      id: crypto.randomUUID(),
      user_id: profile.id,
      category_id: categoryId,
      name: newSubName.trim(),
      created_at: new Date().toISOString()
    };
    onUpdateSubcategories([...subcategories, newSub]);
    setNewSubName('');
    showToast('Subcategoria criada!', 'success');
  };

  const handleDeleteSubcategory = (id: string) => {
    onUpdateSubcategories(subcategories.filter(s => s.id !== id));
    showToast('Subcategoria removida', 'info');
  };

  const handleAddSubCategory = (catId: string) => {
    // Feature em revisão
  };

  const handleDeleteSubCategory = (catId: string, subId: string) => {
    // Feature em revisão
  };

  const handleAddPaymentMethod = () => {
    // Feature em revisão
  };

  const handleDeletePaymentMethod = (method: string) => {
    // Feature em revisão
  };

  const shareApp = () => {
      const url = window.location.href;
      const text = `Gerencie suas finanças com o ZenOS Finance! Instale agora: ${url}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(whatsappUrl, '_blank');
  };

  const [tempMenuSize, setTempMenuSize] = useState<Profile['menu_size']>(profile.menu_size || 'md');

  const handleSaveAppearance = () => {
    onUpdateProfile({ ...profile, menu_size: tempMenuSize });
    showToast('Aparência atualizada!', 'success');
  };

  const handleSaveSecurity = () => {
    if (pin && pin.length !== 4) {
      showToast('O PIN deve ter 4 dígitos!', 'error');
      return;
    }
    onUpdateProfile({ 
      ...profile, 
      security_pin: pin || null, 
      biometry_enabled: biometry 
    });
    showToast('Configurações de segurança salvas!', 'success');
  };

  const handleSaveGeminiKey = () => {
    const trimmed = geminiKeyInput.trim();
    localStorage.setItem('zenos_gemini_api_key', trimmed);

    const currentSettings = settings[0];
    const updated: SettingsType = currentSettings
      ? { ...currentSettings, meta_json: { ...(currentSettings.meta_json || {}), gemini_api_key: trimmed } }
      : { id: crypto.randomUUID(), user_id: profile.id, currency: 'BRL', language: 'pt-BR', theme: currentTheme, notifications_enabled: true, meta_json: { gemini_api_key: trimmed }, updated_at: new Date().toISOString() } as SettingsType;

    onUpdateSettings(currentSettings ? settings.map(s => s.id === updated.id ? updated : s) : [...settings, updated]);
    setGeminiKeySaved(true);
    showToast('Chave da API Gemini salva!', 'success');
    setTimeout(() => setGeminiKeySaved(false), 2000);
  };

  const handleSaveProfile = () => {
    onUpdateProfile({
      ...profile,
      ...profileData
    });
    showToast('Perfil atualizado com sucesso!', 'success');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-6">
        <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-600/20">
          <SettingsIcon className="w-6 h-6 text-white" />
        </div>
        <div>
           <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Ajustes do Sistema</h2>
           <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">Personalize sua experiência</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Menu Lateral */}
        <div className="w-full lg:w-72 space-y-2">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'bg-white dark:bg-[#0a0c14] text-slate-600 hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-200 dark:border-white/5'}`}
          >
            <div className={`p-2 rounded-xl ${activeTab === 'profile' ? 'bg-white/20' : 'bg-indigo-50 dark:bg-indigo-500/10'}`}>
              <SettingsIcon className={`w-5 h-5 ${activeTab === 'profile' ? 'text-white' : 'text-indigo-600'}`} />
            </div>
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-widest">Perfil</p>
              <p className={`text-[9px] font-bold ${activeTab === 'profile' ? 'text-indigo-100' : 'text-slate-400'}`}>Meus dados e senha</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveTab('categories')}
            className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all ${activeTab === 'categories' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'bg-white dark:bg-[#0a0c14] text-slate-600 hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-200 dark:border-white/5'}`}
          >
            <div className={`p-2 rounded-xl ${activeTab === 'categories' ? 'bg-white/20' : 'bg-emerald-50 dark:bg-emerald-500/10'}`}>
              <Tag className={`w-5 h-5 ${activeTab === 'categories' ? 'text-white' : 'text-emerald-600'}`} />
            </div>
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-widest">Categorias</p>
              <p className={`text-[9px] font-bold ${activeTab === 'categories' ? 'text-indigo-100' : 'text-slate-400'}`}>Gestão de gastos</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveTab('payments')}
            className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all ${activeTab === 'payments' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'bg-white dark:bg-[#0a0c14] text-slate-600 hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-200 dark:border-white/5'}`}
          >
            <div className={`p-2 rounded-xl ${activeTab === 'payments' ? 'bg-white/20' : 'bg-amber-50 dark:bg-amber-500/10'}`}>
              <CreditCard className={`w-5 h-5 ${activeTab === 'payments' ? 'text-white' : 'text-amber-600'}`} />
            </div>
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-widest">Pagamentos</p>
              <p className={`text-[9px] font-bold ${activeTab === 'payments' ? 'text-indigo-100' : 'text-slate-400'}`}>Métodos aceitos</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveTab('subscription')}
            className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all ${activeTab === 'subscription' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'bg-white dark:bg-[#0a0c14] text-slate-600 hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-200 dark:border-white/5'}`}
          >
            <div className={`p-2 rounded-xl ${activeTab === 'subscription' ? 'bg-white/20' : 'bg-purple-50 dark:bg-purple-500/10'}`}>
              <Crown className={`w-5 h-5 ${activeTab === 'subscription' ? 'text-white' : 'text-purple-600'}`} />
            </div>
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-widest">Ser Pró</p>
              <p className={`text-[9px] font-bold ${activeTab === 'subscription' ? 'text-indigo-100' : 'text-slate-400'}`}>ZenOS Premium</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveTab('appearance')}
            className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all ${activeTab === 'appearance' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'bg-white dark:bg-[#0a0c14] text-slate-600 hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-200 dark:border-white/5'}`}
          >
            <div className={`p-2 rounded-xl ${activeTab === 'appearance' ? 'bg-white/20' : 'bg-slate-50 dark:bg-slate-500/10'}`}>
              <Moon className={`w-5 h-5 ${activeTab === 'appearance' ? 'text-white' : 'text-slate-600'}`} />
            </div>
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-widest">Aparência</p>
              <p className={`text-[9px] font-bold ${activeTab === 'appearance' ? 'text-indigo-100' : 'text-slate-400'}`}>Tema e tamanhos</p>
            </div>
          </button>

          {profile.role === 'admin' && (
          <button 
            onClick={() => setActiveTab('database')}
            className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all ${activeTab === 'database' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'bg-white dark:bg-[#0a0c14] text-slate-600 hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-200 dark:border-white/5'}`}
          >
            <div className={`p-2 rounded-xl ${activeTab === 'database' ? 'bg-white/20' : 'bg-cyan-50 dark:bg-cyan-500/10'}`}>
              <Database className={`w-5 h-5 ${activeTab === 'database' ? 'text-white' : 'text-cyan-600'}`} />
            </div>
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-widest">Sincronização</p>
              <p className={`text-[9px] font-bold ${activeTab === 'database' ? 'text-indigo-100' : 'text-slate-400'}`}>Status do Supabase</p>
            </div>
          </button>
          )}

          <button 
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all ${activeTab === 'security' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'bg-white dark:bg-[#0a0c14] text-slate-600 hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-200 dark:border-white/5'}`}
          >
            <div className={`p-2 rounded-xl ${activeTab === 'security' ? 'bg-white/20' : 'bg-rose-50 dark:bg-rose-500/10'}`}>
              <Shield className={`w-5 h-5 ${activeTab === 'security' ? 'text-white' : 'text-rose-600'}`} />
            </div>
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-widest">Segurança</p>
              <p className={`text-[9px] font-bold ${activeTab === 'security' ? 'text-indigo-100' : 'text-slate-400'}`}>PIN e Biometria</p>
            </div>
          </button>

          {profile.role === 'admin' && (
          <button 
            onClick={() => setActiveTab('system')}
            className={`relative w-full flex items-center gap-4 p-4 rounded-3xl transition-all ${activeTab === 'system' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'bg-white dark:bg-[#0a0c14] text-slate-600 hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-200 dark:border-white/5'}`}
          >
            <div className={`p-2 rounded-xl ${activeTab === 'system' ? 'bg-white/20' : 'bg-blue-50 dark:bg-blue-500/10'}`}>
              <Cpu className={`w-5 h-5 ${activeTab === 'system' ? 'text-white' : 'text-blue-500'}`} />
            </div>
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                Sistema
                {isUpdateAvailable && (
                  <span className="inline-block w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                )}
              </p>
              <p className={`text-[9px] font-bold ${activeTab === 'system' ? 'text-indigo-100' : 'text-slate-400'}`}>Versão e Atualização</p>
            </div>
          </button>
          )}
        </div>

        {/* Conteúdo Principal */}
        <div className="flex-1 bg-white dark:bg-[#0a0c14] border border-slate-200 dark:border-white/5 rounded-[2.5rem] overflow-hidden shadow-xl dark:shadow-none min-h-[500px]">
           <div className="p-6 md:p-10">
              {activeTab === 'profile' && (
              <div className="space-y-6">
                {!isEditingProfile ? (
                  <div className="space-y-8">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Meus Dados</h3>
                      <button 
                        onClick={() => setIsEditingProfile(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Editar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {profileData.name && (
                        <div className="p-4 bg-slate-50 dark:bg-[#030712] rounded-2xl border border-slate-200 dark:border-slate-800">
                          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Nome Completo</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{profileData.name}</p>
                        </div>
                      )}
                      {profileData.email && (
                        <div className="p-4 bg-slate-50 dark:bg-[#030712] rounded-2xl border border-slate-200 dark:border-slate-800">
                          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Email</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{profileData.email}</p>
                        </div>
                      )}
                      {profileData.phone && (
                        <div className="p-4 bg-slate-50 dark:bg-[#030712] rounded-2xl border border-slate-200 dark:border-slate-800">
                          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Telefone</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{profileData.phone}</p>
                        </div>
                      )}
                      {profileData.cpf && (
                        <div className="p-4 bg-slate-50 dark:bg-[#030712] rounded-2xl border border-slate-200 dark:border-slate-800">
                          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">CPF</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{profileData.cpf}</p>
                        </div>
                      )}
                      {profileData.income > 0 && (
                        <div className="p-4 bg-slate-50 dark:bg-[#030712] rounded-2xl border border-slate-200 dark:border-slate-800">
                          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Renda Mensal</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">R$ {profileData.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                      )}
                      {profileData.profession && (
                        <div className="p-4 bg-slate-50 dark:bg-[#030712] rounded-2xl border border-slate-200 dark:border-slate-800">
                          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Profissão</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{profileData.profession}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Editando Perfil</h3>
                      <button 
                        onClick={() => setIsEditingProfile(false)}
                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Nome Completo</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-[#030712] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                          value={profileData.name}
                          onChange={e => setProfileData({...profileData, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Email</label>
                        <input 
                          type="email" 
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-[#030712] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                          value={profileData.email}
                          onChange={e => setProfileData({...profileData, email: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Telefone</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-[#030712] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                          value={profileData.phone}
                          onChange={e => setProfileData({...profileData, phone: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">CPF</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-[#030712] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                          value={profileData.cpf}
                          onChange={e => setProfileData({...profileData, cpf: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Renda Mensal</label>
                        <input 
                          type="number" 
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-[#030712] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                          value={profileData.income}
                          onChange={e => setProfileData({...profileData, income: Number(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Profissão</label>
                        <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-[#030712] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                          value={profileData.profession}
                          onChange={e => setProfileData({...profileData, profession: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Senha</label>
                        <div className="relative">
                          <input 
                            type={showPassword ? "text" : "password"} 
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-[#030712] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                            value={profileData.password}
                            onChange={e => setProfileData({...profileData, password: e.target.value})}
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500"
                          >
                            {showPassword ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <button 
                        onClick={() => setIsEditingProfile(false)}
                        className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={() => {
                          handleSaveProfile();
                          setIsEditingProfile(false);
                        }}
                        className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
                      >
                        Salvar Alterações
                      </button>
                    </div>
                  </div>
                )}

                {/* Chave de API do Gemini (usada pelo Consultor IA) */}
                <div className="p-6 bg-slate-50 dark:bg-[#0a0c14] rounded-3xl border border-slate-200 dark:border-white/5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                      <KeyRound className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Chave da API Gemini</p>
                      <p className="text-[10px] text-slate-500">Usada pelo Consultor IA. Gere a sua em aistudio.google.com/apikey</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      className="flex-1 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                      value={geminiKeyInput}
                      onChange={e => { setGeminiKeyInput(e.target.value); setGeminiKeySaved(false); }}
                    />
                    <button
                      onClick={handleSaveGeminiKey}
                      className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-500 transition-all shrink-0"
                    >
                      {geminiKeySaved ? <Check className="w-4 h-4" /> : 'Salvar'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'categories' && (
              <div className="space-y-8">
                {/* Add New Category */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-white/5">
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Nova Categoria</h3>
                   <div className="flex flex-col md:flex-row gap-4">
                      <input 
                        type="text" 
                        placeholder="Nome da categoria..."
                        className="flex-1 px-4 py-3 bg-white dark:bg-[#030712] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                        value={newCatName}
                        onChange={e => setNewCatName(e.target.value)}
                      />
                      <select 
                        className="px-4 py-3 bg-white dark:bg-[#030712] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                        value={newCatType}
                        onChange={e => setNewCatType(e.target.value as any)}
                      >
                        <option value="expense">Despesa</option>
                        <option value="income">Receita</option>
                      </select>
                      <button 
                        onClick={handleAddCategory}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-indigo-500 transition-all"
                      >
                        Criar
                      </button>
                   </div>
                </div>

                {/* List Categories */}
                <div className="space-y-4">
                   {categories.map(cat => {
                     const catSubs = subcategories.filter(s => s.category_id === cat.id);
                     const isExpanded = expandedCatId === cat.id;
                     return (
                     <div key={cat.id} className="bg-slate-50 dark:bg-[#111827]/40 rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden">
                        <div className="p-4 flex items-center justify-between bg-white/50 dark:bg-white/5">
                           <button
                             className="flex items-center gap-3 flex-1 text-left"
                             onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}
                           >
                              <span className={`w-2 h-2 rounded-full ${cat.type === 'income' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                              <h4 className="font-bold text-slate-700 dark:text-slate-200">{cat.name}</h4>
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-600">{cat.type === 'income' ? 'Receita' : 'Despesa'}</span>
                              {catSubs.length > 0 && (
                                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full">{catSubs.length} sub</span>
                              )}
                           </button>
                           <div className="flex items-center gap-2">
                              <button onClick={() => setExpandedCatId(isExpanded ? null : cat.id)} className="p-2 text-slate-600 hover:text-indigo-500">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                              <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-slate-600 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                           </div>
                        </div>

                        {isExpanded && (
                          <div className="p-4 space-y-3 border-t border-slate-200 dark:border-white/5">
                             <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Nova subcategoria..."
                                  className="flex-1 px-4 py-2.5 bg-white dark:bg-[#030712] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                                  value={newSubName}
                                  onChange={e => setNewSubName(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubcategory(cat.id); } }}
                                />
                                <button
                                  onClick={() => handleAddSubcategory(cat.id)}
                                  className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-500 transition-all"
                                >
                                  Adicionar
                                </button>
                             </div>

                             {catSubs.length === 0 ? (
                               <p className="text-xs text-slate-500 dark:text-slate-600 italic px-1">Nenhuma subcategoria ainda.</p>
                             ) : (
                               <div className="flex flex-wrap gap-2">
                                 {catSubs.map(sub => (
                                   <div key={sub.id} className="flex items-center gap-2 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-full pl-3 pr-1 py-1">
                                     <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{sub.name}</span>
                                     <button onClick={() => handleDeleteSubcategory(sub.id)} className="p-1 text-slate-400 hover:text-rose-500 rounded-full hover:bg-rose-500/10">
                                       <X className="w-3 h-3" />
                                     </button>
                                   </div>
                                 ))}
                               </div>
                             )}
                          </div>
                        )}
                     </div>
                   );})}
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                 <CreditCard className="w-16 h-16 text-indigo-500/20 mb-6" />
                 <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">Formas de Pagamento</h3>
                 <p className="text-slate-600 dark:text-slate-400 text-sm max-w-xs">
                    Gerencie suas formas de pagamento para lançamentos recorrentes.
                 </p>
                 <p className="text-[#4e545a] dark:text-slate-700 font-black uppercase text-[10px] tracking-widest mt-4">Em desenvolvimento</p>
              </div>
            )}

            {activeTab === 'subscription' && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                 <Crown className="w-16 h-16 text-indigo-500/20 mb-6" />
                 <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">ZenOS Pro em Breve</h3>
                 <p className="text-slate-600 dark:text-slate-400 text-sm max-w-xs">
                    Estamos preparando recursos exclusivos para assinantes Pro. Aguarde!
                 </p>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-indigo-500/10 rounded-2xl">
                          {currentTheme === 'dark' ? <Moon className="w-6 h-6 text-indigo-400" /> : <Sun className="w-6 h-6 text-amber-500" />}
                       </div>
                       <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Modo Escuro</h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Alternar entre tema claro e escuro</p>
                       </div>
                    </div>
                    
                    <button 
                      onClick={toggleTheme}
                      className={`
                        relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300
                        ${currentTheme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300'}
                      `}
                    >
                      <span className={`
                        inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 shadow-md
                        ${currentTheme === 'dark' ? 'translate-x-7' : 'translate-x-1'}
                      `} />
                    </button>
                 </div>

                 <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-white/5">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tamanho dos Menus</h3>
                      {tempMenuSize !== profile.menu_size && (
                        <button 
                           onClick={handleSaveAppearance}
                           className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
                        >
                          Salvar
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(['xs', 'sm', 'md', 'lg'] as const).map((size) => (
                        <button
                          key={size}
                          onClick={() => setTempMenuSize(size)}
                          className={`py-3 px-4 rounded-2xl border font-black uppercase text-[10px] tracking-widest transition-all ${tempMenuSize === size ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600'}`}
                        >
                          {size === 'xs' ? 'Muito Pequeno' : size === 'sm' ? 'Pequeno' : size === 'md' ? 'Normal' : 'Grande'}
                        </button>
                      ))}
                    </div>
                 </div>

                 <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-emerald-500/10 rounded-2xl">
                          <Share2 className="w-6 h-6 text-emerald-500" />
                       </div>
                       <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Compartilhar App</h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Enviar link de instalação via WhatsApp</p>
                       </div>
                    </div>
                    
                    <button 
                      onClick={shareApp}
                      className="px-6 py-2 bg-emerald-500 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                    >
                      Enviar
                    </button>
                 </div>
              </div>
            )}

            {activeTab === 'database' && profile.role === 'admin' && (
              <DatabaseSettings profile={profile} showToast={showToast} />
            )}

            {activeTab === 'security' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                 <div className="flex items-center gap-4 mb-8">
                    <div className="p-4 bg-rose-50 dark:bg-rose-500/10 rounded-2xl">
                       <Shield className="w-8 h-8 text-rose-600" />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Segurança do App</h3>
                       <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Proteja seus dados financeiros</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* PIN Setting */}
                    <div className="space-y-4">
                       <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-indigo-600" />
                          <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest"> PIN de 4 Dígitos</h4>
                       </div>
                       <p className="text-[10px] text-slate-500 font-bold">Solicitar senha ao abrir o aplicativo ou após inatividade.</p>
                       <div className="flex gap-2">
                          <input 
                             type="password" 
                             maxLength={4}
                             placeholder="0000"
                             className="w-full max-w-[120px] text-center text-xl font-black tracking-[0.5em] px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500"
                             value={pin}
                             onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                          />
                          <button 
                             onClick={() => setPin('')}
                             className="px-4 py-3 text-rose-500 font-bold text-xs uppercase hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                          >
                             Limpar
                          </button>
                       </div>
                    </div>

                    {/* Biometry Setting */}
                    <div className="space-y-4">
                       <div className="flex items-center gap-2">
                          <Fingerprint className="w-4 h-4 text-indigo-600" />
                          <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Biometria</h4>
                       </div>
                       <p className="text-[10px] text-slate-500 font-bold">Use o FaceID ou Digital do seu dispositivo para acesso rápido.</p>
                       <button 
                          onClick={() => setBiometry(!biometry)}
                          className={`flex items-center gap-3 px-6 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${biometry ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 dark:bg-slate-900 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                       >
                          {biometry ? <Check className="w-4 h-4" /> : <Fingerprint className="w-4 h-4" />}
                          {biometry ? 'Biometria Ativa' : 'Ativar Biometria'}
                       </button>
                    </div>
                 </div>

                 <div className="pt-10 border-t border-slate-100 dark:border-white/5">
                    <button 
                       onClick={handleSaveSecurity}
                       className="w-full md:w-auto px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
                    >
                       Salvar Alterações
                    </button>
                 </div>
              </div>
            )}

            {activeTab === 'system' && profile.role === 'admin' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl">
                    <Cpu className="w-8 h-8 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Sistema e Atualização</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Informações de versão e atualizações</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Informações de Versão */}
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-200 dark:border-white/5 space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 font-mono">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Status do Dispositivo
                    </h4>
                    
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between items-center py-2 border-b border-slate-200/50 dark:border-white/5">
                        <span className="text-xs text-slate-500 font-bold">Plataforma</span>
                        <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                          {/iPad|iPhone|iPod/.test(navigator.userAgent) ? 'iOS (Apple)' : /Android/.test(navigator.userAgent) ? 'Android' : 'Web App'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-200/50 dark:border-white/5">
                        <span className="text-xs text-slate-500 font-bold">Versão Instalada</span>
                        <span className="text-xs font-black text-indigo-650 dark:text-indigo-400 font-mono">v{CURRENT_VERSION}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-200/50 dark:border-white/5">
                        <span className="text-xs text-slate-500 font-bold">Última Versão</span>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 font-mono">v{latestVersion}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 pb-0">
                        <span className="text-xs text-slate-500 font-bold">Conexão</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${navigator.onLine ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {navigator.onLine ? 'Conectado' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Detalhes de Atualização */}
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-200 dark:border-white/5 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 font-mono">
                        <RefreshCw className="w-4 h-4 text-indigo-500" />
                        Ações do Sistema
                      </h4>

                      <div className="mt-4">
                        {isUpdateAvailable ? (
                          <div className="space-y-3">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase rounded-full animate-pulse font-mono">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Atualização Disponível
                            </span>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
                              Deseja fazer a atualização do aplicativo para a versão v{latestVersion}?
                            </p>
                            {releaseNotes && (
                              <div className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl">
                                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1 font-mono">Modificações:</p>
                                <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{releaseNotes}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase rounded-full">
                              <Check className="w-3.5 h-3.5" />
                              App Atualizado
                            </span>
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                              Sua aplicação já está rodando com a última versão disponível.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                      {isUpdateAvailable ? (
                        <>
                          <button
                            onClick={async () => {
                              try {
                                showToast('Atualizando e recarregando o aplicativo...', 'info');
                                await applyAndReloadUpdate();
                              } catch (e) {
                                showToast('Erro ao aplicar atualização. Tente novamente.', 'error');
                              }
                            }}
                            className="flex-1 py-3 bg-indigo-650 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-500 shadow-lg shadow-indigo-650/20 active:scale-95 transition-all text-center flex items-center justify-center gap-2 cursor-pointer outline-none"
                          >
                            <ArrowUpCircle className="w-4 h-4" />
                            Sim
                          </button>
                          <button
                            onClick={() => {
                              showToast('Atualização adiada', 'info');
                            }}
                            className="py-3 px-6 bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest transition-all text-center cursor-pointer outline-none"
                          >
                            Não
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={async () => {
                            setIsCheckingUpdate(true);
                            try {
                              const res = await checkLatestVersion();
                              setLatestVersion(res.latestVersion);
                              setIsUpdateAvailable(res.isUpdateAvailable);
                              setReleaseNotes(res.notes || '');
                              setReleaseDate(res.releaseDate || '');
                              
                              if (res.isUpdateAvailable) {
                                showToast('Nova atualização encontrada!', 'success');
                              } else {
                                showToast('Seu aplicativo já está na versão mais recente!', 'success');
                              }
                            } catch (e) {
                              showToast('Falha ao verificar rede. Verifique sua conexão.', 'error');
                            } finally {
                              setIsCheckingUpdate(false);
                            }
                          }}
                          disabled={isCheckingUpdate}
                          className="w-full py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-slate-800 dark:text-white cursor-pointer outline-none font-mono"
                        >
                          {isCheckingUpdate ? (
                            <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                          Buscar Atualização
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Painel do Administrador - Publicador */}
                {profile.role === 'admin' && (
                  <div className="bg-slate-50 dark:bg-[#030712] p-6 rounded-3xl border border-indigo-500/10 dark:border-indigo-500/20 space-y-6">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-505" />
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest font-mono">
                        Publicar Nova Versão (Apenas Admin)
                      </h4>
                    </div>
                    
                    <p className="text-[11px] text-slate-500 font-bold leading-relaxed font-medium">
                      Como administrador, você pode registrar uma nova versão no banco de dados. Isso notificará automaticamente todos os dispositivos de forma transparente assim que acessarem o painel de ajustes.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-650 uppercase tracking-widest font-mono">Número do Build (Ex: 2.1.3)</label>
                        <input
                          type="text"
                          placeholder="Ex: 2.1.3"
                          className="w-full px-4 py-3 bg-white dark:bg-[#0c0f1d] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-505 text-xs font-black"
                          value={adminNewVersion}
                          onChange={e => setAdminNewVersion(e.target.value)}
                        />
                      </div>
                      
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-slate-650 uppercase tracking-widest font-mono">Modificações Implementadas</label>
                        <input
                          type="text"
                          placeholder="Ex: Novas melhorias de layout no iOS e ajustes finos."
                          className="w-full px-4 py-3 bg-white dark:bg-[#0c0f1d] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-505 text-xs font-medium"
                          value={adminNewNotes}
                          onChange={e => setAdminNewNotes(e.target.value)}
                        />
                      </div>

                      <button
                        onClick={async () => {
                          if (!adminNewVersion.trim() || !adminNewNotes.trim()) {
                            showToast('Insira uma versão e modificações válidas.', 'info');
                            return;
                          }
                          setIsPublishing(true);
                          try {
                            const versionRegex = /^\d+\.\d+\.\d+$/;
                            if (!versionRegex.test(adminNewVersion.trim())) {
                              showToast('A versão deve seguir o formato semântico (Modo: X.Y.Z).', 'error');
                              return;
                            }
                            await publishNewVersion(adminNewVersion, adminNewNotes);
                            setLatestVersion(adminNewVersion.trim());
                            
                            const partsCandidate = adminNewVersion.trim().split('.').map(p => parseInt(p, 10) || 0);
                            const partsCurrent = CURRENT_VERSION.split('.').map(p => parseInt(p, 10) || 0);
                            let newer = false;
                            for (let i = 0; i < Math.max(partsCandidate.length, partsCurrent.length); i++) {
                              const cand = partsCandidate[i] || 0;
                              const curr = partsCurrent[i] || 0;
                              if (cand > curr) { newer = true; break; }
                              if (cand < curr) { newer = false; break; }
                            }
                            setIsUpdateAvailable(newer);
                            setReleaseNotes(adminNewNotes);
                            showToast(`Versão ${adminNewVersion} publicada com sucesso!`, 'success');
                            setAdminNewVersion('');
                            setAdminNewNotes('');
                          } catch (e) {
                            showToast('Erro ao publicar versão no banco.', 'error');
                          } finally {
                            setIsPublishing(false);
                          }
                        }}
                        disabled={isPublishing}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-505 disabled:bg-indigo-305 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer outline-none font-mono"
                      >
                        {isPublishing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Registrar Versão
                      </button>
                    </div>
                  </div>
                )}
              </div>
             )}
         </div>
        </div>
      </div>
    </div>
  );
}

function DatabaseSettings({ profile, showToast }: { profile: Profile; showToast: (msg: string, type: 'success' | 'error' | 'info') => void }) {
  const [supaStatus, setSupaStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [supaMessage, setSupaMessage] = useState('');
  
  const [syncing, setSyncing] = useState(false);

  const checkSupabaseConnection = async () => {
    setSupaStatus('testing');
    try {
      const result = await testSupabaseConnection();
      if (result.success) {
        setSupaStatus('success');
        setSupaMessage(result.message || 'Conexão estabelecida com sucesso!');
        showToast('Conexão com Supabase verificada!', 'success');
      } else {
        setSupaStatus('error');
        setSupaMessage(result.message || 'Erro de conexão.');
        showToast('Erro de conexão com Supabase', 'error');
      }
    } catch (error: any) {
      setSupaStatus('error');
      setSupaMessage(error?.message || 'Erro inesperado.');
      showToast('Erro ao testar Supabase', 'error');
    }
  };

  const handleForceSync = async () => {
    if (!profile?.id) {
      showToast('Usuário não autenticado.', 'error');
      return;
    }
    setSyncing(true);
    showToast('Sincronizando todas as tabelas com o Supabase...', 'info');
    try {
      await db.syncAllData(profile.id);
      showToast('Todas as tabelas foram sincronizadas com sucesso!', 'success');
    } catch (e: any) {
      console.error(e);
      showToast('Erro ao sincronizar. Verifique a rede e tente novamente.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const hasSupabaseConfig = !!supabaseUrl && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* SECTION 1: SUPABASE (PRIMARY) */}
      <div className="bg-slate-50 dark:bg-[#030712] p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-emerald-500/10 rounded-2xl">
            <Database className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Banco de Dados Principal (Supabase)</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">Verifique e teste a conexão principal do aplicativo</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Credenciais Supabase</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${hasSupabaseConfig ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                {hasSupabaseConfig ? 'Configurado' : 'Aguardando Configuração'}
              </span>
            </div>
            <p className="text-xs mt-2 text-slate-600 dark:text-slate-300">
              URL: <code className="bg-slate-100 dark:bg-black/40 px-1 py-0.5 rounded text-indigo-500 font-mono text-[10px]">{supabaseUrl || 'Não definida nas variáveis de ambiente'}</code>
            </p>
          </div>

          {!hasSupabaseConfig && (
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold leading-relaxed">
                As variáveis <code className="font-mono">VITE_SUPABASE_URL</code> e <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> não foram detectadas no ambiente. O app usará dados de teste offline até que as chaves sejam adicionadas no painel do projeto.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={checkSupabaseConnection}
              disabled={supaStatus === 'testing' || !hasSupabaseConfig}
              className={`flex-1 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer outline-none ${
                !hasSupabaseConfig ? 'bg-slate-200 dark:bg-white/5 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20'
              }`}
            >
              {supaStatus === 'testing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Testar Conexão Supabase
            </button>

            <button 
              onClick={handleForceSync}
              disabled={syncing || !hasSupabaseConfig}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer outline-none shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              Sincronizar Tudo
            </button>
          </div>

          {supaStatus !== 'idle' && (
            <div className={`p-4 rounded-2xl border ${
              supaStatus === 'success' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600' : 
              supaStatus === 'error' ? 'bg-rose-500/5 border-rose-500/20 text-rose-600' : ''
            }`}>
              <p className="text-xs font-bold">{supaMessage}</p>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: TABELAS SINCRONIZADAS */}
      <div className="p-6 bg-slate-50 dark:bg-[#030712] rounded-3xl border border-slate-200 dark:border-slate-800">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Tabelas e Estruturas</h4>
        <div className="space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            As seguintes tabelas estão disponíveis para persistência do usuário e sincronização automática:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
            {[
              'profiles', 'categories', 'subcategories', 'potes (accounts)', 'transactions', 
              'debts', 'settings', 'tasks', 'notes', 'journal', 'calendar', 'budgets', 'cards', 'invoices'
            ].map(table => (
              <div key={table} className="px-3 py-2 bg-white dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-350">{table}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
