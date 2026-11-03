import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { FinanceData, Account, Transaction, RecurringTransaction, User } from '../types';
import { balance, budgetSpent, monthKey, nextDate, todayKey, uid } from './finance';

export interface SafeToSpendResult {
  dailyLimit: number;
  remainingBudget: number;
  totalBudget: number;
  totalSpent: number;
  daysRemaining: number;
  status: 'safe' | 'warning' | 'danger';
}

/**
 * Calculate Daily Safe-to-Spend:
 * SafeToSpend = (Tổng hạn mức Ngân sách tháng - Tổng đã chi trong tháng) / Số ngày còn lại của tháng tài chính
 */
export function calculateSafeToSpend(data: FinanceData): SafeToSpendResult {
  const today = new Date();
  const currentMonth = monthKey(today);
  const financialDay = data.user.financialMonthStart || 1;

  // Find total budget for current month (either overall or sum of category budgets)
  const monthlyBudgets = data.budgets.filter(b => b.month === currentMonth);
  const overallBudget = monthlyBudgets.find(b => !b.categoryId);
  
  const totalBudget = overallBudget
    ? overallBudget.limit
    : monthlyBudgets.reduce((acc, b) => acc + b.limit, 0);

  // Total spent in this month
  const totalSpent = overallBudget
    ? budgetSpent(overallBudget, data.transactions)
    : data.transactions
        .filter(t => t.type === 'expense' && t.status === 'completed' && t.date.startsWith(currentMonth))
        .reduce((sum, t) => sum + t.amount, 0);

  const remainingBudget = Math.max(0, totalBudget - totalSpent);

  // Calculate days remaining until next financial cycle
  let nextCycleDate = new Date(today.getFullYear(), today.getMonth(), financialDay);
  if (today.getDate() >= financialDay) {
    nextCycleDate = new Date(today.getFullYear(), today.getMonth() + 1, financialDay);
  }
  const daysRemaining = Math.max(1, differenceInCalendarDays(nextCycleDate, today));

  const dailyLimit = totalBudget > 0 ? Math.round(remainingBudget / daysRemaining) : 0;

  let status: 'safe' | 'warning' | 'danger' = 'safe';
  if (totalBudget > 0) {
    const ratio = totalSpent / totalBudget;
    if (ratio >= 1) status = 'danger';
    else if (ratio >= 0.8) status = 'warning';
  }

  return {
    dailyLimit,
    remainingBudget,
    totalBudget,
    totalSpent,
    daysRemaining,
    status
  };
}

/**
 * Update daily streak on user activity or 0đ check-in
 */
export function updateStreak(user: User, activityDate: string = todayKey()): { streakCount: number; lastCheckInDate: string; changed: boolean } {
  const last = user.lastCheckInDate;
  if (!last) {
    return { streakCount: 1, lastCheckInDate: activityDate, changed: true };
  }

  if (last === activityDate) {
    // Already checked in today
    return { streakCount: user.streakCount, lastCheckInDate: activityDate, changed: false };
  }

  const daysDiff = differenceInCalendarDays(parseISO(activityDate), parseISO(last));
  if (daysDiff === 1) {
    // Consecutive day
    return { streakCount: user.streakCount + 1, lastCheckInDate: activityDate, changed: true };
  } else if (daysDiff > 1) {
    // Missed days
    return { streakCount: 1, lastCheckInDate: activityDate, changed: true };
  }

  return { streakCount: user.streakCount, lastCheckInDate: user.lastCheckInDate || activityDate, changed: false };
}

/**
 * 1-Click Balance Reconciliation
 * chênh_lệch = Số_dư_thực_tế - Số_dư_trên_app
 * Sinh ra 1 giao dịch điều chỉnh (Thu hoặc Chi) vào danh mục "Điều chỉnh số dư / Quên ghi"
 */
export function createReconciliationTransaction(
  account: Account,
  actualBalance: number,
  allTransactions: Transaction[],
  categories: { id: string; type: string }[]
): { transaction: Transaction; difference: number } | null {
  const currentAppBalance = balance(account, allTransactions);
  const difference = actualBalance - currentAppBalance;

  if (difference === 0) return null;

  const isIncome = difference > 0;
  const absAmount = Math.abs(difference);
  
  // Find category for adjustment
  const targetType = isIncome ? 'income' : 'expense';
  const categoryId = isIncome ? 'reconcile-income' : 'reconcile-expense';
  const fallbackCat = categories.find(c => c.type === targetType)?.id || categoryId;

  const tx: Transaction = {
    id: uid(),
    name: `Điều chỉnh số dư (${account.name})`,
    amount: absAmount,
    type: isIncome ? 'income' : 'expense',
    categoryId: fallbackCat,
    accountId: account.id,
    date: todayKey(),
    method: 'Cân bằng số dư',
    note: `Điều chỉnh tự động từ ${new Intl.NumberFormat('vi-VN').format(currentAppBalance)} ₫ sang ${new Intl.NumberFormat('vi-VN').format(actualBalance)} ₫ (lệch ${isIncome ? '+' : '-'}${new Intl.NumberFormat('vi-VN').format(absAmount)} ₫)`,
    status: 'completed'
  };

  return { transaction: tx, difference };
}

/**
 * Scan and Auto-execute recurring transactions where nextDate <= today and autoExecute === true
 */
export function autoExecuteRecurring(data: FinanceData): {
  updatedRecurring: RecurringTransaction[];
  newTransactions: Transaction[];
  executedCount: number;
} {
  const today = todayKey();
  const newTransactions: Transaction[] = [];
  const updatedRecurring: RecurringTransaction[] = [];
  let executedCount = 0;

  for (const r of data.recurring) {
    if (r.active && r.autoExecute && r.nextDate <= today) {
      // Check if already executed for this date
      const alreadyRun = data.transactions.some(t => t.recurringId === r.id && t.date === r.nextDate);
      if (!alreadyRun) {
        const tx: Transaction = {
          id: uid(),
          name: r.name,
          amount: r.amount,
          type: r.type,
          categoryId: r.categoryId,
          accountId: r.accountId,
          date: r.nextDate,
          method: 'Tự động định kỳ',
          note: 'Hệ thống tự động ghi nhận theo lịch định kỳ',
          status: 'completed',
          recurringId: r.id
        };
        newTransactions.push(tx);
        executedCount++;
      }
      updatedRecurring.push({
        ...r,
        nextDate: nextDate(r)
      });
    } else {
      updatedRecurring.push(r);
    }
  }

  return {
    updatedRecurring,
    newTransactions,
    executedCount
  };
}
