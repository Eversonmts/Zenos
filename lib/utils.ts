
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  // If it's already a full ISO string, just return new Date
  if (dateStr.includes('T')) return new Date(dateStr);
  
  // Split YYYY-MM-DD and create a date in local time
  const [year, month, day] = dateStr.split('-').map(Number);
  // Note: month is 0-indexed in new Date(y, m, d)
  return new Date(year, month - 1, day);
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  // Expected format: YYYY-MM-DD
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

/**
 * Calcula a data de vencimento da fatura em que uma compra no cartão cai,
 * seguindo a regra: compra até o "melhor dia de compra" (dia de fechamento)
 * cai na fatura que já está fechando -> vence no próximo vencimento. Compra
 * feita DEPOIS do melhor dia de compra só entra na fatura seguinte -> vence
 * um mês depois disso.
 *
 * @param purchaseDate data da compra (YYYY-MM-DD)
 * @param closingDay "melhor dia de compra" (dia de fechamento da fatura)
 * @param dueDay dia de vencimento da fatura
 */
export function calculateCardDueDate(purchaseDate: string, closingDay: number, dueDay: number): Date {
  const purchase = parseLocalDate(purchaseDate);
  const purchaseDay = purchase.getDate();

  // Mês/ano de referência do fechamento em que a compra cai
  let refMonth = purchase.getMonth();
  let refYear = purchase.getFullYear();

  if (purchaseDay > closingDay) {
    // Comprou depois do melhor dia -> só entra na fatura que fecha no mês seguinte
    refMonth += 1;
    if (refMonth > 11) { refMonth = 0; refYear += 1; }
  }

  // Se o vencimento cai num dia numericamente MENOR que o fechamento, o
  // vencimento acontece no mês seguinte ao fechamento (caso mais comum:
  // fecha dia 25, vence dia 05). Caso contrário, vence no mesmo mês do fechamento.
  let dueMonth = refMonth;
  let dueYear = refYear;
  if (dueDay < closingDay) {
    dueMonth += 1;
    if (dueMonth > 11) { dueMonth = 0; dueYear += 1; }
  }

  return new Date(dueYear, dueMonth, dueDay);
}

/**
 * Gera as datas de vencimento de cada parcela de uma compra parcelada no cartão.
 */
export function calculateInstallmentDueDates(purchaseDate: string, closingDay: number, dueDay: number, installments: number): Date[] {
  const firstDue = calculateCardDueDate(purchaseDate, closingDay, dueDay);
  const dates: Date[] = [];
  for (let i = 0; i < installments; i++) {
    const d = new Date(firstDue.getFullYear(), firstDue.getMonth() + i, firstDue.getDate());
    dates.push(d);
  }
  return dates;
}

export function formatDateObject(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function getYearMonth(dateStr: string): { year: number, month: number } {
  if (!dateStr) return { year: 0, month: 0 };
  const parts = dateStr.split('T')[0].split('-');
  return {
    year: parseInt(parts[0]),
    month: parseInt(parts[1]) - 1 // 0-indexed to match JS Date
  };
}

export function formatCurrency(value: number): string {
  return (value || 0).toLocaleString('pt-BR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

export function validateEmail(email: string): boolean {
  if (!email) return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email.trim());
}

export function validateCPF(cpf: string): boolean {
  if (!cpf) return false;
  const clean = cpf.replace(/[^\d]/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i)) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i)) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10))) return false;

  return true;
}
