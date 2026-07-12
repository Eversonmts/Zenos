import React, { useState, useEffect } from 'react';
import { 
  Users, Crown, TrendingUp, UserMinus, ShieldAlert, 
  Search, Filter, MoreVertical, Ban, CheckCircle, 
  Trash2, RefreshCw, Loader2, ArrowLeft, Activity, 
  Eye, HelpCircle, HardDrive, Settings2, 
  Clock, CheckCircle2, Globe
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
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'gateway' | 'security'>('overview');
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
  const [filter, setFilter] = useState<'all' | 'active' | 'blocked' | 'pro'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carrega estatísticas, usuários e planos
      const [statsData, usersData, plansData] = await Promise.all([
        adminService.getStats(),
        adminService.listUsers(),
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
          adminService.listWebhooks(),
          adminService.listDunningAttempts(),
          adminService.listReceipts()
        ]);
        setWebhooks(webhooksData);
        setDunning(dunningData);
        setReceipts(receiptsData);
      } else if (activeTab === 'security') {
        const [auditData, ticketsData, healthData] = await Promise.all([
          adminService.listAuditLogs(),
          adminService.listSupportTickets(),
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

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (u.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    if (filter === 'active') return u.status === 'active';
    if (filter === 'blocked') return u.status === 'blocked';
    if (filter === 'pro') return u.subscriptionStatus === 'active';
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
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs outline-none text-slate-955 dark:text-white font-bold"
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
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-center text-slate-950 dark:text-white font-bold"
                          value={feeOperationalPct}
                          onChange={e => setFeeOperationalPct(Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-bold text-slate-400 block mb-1">Lucro Líquido</label>
                        <input 
                          type="number" 
                          max="100"
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-xs text-center text-slate-950 dark:text-white font-bold"
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
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-700'}`}
                  >
                    Todos
                  </button>
                  <button 
                    onClick={() => setFilter('active')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'active' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-700'}`}
                  >
                    Ativos
                  </button>
                  <button 
                    onClick={() => setFilter('blocked')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'blocked' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}
                  >
                    Bloqueados
                  </button>
                  <button 
                    onClick={() => setFilter('pro')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'pro' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}
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
                      <th className="px-6 py-4">Status Acesso</th>
                      <th className="px-6 py-4">Criado em</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {filteredUsers.length > 0 ? filteredUsers.map(u => (
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
                                {u.subscriptionStatus === 'active' ? 'Assinante' : u.subscriptionStatus === 'trial' ? 'Trial 7 Dias' : 'Gratuito'}
                              </span>
                            </div>
                            {u.subscriptionStatus === 'trial' && u.trialEndsAt && (
                              <span className="text-[9px] text-slate-400 font-bold">Expira: {new Date(u.trialEndsAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                            u.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600'
                          }`}>
                            {u.status === 'active' ? 'Ativo' : 'Bloqueado'}
                          </span>
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
                                {onSimulateUser && u.id !== user.id && (
                                  <button 
                                    onClick={() => onSimulateUser(u.id)}
                                    title="Logar como usuário (Shadowing)"
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/5 rounded-lg transition-all"
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
                                  title="Resetar Trial (7 dias)"
                                  className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>

                                <div className="relative group/menu">
                                  <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/5 rounded-lg transition-all">
                                    <MoreVertical className="w-4 h-4" />
                                  </button>
                                  <div className="absolute right-0 bottom-full mb-2 hidden group-hover/menu:block w-48 bg-white dark:bg-[#0a0c14] border border-slate-200 dark:border-white/5 rounded-2xl shadow-xl z-50 p-2 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                                     <p className="px-3 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5 mb-1">Upgrade Plano</p>
                                     {plans.map(plan => (
                                       <button 
                                         key={plan.id}
                                         onClick={() => handleUpgradeUser(u.id, plan.id)}
                                         className="w-full text-left px-3 py-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-white/5 rounded-xl transition-all flex items-center justify-between"
                                       >
                                          <span>{plan.name}</span>
                                          <Crown className="w-3 h-3 text-amber-500" />
                                       </button>
                                     ))}
                                     <div className="border-t border-slate-100 dark:border-white/5 my-1" />
                                     <button 
                                       onClick={() => handleDeleteUser(u.id)}
                                       className="w-full text-left px-3 py-2 text-[10px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all flex items-center justify-between"
                                     >
                                        <span>Excluir Usuário</span>
                                        <Trash2 className="w-3 h-3" />
                                     </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )) : (
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

          {/* TAB 3: GATEWAY & WEBHOOKS */}
          {activeTab === 'gateway' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
              {/* Webhooks Log */}
              <div className="bg-white dark:bg-[#0a0c14] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-500" /> Log de Webhooks Recentes (Gateway)
                </h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {webhooks.map(wh => (
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
                  ))}
                </div>
              </div>

              {/* Dunning Attempts */}
              <div className="bg-white dark:bg-[#0a0c14] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500" /> Recuperação de Dunning (Inadimplência)
                </h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {dunning.map(d => (
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
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY & SUPPORT */}
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
                    {tickets.map(ticket => (
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
                    ))}
                  </div>
                </div>

                {/* Audit Logs */}
                <div className="bg-white dark:bg-[#0a0c14] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
                  <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-wider flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-indigo-500" /> Log de Auditoria do Admin (Audit Trails)
                  </h3>
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {auditLogs.map(log => (
                      <div key={log.id} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl text-xs space-y-1 border border-slate-100 dark:border-white/5">
                        <div className="flex justify-between font-bold">
                          <span className="text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider">{log.action.replace('_', ' ')}</span>
                          <span className="text-[9px] text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-[10px] text-slate-500">Admin ID: {log.user_id}</p>
                        {log.details && <p className="text-[10px] text-slate-400 font-bold italic">{log.details.note || JSON.stringify(log.details)}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Security Advisory footer */}
      <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 p-6 rounded-3xl flex items-start gap-4">
         <div className="p-3 bg-amber-200/50 dark:bg-amber-500/20 rounded-2xl flex-shrink-0">
            <ShieldAlert className="w-6 h-6 text-amber-600" />
         </div>
         <div className="flex-1">
            <h4 className="text-sm font-black text-amber-900 dark:text-amber-500 uppercase tracking-widest mb-1 font-sans">Área Restrita (Segurança Crítica)</h4>
            <p className="text-xs text-amber-700 dark:text-amber-500/70 font-bold leading-relaxed">
              Você está acessando o núcleo administrativo. Alterações aqui impactam diretamente o faturamento e o acesso dos usuários. 
              As exclusões são irreversíveis e logs de auditoria estão sendo registrados.
            </p>
         </div>
         <div className="hidden lg:block px-4 py-2 bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl">
           Admin: {user.email}
         </div>
      </div>
    </div>
  );
}
