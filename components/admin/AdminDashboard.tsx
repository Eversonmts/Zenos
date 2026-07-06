
import React, { useState, useEffect } from 'react';
import { 
  Users, Crown, TrendingUp, UserMinus, ShieldAlert, 
  Search, Filter, MoreVertical, Ban, CheckCircle, 
  Trash2, RefreshCw, Loader2, ArrowLeft
} from 'lucide-react';
import { Profile, Plan, UserStatus } from '../../types';
import { adminService } from '../../services/adminService';
import { db } from '../../services/db';

interface AdminDashboardProps {
  user: Profile;
  onLogout: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onBack?: () => void;
}

interface AdminStats {
  totalUsers: number;
  activeSubscribers: number;
  mrr: number;
  churnRate: number;
}

export default function AdminDashboard({ user, showToast, onBack }: AdminDashboardProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'blocked' | 'pro'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, usersData, plansData] = await Promise.all([
        adminService.getStats(),
        adminService.listUsers(),
        db.admin.plans.list()
      ]);
      setStats(statsData);
      setUsers(usersData);
      setPlans(plansData);
    } catch (error) {
      showToast('Erro ao carregar dados do painel', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async (userId: string, currentStatus: UserStatus) => {
    setActionLoading(userId);
    try {
      await adminService.toggleUserBlock(userId, currentStatus);
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
      await adminService.resetTrial(userId);
      showToast('Trial resetado por mais 7 dias', 'success');
      loadData();
    } catch (error) {
      showToast('Erro ao resetar trial', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Deseja excluir permanentemente este usuário? Esta ação não pode ser desfeita.')) return;
    
    setActionLoading(userId);
    try {
      await adminService.deleteUser(userId);
      showToast('Usuário excluído com sucesso', 'success');
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
      await adminService.upgradeUser(userId, planId);
      showToast('Plano atualizado com sucesso', 'success');
      loadData();
    } catch (error) {
      showToast('Erro ao atualizar plano', 'error');
    } finally {
      setActionLoading(null);
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#030712] p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Admin Dashboard</h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Painel de Controle Arkad Finance</p>
          </div>
        </div>
        <button 
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600/10 text-indigo-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-600/20 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar Dados
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white dark:bg-[#0a0c14] p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">+12%</span>
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Usuários</p>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{stats?.totalUsers}</h2>
        </div>

        <div className="bg-white dark:bg-[#0a0c14] p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-500/10 rounded-2xl">
              <Crown className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-[10px] font-black text-slate-400 bg-slate-50 dark:bg-slate-500/10 px-2 py-1 rounded-lg">PRO</span>
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Assinantes Ativos</p>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{stats?.activeSubscribers}</h2>
        </div>

        <div className="bg-white dark:bg-[#0a0c14] p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Receita (MRR)</p>
          <h2 className="text-3xl font-black text-emerald-600 tracking-tighter">R$ {stats?.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
        </div>

        <div className="bg-white dark:bg-[#0a0c14] p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 rounded-2xl">
              <UserMinus className="w-6 h-6 text-rose-600" />
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Taxa de Churn</p>
          <h2 className="text-3xl font-black text-rose-600 tracking-tighter">{stats?.churnRate.toFixed(1)}%</h2>
        </div>
      </div>

      {/* User Management Section */}
      <div className="bg-white dark:bg-[#0a0c14] rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou email..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-[#030712] border border-slate-200 dark:border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'active' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}
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

      {/* Security Advisory */}
      <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 p-6 rounded-3xl flex items-start gap-4">
         <div className="p-3 bg-amber-200/50 dark:bg-amber-500/20 rounded-2xl">
            <ShieldAlert className="w-6 h-6 text-amber-600" />
         </div>
         <div className="flex-1">
            <h4 className="text-sm font-black text-amber-900 dark:text-amber-500 uppercase tracking-widest mb-1">Área Restrita (Segurança Crítica)</h4>
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
