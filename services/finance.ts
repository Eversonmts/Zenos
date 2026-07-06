
import { db } from './db';
import { Transaction, Profile, Account } from '../types';

export const financeService = {
  /**
   * Valida se o usuário pode criar um novo recurso baseado no seu plano
   * Atualmente simplificado já que o sistema está em transição para o novo schema
   */
  async checkLimit(userId: string, featureKey: 'accounts' | 'categories'): Promise<{ allowed: boolean; message?: string }> {
    const user = await db.users.getById(userId);
    if (!user) return { allowed: false, message: 'Usuário não encontrado' };

    // Se for admin, não tem limites
    if (user.role === 'admin') return { allowed: true };

    const data = await db.getFinancialData(userId);

    switch (featureKey) {
      case 'accounts':
        const accountLimit = 10; // TODO: Obter do plano real
        if (data.accounts.length >= accountLimit) {
          return { allowed: false, message: `Limite de contas atingido (${accountLimit}). Faça upgrade!` };
        }
        break;
      case 'categories':
        const catLimit = user.plan_id === 'premium' ? 100 : 20;
        if (data.categories.length >= catLimit) {
          return { allowed: false, message: `Limite de categorias atingido (${catLimit}). Faça upgrade!` };
        }
        break;
    }

    return { allowed: true };
  },

  /**
   * Processa a divisão de uma receita entre as contas ativas baseada na porcentagem
   */
  async apportionRevenue(userId: string, amount: number, transactionData: Partial<Transaction>, accounts: Account[]) {
    const activeAccounts = accounts.filter(a => a.is_active && a.percentage > 0);
    if (activeAccounts.length === 0) throw new Error('Nenhuma conta ativa para rateio');

    const newTransactions: Transaction[] = [];
    const updatedAccounts: Account[] = [...accounts];

    activeAccounts.forEach(account => {
      const share = (amount * account.percentage) / 100;
      if (share <= 0) return;

      const tx: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        user_id: userId,
        account_id: account.id,
        category_id: transactionData.category_id || '',
        subcategory_id: transactionData.subcategory_id || null,
        type: 'income',
        description: `${transactionData.description || 'Receita'} (${account.name})`,
        amount: share,
        date_at: transactionData.date_at || new Date().toISOString(),
        payment_method: transactionData.payment_method || 'PIX',
        is_recurring: transactionData.is_recurring || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      newTransactions.push(tx);
      
      const accIndex = updatedAccounts.findIndex(a => a.id === account.id);
      if (accIndex !== -1) {
        updatedAccounts[accIndex] = {
          ...updatedAccounts[accIndex],
          current_balance: updatedAccounts[accIndex].current_balance + share,
          updated_at: new Date().toISOString()
        };
      }
    });

    await db.saveTransactions(userId, [...(await db.getFinancialData(userId)).transactions, ...newTransactions]);
    await db.saveAccounts(userId, updatedAccounts);
  }
};
