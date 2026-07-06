
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Transaction, Category, Account } from '../types';
import { ArrowUpRight, ArrowDownRight, Wallet, Target, TrendingUp, Filter } from 'lucide-react';

interface AnalyticsDashboardProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
}

export default function AnalyticsDashboard({ transactions, categories, accounts }: AnalyticsDashboardProps) {
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const monthlyStats = useMemo(() => {
    const months: Record<string, { income: number, expense: number }> = {};
    transactions.forEach(t => {
      const date = new Date(t.date_at);
      const monthKey = `${date.getMonth() + 1}/${date.getFullYear()}`;
      if (!months[monthKey]) months[monthKey] = { income: 0, expense: 0 };
      if (t.type === 'income') months[monthKey].income += t.amount;
      else months[monthKey].expense += t.amount;
    });
    return Object.entries(months).map(([name, data]) => ({ name, ...data }));
  }, [transactions]);

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const cat = categories.find(c => c.id === t.category_id)?.name || 'Outros';
        data[cat] = (data[cat] || 0) + t.amount;
      });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [transactions, categories]);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#212529] dark:text-white uppercase tracking-tighter">Inteligência Financeira</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Análise profunda de hábitos e patrimônio</p>
        </div>
        <div className="flex gap-2">
           <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#212529] dark:text-slate-400">
             <Filter className="w-4 h-4" /> Filtros
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#111827]/60 backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
             <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl"><TrendingUp className="w-5 h-5" /></div>
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Taxa de Poupança</span>
          </div>
          <div className="flex items-end gap-2">
             <span className="text-4xl font-black text-[#212529] dark:text-white tracking-tighter">{savingsRate.toFixed(1)}%</span>
             <span className={`text-xs font-bold mb-1 ${savingsRate > 20 ? 'text-emerald-500' : 'text-amber-500'}`}>
               {savingsRate > 20 ? 'Excelente' : 'Abaixo da Meta'}
             </span>
          </div>
          <div className="mt-4 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
             <div className="h-full bg-indigo-600 transition-all duration-1000" style={{ width: `${Math.max(0, savingsRate)}%` }} />
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827]/60 backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 shadow-sm">
           <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl"><ArrowUpRight className="w-5 h-5" /></div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Média de Receita</span>
           </div>
           <p className="text-4xl font-black text-[#212529] dark:text-white tracking-tighter">R$ {(totalIncome / Math.max(1, monthlyStats.length)).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
           <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase">Baseado em {monthlyStats.length} meses</p>
        </div>

        <div className="bg-white dark:bg-[#111827]/60 backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 shadow-sm">
           <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl"><ArrowDownRight className="w-5 h-5" /></div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Média de Gastos</span>
           </div>
           <p className="text-4xl font-black text-[#212529] dark:text-white tracking-tighter">R$ {(totalExpense / Math.max(1, monthlyStats.length)).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
           <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase">Baseado em {monthlyStats.length} meses</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#111827]/60 backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-[3rem] p-8 shadow-sm">
          <h3 className="text-lg font-black text-[#212529] dark:text-white uppercase tracking-tighter mb-8">Fluxo de Caixa Mensal</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyStats}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#CBD5E120" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} tickFormatter={(v) => `R$ ${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '16px', color: '#f8fafc' }}
                  itemStyle={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '10px' }}
                />
                <Area type="monotone" dataKey="income" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorIncome)" name="Entradas" />
                <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={4} fillOpacity={1} fill="url(#colorExpense)" name="Saídas" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827]/60 backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-[3rem] p-8 shadow-sm">
          <h3 className="text-lg font-black text-[#212529] dark:text-white uppercase tracking-tighter mb-8">Gastos por Categoria</h3>
          <div className="h-[300px] flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={8} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '16px', color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-1/3 space-y-3">
               {categoryData.slice(0, 5).map((item, i) => (
                 <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                       <span className="text-[10px] font-black text-slate-500 uppercase truncate max-w-[80px]">{item.name}</span>
                    </div>
                    <span className="text-[10px] font-black text-[#212529] dark:text-slate-300">R${(item.value).toFixed(0)}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
