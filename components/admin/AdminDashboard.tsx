import React, { useState, useEffect } from 'react';
import { 
  Users, Crown, TrendingUp, UserMinus, ShieldAlert, 
  Search, Filter, MoreVertical, Ban, CheckCircle, 
  Trash2, RefreshCw, Loader2, ArrowLeft, Activity, 
  Eye, HelpCircle, HardDrive, Settings2, 
  Clock, CheckCircle2, Globe, Sparkles, AlertCircle, 
  KeyRound, Mail, User, Phone, Check, X, ShieldCheck,
  ToggleLeft, ToggleRight, ListPlus, Copy
} from 'lucide-react';
import { Profile, Plan, UserStatus, GatewayWebhook, DunningAttempt, BillingReceipt, SupportTicket, SystemHealthCheck, AdminLog } from '../../types';
import { adminService } from '../../services/adminService';
import { db } from '../../services/db';

interface AdminDashboardProps {
  user: Profile;
  onLogout: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onBack?: () => void;
  onSimulateUser?: (userId: string) => void;
}

export default function AdminDashboard({ user, showToast, onBack, onSimulateUser }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'plans' | 'gateway' | 'security'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States para abas específicas
  const [webhooks, setWebhooks] = useState<GatewayWebhook[]>([]);
  const [dunning, setDunning] = useState<DunningAttempt[]>([]);
  const [receipts, setReceipts] = useState<BillingReceipt[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminLog[]>([]);
  const [healthChecks, setHealthChecks] = useState<SystemHealthCheck[]>([]);

  // Form states para configurações admin
  const [cacValue, setCacValue] = useState(0);
  const [marketingCosts, setMarketingCosts] = useState(0);
  const [feeOperationalPct, setFeeOperationalPct] = useState(30);
  const [feeProfitPct, setFeeProfitPct] = useState(50);
  const [feeReservePct, setFeeReservePct] = useState(20);

  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'blocked' | 'pro' | 'pending_payment' | 'new_users'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // States para o modal de controle do usuário (Visão 360º)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [userUsage, setUserUsage] = useState<{ transactions: number, accounts: number, goals: number, debts: number } | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  
  // Form states de edição do usuário no modal
  const [editEmail, setEditEmail] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPlanId, setEditPlanId] = useState('');
  const [editStatus, setEditStatus] = useState<UserStatus>('active');
  const [editRole, setEditRole] = useState<'user' | 'admin'>('user');
  const [savingUser, setSavingUser] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  // States para a Gestão de Planos
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<Plan | null>(null);
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState(0);
  const [limitCards, setLimitCards] = useState(5);
  const [limitPots, setLimitPots] = useState(3);
  const [limitCategories, setLimitCategories] = useState(10);
  const [limitGoals, setLimitGoals] = useState(5);
  const [featureAI, setFeatureAI] = useState(false);
  const [featureWeb, setFeatureWeb] = useState(true);
  const [featureBackup, setFeatureBackup] = useState(false);
  const [cloningPlanId, setCloningPlanId] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Garante que os planos padrão Básico, Premium e Pro existam no Supabase
      await adminService.seedDefaultPlans();

      // Carrega estatísticas, usuários e planos
      const [statsData, usersData, plansData] = await Promise.all([
        adminService.getStats(user.id),
        adminService.listUsers(user.id),
        db.admin.plans.list()
      ]);
      
      setStats(statsData);
      setUsers(usersData);
      setPlans(plansData);

      // Preenche os campos de configurações
      setCacValue(statsData.cac);
      setMarketingCosts(statsData.marketingCosts);
      setFeeOperationalPct(statsData.feeOperationalPct);
      setFeeProfitPct(statsData.feeProfitPct);
      setFeeReservePct(statsData.feeReservePct);

      // Carrega dados adicionais baseados na aba ativa
      if (activeTab === 'gateway') {
        const [webhooksData, dunningData, receiptsData] = await Promise.all([
          adminService.listWebhooks(user.id),
          adminService.listDunningAttempts(user.id),
          adminService.listReceipts(undefined, user.id)
        ]);
        setWebhooks(webhooksData);
        setDunning(dunningData);
        setReceipts(receiptsData);
      } else if (activeTab === 'security') {
        const [auditData, ticketsData, healthData] = await Promise.all([
          adminService.listAuditLogs(user.id),
          adminService.listSupportTickets(user.id),
          adminService.getSystemHealth()
        ]);
        setAuditLogs(auditData);
        setTickets(ticketsData);
        setHealthChecks(healthData);
      }
    } catch (error) {
      showToast('Erro ao carregar dados do painel', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const sum = Number(feeOperationalPct) + Number(feeProfitPct) + Number(feeReservePct);
      if (sum !== 100) {
        showToast('A soma das taxas de rateio deve ser exatamente 100%', 'error');
        setSavingSettings(false);
        return;
      }

      await adminService.saveAdminSettings(user.id, {
        cac_value: Number(cacValue),
        marketing_costs: Number(marketingCosts),
        fee_operational_pct: Number(feeOperationalPct),
        fee_profit_pct: Number(feeProfitPct),
        fee_reserve_pct: Number(feeReservePct)
      });
      showToast('Configurações atualizadas com sucesso!', 'success');
      loadData();
    } catch (e) {
      showToast('Erro ao salvar configurações', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Abre o Modal de Controle do Usuário e carrega métricas de uso reais
  const handleOpenUserModal = async (u: Profile) => {
    setSelectedUser(u);
    setEditEmail(u.email);
    setEditFullName(u.full_name || '');
    setEditPhone(u.phone || '');
    setEditPlanId(u.plan_id || '');
    setEditStatus(u.status);
    setEditRole(u.role);
    
    setLoadingUsage(true);
    setUserUsage(null);
    try {
      const stats = await adminService.getUserUsageStats(u.id);
      setUserUsage(stats);
    } catch (e) {
      console.error("Failed to load user usage stats");
    } finally {
      setLoadingUsage(false);
    }
  };

  // Salva alterações cadastrais do modal 360º
  const handleSaveUserDetail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSavingUser(true);
    try {
      // 1. Atualização de E-mail
      if (editEmail !== selectedUser.email) {
        await adminService.updateUserEmail(user.id, selectedUser.id, editEmail);
      }
      
      // 2. Atualização dos outros campos (Nome, Status, Plano, Telefone, Role)
      const targetPlan = plans.find(p => p.id === editPlanId);
      const updatedProfile: Profile = {
        ...selectedUser,
        full_name: editFullName,
        phone: editPhone,
        status: editStatus,
        role: editRole,
        plan_id: editPlanId || null,
        plan: targetPlan ? targetPlan.name : 'Gratuito',
        subscriptionStatus: editPlanId ? 'active' : 'expired'
      };

      await db.users.update(updatedProfile);
      
      // Salva log de auditoria
      await adminService.createAuditLog(user.id, 'update_user_details', selectedUser.id, `Nome: ${editFullName}, Status: ${editStatus}, Plano: ${updatedProfile.plan}`);
      
      showToast('Dados do usuário atualizados com sucesso!', 'success');
      setSelectedUser(null);
      loadData();
    } catch (error) {
      showToast('Erro ao salvar alterações do usuário', 'error');
    } finally {
      setSavingUser(false);
    }
  };

  // Envia email de redefinição de senha real
  const handleSendResetPassword = async () => {
    if (!selectedUser) return;
    setResetPasswordLoading(true);
    try {
      await adminService.sendResetPasswordEmail(selectedUser.email);
      await adminService.createAuditLog(user.id, 'reset_user_password_sent', selectedUser.id, `E-mail de reconfiguração enviado para: ${selectedUser.email}`);
      showToast('E-mail de redefinição enviado com sucesso!', 'success');
    } catch (e) {
      showToast('Erro ao enviar e-mail de redefinição', 'error');
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const handleToggleBlock = async (userId: string, currentStatus: UserStatus) => {
    setActionLoading(userId);
    try {
      await adminService.toggleUserBlock(user.id, userId, currentStatus);
      showToast(currentStatus === 'blocked' ? 'Usuário desbloqueado' : 'Usuário bloqueado', 'success');
      loadData();
    } catch (error) {
      showToast('Erro ao atualizar status', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetTrial = async (userId: string) => {
    setActionLoading(userId);
    try {
      await adminService.resetTrial(user.id, userId);
      showToast('Trial estendido por mais 7 dias', 'success');
      loadData();
    } catch (error) {
      showToast('Erro ao estender trial', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Deseja excluir permanentemente este usuário? Esta ação não pode ser desfeita.')) return;
    setActionLoading(userId);
    try {
      await adminService.deleteUser(user.id, userId);
      showToast('Usuário excluído permanentemente', 'success');
      setSelectedUser(null);
      loadData();
    } catch (error) {
      showToast('Erro ao excluir usuário', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpgradeUser = async (userId: string, planId: string) => {
    setActionLoading(userId);
    try {
      await adminService.upgradeUser(user.id, userId, planId);
      showToast('Plano do usuário atualizado', 'success');
      loadData();
    } catch (error) {
      showToast('Erro ao atualizar plano', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveTicket = async (ticketId: string) => {
    try {
      await adminService.resolveSupportTicket(user.id, ticketId);
      showToast('Ticket marcado como resolvido', 'success');
      loadData();
    } catch (e) {
      showToast('Erro ao atualizar ticket', 'error');
    }
  };

  // --- MÉTODOS DE CRIAÇÃO E CLONAGEM DE PLANOS ---
  const handleOpenPlanModal = (plan: Plan | null = null) => {
    if (plan) {
      setSelectedPlanForEdit(plan);
      setPlanName(plan.name);
      setPlanPrice(plan.price);
      setLimitCards(plan.limits_json?.max_cards || 5);
      setLimitPots(plan.limits_json?.max_pots || 3);
      setLimitCategories(plan.limits_json?.max_categories || 10);
      setLimitGoals(plan.limits_json?.max_goals || 5);
      setFeatureAI(plan.features_json?.includes('ai_advisor') || false);
      setFeatureWeb(plan.features_json?.includes('pc_view') || false);
      setFeatureBackup(plan.features_json?.includes('cloud_backup') || false);
    } else {
      setSelectedPlanForEdit(null);
      setPlanName('');
      setPlanPrice(0);
      setLimitCards(5);
      setLimitPots(3);
      setLimitCategories(10);
      setLimitGoals(5);
      setFeatureAI(false);
      setFeatureWeb(true);
      setFeatureBackup(false);
    }
    setCloningPlanId('');
    setShowPlanModal(true);
  };

  const handleCloneLimits = () => {
    if (!cloningPlanId) return;
    const sourcePlan = plans.find(p => p.id === cloningPlanId);
    if (!sourcePlan) return;
    
    setLimitCards(sourcePlan.limits_json?.max_cards || 5);
    setLimitPots(sourcePlan.limits_json?.max_pots || 3);
    setLimitCategories(sourcePlan.limits_json?.max_categories || 10);
    setLimitGoals(sourcePlan.limits_json?.max_goals || 5);
    setFeatureAI(sourcePlan.features_json?.includes('ai_advisor') || false);
    setFeatureWeb(sourcePlan.features_json?.includes('pc_view') || false);
    setFeatureBackup(sourcePlan.features_json?.includes('cloud_backup') || false);
    showToast(`Limites do plano "${sourcePlan.name}" copiados com sucesso!`, 'info');
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName.trim()) {
      showToast('O nome do plano é obrigatório', 'error');
      return;
    }
    setSavingPlan(true);

    // Constrói os vetores de features
    const features: string[] = [];
    if (featureAI) features.push('ai_advisor');
    if (featureWeb) features.push('pc_view');
    if (featureBackup) features.push('cloud_backup');

    const planData = {
      id: selectedPlanForEdit?.id,
      name: planName,
      price: Number(planPrice),
      limits_json: {
        max_cards: Number(limitCards),
        max_pots: Number(limitPots),
        max_categories: Number(limitCategories),
        max_goals: Number(limitGoals)
      },
      features_json: features,
      is_active: true
    };

    try {
      await adminService.createOrUpdatePlan(user.id, planData);
      showToast(selectedPlanForEdit ? 'Plano atualizado com sucesso!' : 'Novo plano criado com sucesso!', 'success');
      setShowPlanModal(false);
      loadData();
    } catch (err) {
      showToast('Erro ao salvar o plano no banco', 'error');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleTogglePlanActive = async (plan: Plan) => {
    try {
      await adminService.createOrUpdatePlan(user.id, {
        ...plan,
        is_active: !plan.is_active
      });
      showToast(plan.is_active ? 'Plano desativado' : 'Plano ativado', 'success');
      loadData();
    } catch (e) {
      showToast('Erro ao atualizar status do plano', 'error');
    }
  };

  // Filtragem avançada incluindo Pendente e Novos Cadastros
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (u.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    if (filter === 'active') return u.status === 'active';
    if (filter === 'blocked') return u.status === 'blocked';
    if (filter === 'pro') return u.subscriptionStatus === 'active';
    
    if (filter === 'pending_payment') {
      return u.subscriptionStatus === 'expired' || u.status === 'delinquent';
    }

    if (filter === 'new_users') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return new Date(u.created_at) >= sevenDaysAgo;
    }

    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#030712] p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all"
            >
              <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Painel Administrativo</h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Controle e Saúde Operacional do ZenOS SaaS</p>
          </div>
        </div>
        <button 
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-600/20 transition-all self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sincronizar Painel
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-white/5 pb-px overflow-x-auto gap-2">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`pb-4 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Visão Geral & Financeiro
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={`pb-4 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${activeTab === 'users' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Usuários & CRM
        </button>
        <button 
          onClick={() => setActiveTab('plans')}
          className={`pb-4 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${activeTab === 'plans' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Gestão de Planos
        </button>
        <button 
          onClick={() => setActiveTab('gateway')}
          className={`pb-4 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${activeTab === 'gateway' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Gateways & Webhooks
        </button>
        <button 
          onClick={() => setActiveTab('security')}
          className={`pb-4 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${activeTab === 'security' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Segurança & Suporte
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW & FINANCE */}
          {activeTab === 'overview' && stats && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#0a0c14] p-5 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">MRR (Faturamento Mensal)</p>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">R$ {stats.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                  <p className="text-[9px] font-bold text-slate-400 mt-1">ARR: R$ {stats.arr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-white dark:bg-[#0a0c14] p-5 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">ARPU (Médio por Assinante)</p>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">R$ {stats.arpu.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                  <p className="text-[9px] font-bold text-slate-400 mt-1">LTV Estimado: R$ {stats.ltv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-white dark:bg-[#0a0c14] p-5 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Churn Rate (Cancelamento)</p>
                  <h3 className="text-xl font-black text-rose-500">{stats.churnRate.toFixed(1)}%</h3>
                  <p className="text-[9px] font-bold text-slate-400 mt-1">Contas canceladas no mês</p>
                </div>
                <div className="bg-white dark:bg-[#0a0c14] p-5 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Engajamento (DAU / MAU)</p>
                  <h3 className="text-xl font-black text-indigo-600 dark:text-indigo-400">{stats.dau} / {stats.mau}</h3>
                  <p className="text-[9px] font-bold text-slate-400 mt-1">Conversão Funil: {stats.trialToPaidConversion.toFixed(1)}%</p>
                </div>
              </div>

              {/* Saúde SaaS & Configurações de Faturamento */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Funil Visual de Conversão */}
                <div className="bg-white dark:bg-[#0a0c14] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm space-y-6">
                  <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-500" /> Funil de Assinaturas e Ativação
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-1">
                        <span>Total de Usuários</span>
                        <span>{stats.totalUsers}</span>
                      </div>
                      <div className="h-3 w-full bg-slate-100 dark:bg-slate-950/60 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-400" style={{ width: '100%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-1">
                        <span>Trial Ativos</span>
                        <span>{stats.trials} ({(stats.totalUsers > 0 ? (stats.trials / stats.totalUsers) * 100 : 0).toFixed(0)}%)</span>
                      </div>
                      <div className="h-3 w-full bg-slate-100 dark:bg-slate-950/60 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${stats.totalUsers > 0 ? (stats.trials / stats.totalUsers) * 100 : 0}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-1">
                        <span>Pagantes PRO</span>
                        <span>{stats.activeSubscribers} ({stats.trialToPaidConversion.toFixed(0)}% conversão)</span>
                      </div>
                      <div className="h-3 w-full bg-slate-100 dark:bg-slate-950/60 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${stats.trialToPaidConversion}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Parâmetros Operacionais & CAC */}
                <form onSubmit={handleSaveSettings} className="bg-white dark:bg-[#0a0c14] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm space-y-6">
                  <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-indigo-500" /> Parâmetros e Rateio Operacional
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Marketing (Mensal)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                        <input 
                          type="number" 
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-950 dark:text-white font-bold"
                          value={marketingCosts}
                          onChange={e => setMarketingCosts(Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">CAC Médio Calculado</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                        <input 
                          type="number" 
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-955 dark:text-white font-bold"
                          value={cacValue}
                          onChange={e => setCacValue(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Divisão do Faturamento Bruto (%)</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[8px] font-bold text-slate-400 block mb-1">Custos Ops</label>
                        <input 
                          type="number" 
                          max="100"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-center text-slate-955 dark:text-white font-bold"
                          value={feeOperationalPct}
                          onChange={e => setFeeOperationalPct(Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-bold text-slate-400 block mb-1">Lucro Líquido</label>
                        <input 
                          type="number" 
                          max="100"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-center text-slate-955 dark:text-white font-bold"
                          value={feeProfitPct}
                          onChange={e => setFeeProfitPct(Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-bold text-slate-400 block mb-1">Reserva SaaS</label>
                        <input 
                          type="number" 
                          max="100"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-center text-slate-955 dark:text-white font-bold"
                          value={feeReservePct}
                          onChange={e => setFeeReservePct(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={savingSettings}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
                  >
                    {savingSettings ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: CRM & USERS */}
          {activeTab === 'users' && (
            <div className="bg-white dark:bg-[#0a0c14] rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden animate-in fade-in duration-300">
              <div className="p-6 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar por nome ou email..."
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-[#030712] border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm text-slate-950 dark:text-white"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                  <button 
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === 'all' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-700'}`}
                  >
                    Todos
                  </button>
                  <button 
                    onClick={() => setFilter('new_users')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === 'new_users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-700'}`}
                  >
                    Novos Cadastros
                  </button>
                  <button 
                    onClick={() => setFilter('pending_payment')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === 'pending_payment' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-700'}`}
                  >
                    Pagamento Pendente
                  </button>
                  <button 
                    onClick={() => setFilter('active')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === 'active' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-700'}`}
                  >
                    Acesso Ativo
                  </button>
                  <button 
                    onClick={() => setFilter('blocked')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === 'blocked' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}
                  >
                    Bloqueados
                  </button>
                  <button 
                    onClick={() => setFilter('pro')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === 'pro' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}
                  >
                    Assinantes
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                      <th className="px-6 py-4">Usuário</th>
                      <th className="px-6 py-4">Status Plano</th>
                      <th className="px-6 py-4">Tags Acompanhamento</th>
                      <th className="px-6 py-4">Criado em</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {filteredUsers.length > 0 ? filteredUsers.map(u => {
                      // Determinar tags de acompanhamento em tempo real
                      const sevenDaysAgo = new Date();
                      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                      const isNew = new Date(u.created_at) >= sevenDaysAgo;
                      const isPending = u.subscriptionStatus === 'expired' || u.status === 'delinquent';
                      
                      return (
                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-white/10 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-indigo-600/10 text-indigo-600 rounded-full flex items-center justify-center font-black text-sm capitalize">
                                {u.full_name?.charAt(0) || u.email.charAt(0)}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-900 dark:text-white leading-none mb-1">
                                  {u.full_name || 'Usuário Sem Nome'}
                                  {u.role === 'admin' && <span className="ml-2 text-[8px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-md">ADMIN</span>}
                                </span>
                                <span className="text-[10px] text-slate-500">{u.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${
                                  u.subscriptionStatus === 'active' ? 'bg-emerald-500' : 
                                  u.subscriptionStatus === 'trial' ? 'bg-indigo-500' : 'bg-slate-300'
                                }`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${
                                  u.subscriptionStatus === 'active' ? 'text-emerald-600' : 
                                  u.subscriptionStatus === 'trial' ? 'text-indigo-600' : 'text-slate-500'
                                }`}>
                                  {plans.find(p => p.id === u.plan_id)?.name || u.plan || 'Gratuito'}
                                </span>
                              </div>
                              {u.subscriptionStatus === 'trial' && u.trialEndsAt && (
                                <span className="text-[9px] text-slate-400 font-bold">Expira: {new Date(u.trialEndsAt).toLocaleDateString()}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {/* Tag Acesso Status */}
                              <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                u.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600'
                              }`}>
                                {u.status === 'active' ? 'Ativo' : 'Bloqueado'}
                              </span>
                              
                              {/* Tag Novo Cadastro */}
                              {isNew && (
                                <span className="px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-500/10 text-blue-600">
                                  Novo
                                </span>
                              )}

                              {/* Tag Pagamento Pendente */}
                              {isPending && (
                                <span className="px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-amber-50 dark:bg-amber-500/10 text-amber-600">
                                  Pendente
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-[10px] text-slate-500 font-bold whitespace-nowrap">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {actionLoading === u.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                              ) : (
                                <>
                                  <button 
                                    onClick={() => handleOpenUserModal(u)}
                                    title="Controle total do usuário"
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/5 rounded-lg transition-all"
                                  >
                                    <Settings2 className="w-4 h-4" />
                                  </button>

                                  {onSimulateUser && u.id !== user.id && (
                                    <button 
                                      onClick={() => onSimulateUser(u.id)}
                                      title="Logar como usuário (Shadowing)"
                                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/5 rounded-lg transition-all"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  )}

                                  <button 
                                    onClick={() => handleToggleBlock(u.id, u.status)}
                                    title={u.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
                                    className={`p-2 rounded-lg transition-all ${u.status === 'blocked' ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10'}`}
                                  >
                                    {u.status === 'blocked' ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                  </button>
                                  
                                  <button 
                                    onClick={() => handleResetTrial(u.id)}
                                    title="Conceder Trial (+7 dias)"
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all"
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center">
                              <Search className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Nenhum usuário encontrado</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: GESTÃO DE PLANOS */}
          {activeTab === 'plans' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center bg-white dark:bg-[#0a0c14] p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-sm">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider flex items-center gap-2">
                    <Crown className="w-4 h-4 text-indigo-500" /> Grade de Planos do ZenOS SaaS
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configuração de Limites, IA, Backup e Computador</p>
                </div>
                <button 
                  onClick={() => handleOpenPlanModal(null)}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  <ListPlus className="w-4 h-4" />
                  Criar Novo Plano
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map(p => {
                  const hasAI = p.features_json?.includes('ai_advisor');
                  const hasWeb = p.features_json?.includes('pc_view');
                  const hasBackup = p.features_json?.includes('cloud_backup');

                  return (
                    <div 
                      key={p.id} 
                      className={`bg-white dark:bg-[#0a0c14] rounded-[2.5rem] border ${p.is_active ? 'border-slate-200 dark:border-white/5' : 'border-slate-300/40 opacity-60'} shadow-sm overflow-hidden flex flex-col p-6 space-y-6 relative`}
                    >
                      {/* Price header */}
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">{p.name}</h4>
                          <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                            R$ {p.price.toFixed(2)}
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-normal">/mês</span>
                          </h3>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${p.is_active ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                          {p.is_active ? 'Ativo' : 'Pausado'}
                        </span>
                      </div>

                      {/* Limits grid */}
                      <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-3xl border border-slate-100 dark:border-white/5 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cartões Máx.</p>
                          <p className="font-bold text-slate-800 dark:text-white text-sm">{p.limits_json?.max_cards || 'Ilimitados'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Potes Máx.</p>
                          <p className="font-bold text-slate-800 dark:text-white text-sm">{p.limits_json?.max_pots || 'Ilimitados'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Categorias</p>
                          <p className="font-bold text-slate-800 dark:text-white text-sm">{p.limits_json?.max_categories || 'Ilimitadas'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Metas Máx.</p>
                          <p className="font-bold text-slate-800 dark:text-white text-sm">{p.limits_json?.max_goals || 'Ilimitadas'}</p>
                        </div>
                      </div>

                      {/* Features list */}
                      <div className="space-y-2 text-xs flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-bold">Acesso Zenos IA</span>
                          <span className={hasAI ? 'text-emerald-500 font-black' : 'text-slate-400'}>{hasAI ? 'SIM' : 'NÃO'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-bold">Visualização no PC</span>
                          <span className={hasWeb ? 'text-emerald-500 font-black' : 'text-slate-400'}>{hasWeb ? 'SIM' : 'NÃO'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-bold">Backup Nuvem</span>
                          <span className={hasBackup ? 'text-emerald-500 font-black' : 'text-slate-400'}>{hasBackup ? 'SIM' : 'NÃO'}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                        <button 
                          onClick={() => handleTogglePlanActive(p)}
                          className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 transition-all text-center"
                        >
                          {p.is_active ? 'Pausar Vendas' : 'Ativar Vendas'}
                        </button>
                        <button 
                          onClick={() => handleOpenPlanModal(p)}
                          className="flex-1 py-2 px-3 bg-indigo-600/10 hover:bg-indigo-600/20 rounded-xl text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 transition-all text-center"
                        >
                          Editar Plano
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: GATEWAY & WEBHOOKS */}
          {activeTab === 'gateway' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
              {/* Webhooks Log */}
              <div className="bg-white dark:bg-[#0a0c14] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-500" /> Log de Webhooks Recentes (Gateway)
                </h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {webhooks.length > 0 ? webhooks.map(wh => (
                    <div key={wh.id} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl flex justify-between items-start text-xs border border-slate-100 dark:border-white/5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">{wh.gateway}</span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500">{wh.event_type}</span>
                        </div>
                        <p className="text-[10px] text-slate-500">Comprador: {wh.payload?.buyer || 'Desconhecido'}</p>
                        <p className="text-[9px] text-slate-400">{new Date(wh.created_at).toLocaleTimeString()}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${wh.status === 'processed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10'}`}>
                        {wh.status === 'processed' ? 'Aprovado' : 'Recusado'}
                      </span>
                    </div>
                  )) : (
                    <p className="text-xs text-slate-400 text-center py-8">Nenhum webhook recebido ainda.</p>
                  )}
                </div>
              </div>

              {/* Dunning Attempts */}
              <div className="bg-white dark:bg-[#0a0c14] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500" /> Recuperação de Dunning (Inadimplência)
                </h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {dunning.length > 0 ? dunning.map(d => (
                    <div key={d.id} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl flex justify-between items-start text-xs border border-slate-100 dark:border-white/5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Tentativa {d.attempt_number}</span>
                          <span className="text-[10px] text-slate-400">ID Sub: {d.subscription_id}</span>
                        </div>
                        <p className="text-[10px] text-rose-500">{d.error_message}</p>
                        <p className="text-[9px] text-slate-400">{new Date(d.created_at).toLocaleString()}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${d.status === 'recovered' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {d.status === 'recovered' ? 'Recuperado' : 'Falhou'}
                      </span>
                    </div>
                  )) : (
                    <p className="text-xs text-slate-400 text-center py-8">Nenhuma tentativa de dunning registrada.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SECURITY & SUPPORT */}
          {activeTab === 'security' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Health Check */}
              <div className="bg-white dark:bg-[#0a0c14] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
                <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider flex items-center gap-2 mb-4">
                  <HardDrive className="w-4 h-4 text-indigo-500" /> Monitoramento & Health Check do Sistema
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {healthChecks.map(check => (
                    <div key={check.id} className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl flex justify-between items-center border border-slate-100 dark:border-white/5">
                      <div>
                        <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wide">{check.service_name}</p>
                        <p className="text-[10px] text-slate-400">Latência: <span className="font-bold text-indigo-500">{check.latency_ms}ms</span></p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${check.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <span className="text-[10px] font-black uppercase text-slate-500">{check.status === 'healthy' ? 'Estável' : 'Instável'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tickets de Suporte e Auditoria */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tickets de Suporte */}
                <div className="bg-white dark:bg-[#0a0c14] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
                  <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-indigo-500" /> Tickets de Suporte Ativos
                  </h3>
                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                    {tickets.length > 0 ? tickets.map(ticket => (
                      <div key={ticket.id} className={`p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border ${ticket.status === 'resolved' ? 'border-emerald-500/20' : 'border-slate-100 dark:border-white/5'} space-y-2`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-black text-slate-955 dark:text-white">{ticket.subject}</h4>
                            <p className="text-[10px] font-bold text-slate-500">{ticket.user_name} ({ticket.user_email})</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                            ticket.priority === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {ticket.priority === 'high' ? 'Prioridade Máxima' : 'Normal'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-bold">{ticket.description}</p>
                        
                        <div className="flex justify-between items-center pt-2 border-t border-slate-200/50 dark:border-white/5">
                          <span className="text-[9px] text-slate-400">{new Date(ticket.created_at).toLocaleString()}</span>
                          {ticket.status === 'open' ? (
                            <button 
                              onClick={() => handleResolveTicket(ticket.id)}
                              className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wider rounded-lg hover:bg-emerald-500/20 transition-all"
                            >
                              Resolver Chamado
                            </button>
                          ) : (
                            <span className="text-[9px] text-emerald-500 font-black uppercase flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Resolvido
                            </span>
                          )}
                        </div>
                      </div>
                    )) : (
                      <p className="text-xs text-slate-400 text-center py-8">Nenhum chamado de suporte aberto.</p>
                    )}
                  </div>
                </div>

                {/* Audit Logs */}
                <div className="bg-white dark:bg-[#0a0c14] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
                  <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-indigo-500" /> Log de Auditoria do Admin (Audit Trails)
                  </h3>
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {auditLogs.length > 0 ? auditLogs.map(log => (
                      <div key={log.id} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl text-xs space-y-1 border border-slate-100 dark:border-white/5">
                        <div className="flex justify-between font-bold">
                          <span className="text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider">{log.action.replace('_', ' ')}</span>
                          <span className="text-[9px] text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-[10px] text-slate-500">Admin ID: {log.user_id}</p>
                        {log.details && <p className="text-[10px] text-slate-400 font-bold italic">{log.details.note || JSON.stringify(log.details)}</p>}
                      </div>
                    )) : (
                      <p className="text-xs text-slate-400 text-center py-8">Nenhum log de auditoria registrado.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL DE CONTROLE DE USUÁRIO (VISÃO 360º) */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-955/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0a0c14] border border-slate-200 dark:border-white/5 rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in scale-in duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-slate-950/20">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-tight">Controle 360º do Cliente</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ações cadastrais, senha e telemetria na nuvem</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-white/5 rounded-xl transition-all"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-8 flex-1">
              {/* Telemetria de Uso */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Consumo de Recursos Real no Banco (Telemetria)
                </h4>
                {loadingUsage ? (
                  <div className="py-4 flex items-center gap-2 text-xs font-bold text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Carregando estatísticas no Supabase...
                  </div>
                ) : userUsage ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-white/5 text-center">
                      <p className="text-[16px] font-black text-slate-900 dark:text-white">{userUsage.transactions}</p>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Lançamentos</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-white/5 text-center">
                      <p className="text-[16px] font-black text-slate-900 dark:text-white">{userUsage.accounts}</p>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Potes/Contas</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-white/5 text-center">
                      <p className="text-[16px] font-black text-slate-900 dark:text-white">{userUsage.goals}</p>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Metas</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-white/5 text-center">
                      <p className="text-[16px] font-black text-slate-900 dark:text-white">{userUsage.debts}</p>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Compromissos</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Erro ao carregar telemetria.</p>
                )}
              </div>

              {/* Form de Edição */}
              <form onSubmit={handleSaveUserDetail} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nome Completo */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      <User className="w-3 h-3 text-indigo-500" /> Nome Completo
                    </label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-955 dark:text-white font-bold"
                      value={editFullName}
                      onChange={e => setEditFullName(e.target.value)}
                    />
                  </div>

                  {/* E-mail (editável) */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      <Mail className="w-3 h-3 text-indigo-500" /> Endereço de E-mail
                    </label>
                    <input 
                      type="email" 
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-955 dark:text-white font-bold"
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                    />
                  </div>

                  {/* Telefone */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      <Phone className="w-3 h-3 text-indigo-500" /> Telefone
                    </label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-955 dark:text-white font-bold"
                      value={editPhone}
                      onChange={e => setEditPhone(e.target.value)}
                    />
                  </div>

                  {/* Seleção do Plano */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      <Crown className="w-3 h-3 text-indigo-500" /> Plano SaaS
                    </label>
                    <select 
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-955 dark:text-white font-bold"
                      value={editPlanId}
                      onChange={e => setEditPlanId(e.target.value)}
                    >
                      <option value="">Gratuito (Nenhum)</option>
                      {plans.map(p => (
                        <option key={p.id} value={p.id}>{p.name} - R$ {p.price.toFixed(2)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Nível de Acesso (Role) */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-indigo-500" /> Privilégio
                    </label>
                    <select 
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-955 dark:text-white font-bold"
                      value={editRole}
                      onChange={e => setEditRole(e.target.value as 'user' | 'admin')}
                    >
                      <option value="user">Membro (Usuário)</option>
                      <option value="admin">Administrador (Admin)</option>
                    </select>
                  </div>

                  {/* Status do Acesso */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      <Ban className="w-3 h-3 text-indigo-500" /> Status da Conta
                    </label>
                    <select 
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-955 dark:text-white font-bold"
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value as UserStatus)}
                    >
                      <option value="active">Ativo (Acesso Liberado)</option>
                      <option value="blocked">Bloqueado (Acesso Suspenso)</option>
                      <option value="delinquent">Inadimplente (Fatura Pendente)</option>
                    </select>
                  </div>
                </div>

                {/* Ações Avançadas */}
                <div className="bg-slate-50 dark:bg-slate-950/40 p-5 rounded-3xl border border-slate-100 dark:border-white/5 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Settings2 className="w-4 h-4 text-indigo-500" /> Ações de Suporte e Benefícios
                  </h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      type="button"
                      onClick={handleSendResetPassword}
                      disabled={resetPasswordLoading}
                      className="flex-1 py-3 px-4 bg-slate-200 hover:bg-slate-300 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center gap-2"
                    >
                      {resetPasswordLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <KeyRound className="w-3.5 h-3.5" />
                      )}
                      Redefinir Senha (E-mail)
                    </button>

                    <button 
                      type="button"
                      onClick={() => handleResetTrial(selectedUser.id)}
                      className="flex-1 py-3 px-4 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Dar 7 Dias de Cortesia
                    </button>
                  </div>
                </div>

                {/* Botoes de Ação Modal */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-white/5">
                  <button 
                    type="button"
                    onClick={() => handleDeleteUser(selectedUser.id)}
                    className="py-3 px-4 bg-rose-600/10 hover:bg-rose-600/20 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir Conta
                  </button>

                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setSelectedUser(null)}
                      className="py-3 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      disabled={savingUser}
                      className="py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                    >
                      {savingUser && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Salvar Alterações
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO E CONFIGURAÇÃO DE PLANO (SAAS) */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-slate-955/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0a0c14] border border-slate-200 dark:border-white/5 rounded-[2.5rem] shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in scale-in duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-slate-950/20">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-tight">
                    {selectedPlanForEdit ? 'Editar Plano SaaS' : 'Criar Novo Plano'}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Defina preços, limites de recursos e features</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPlanModal(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-white/5 rounded-xl transition-all"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Opção de Clonagem (Apenas se houver outros planos e for criação) */}
              {!selectedPlanForEdit && plans.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-3xl border border-slate-100 dark:border-white/5 space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Copy className="w-3 h-3 text-indigo-500" /> Copiar limites do plano anterior
                  </label>
                  <div className="flex gap-2">
                    <select 
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-955 dark:text-white font-bold"
                      value={cloningPlanId}
                      onChange={e => setCloningPlanId(e.target.value)}
                    >
                      <option value="">Selecione um plano para clonar...</option>
                      {plans.map(p => (
                        <option key={p.id} value={p.id}>{p.name} - R$ {p.price.toFixed(2)}</option>
                      ))}
                    </select>
                    <button 
                      type="button"
                      onClick={handleCloneLimits}
                      disabled={!cloningPlanId}
                      className="px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                    >
                      Clonar
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSavePlan} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nome do Plano */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Nome do Plano</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-955 dark:text-white font-bold"
                      value={planName}
                      onChange={e => setPlanName(e.target.value)}
                      placeholder="Ex: Plano Intermediário"
                    />
                  </div>

                  {/* Preço Mensal */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Mensalidade (R$)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-955 dark:text-white font-bold"
                      value={planPrice}
                      onChange={e => setPlanPrice(Number(e.target.value))}
                      placeholder="0.00"
                    />
                  </div>

                  {/* Limite de Cartões */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Cartões de Crédito Máx.</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-955 dark:text-white font-bold"
                      value={limitCards}
                      onChange={e => setLimitCards(Number(e.target.value))}
                    />
                  </div>

                  {/* Limite de Potes */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Potes/Contas Máx.</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-955 dark:text-white font-bold"
                      value={limitPots}
                      onChange={e => setLimitPots(Number(e.target.value))}
                    />
                  </div>

                  {/* Limite de Categorias */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Categorias Máx.</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-955 dark:text-white font-bold"
                      value={limitCategories}
                      onChange={e => setLimitCategories(Number(e.target.value))}
                    />
                  </div>

                  {/* Limite de Metas */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Metas Financeiras Máx.</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-955 dark:text-white font-bold"
                      value={limitGoals}
                      onChange={e => setLimitGoals(Number(e.target.value))}
                    />
                  </div>
                </div>

                {/* Features Adicionais (Switches) */}
                <div className="bg-slate-50 dark:bg-slate-950/40 p-5 rounded-3xl border border-slate-100 dark:border-white/5 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Features Habilitadas no Plano</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Acesso ao Zenos IA</p>
                        <p className="text-[9px] text-slate-400">Permite usar o chat de inteligência artificial e comandos por voz.</p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setFeatureAI(!featureAI)}
                        className={`text-indigo-600 transition-all ${featureAI ? 'opacity-100' : 'opacity-40'}`}
                      >
                        {featureAI ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Acesso via Computador (PC View)</p>
                        <p className="text-[9px] text-slate-400">Habilita visualização e uso em resoluções desktop.</p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setFeatureWeb(!featureWeb)}
                        className={`text-indigo-600 transition-all ${featureWeb ? 'opacity-100' : 'opacity-40'}`}
                      >
                        {featureWeb ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Backup na Nuvem automático</p>
                        <p className="text-[9px] text-slate-400">Sincroniza transações e notas de forma persistente e instantânea.</p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setFeatureBackup(!featureBackup)}
                        className={`text-indigo-600 transition-all ${featureBackup ? 'opacity-100' : 'opacity-40'}`}
                      >
                        {featureBackup ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer Modal Plan */}
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-white/5">
                  <button 
                    type="button"
                    onClick={() => setShowPlanModal(false)}
                    className="py-3 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={savingPlan}
                    className="py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                  >
                    {savingPlan && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Salvar Plano
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
