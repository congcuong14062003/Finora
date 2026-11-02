import { differenceInCalendarDays, format, parseISO, subDays, addDays } from 'date-fns';
import type { FinanceData, InvestmentAsset, Budget } from '../types';
import { balance, budgetSpent, debtRemaining, monthKey, todayKey } from './finance';

export interface TrueSpendableResult {
  liquidity: number;
  upcomingRecurringBills: number;
  creditCardDueBalance: number;
  debtsDueThisMonth: number;
  trueBalance: number;
  dailySafeToSpend: number;
  daysRemainingInMonth: number;
  burnRate7Days: number;
  burnRateDaysLeft: number;
  burnRateExhaustionDate: string;
  status: 'safe' | 'warning' | 'danger';
}

export interface RiskAlert {
  id: string;
  level: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  actionLabel?: string;
  actionType?: 'rebalance' | 'pay_debt' | 'view_budget' | 'view_credit';
  rebalanceData?: {
    fromCategoryId: string;
    fromCategoryName: string;
    toCategoryId: string;
    toCategoryName: string;
    amount: number;
  };
}

export interface InvestmentPnLSummary {
  totalCostBasis: number;
  totalCurrentValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  assetsWithPnL: (InvestmentAsset & {
    currentValue: number;
    pnl: number;
    pnlPercent: number;
  })[];
  allocationByClass: { assetClass: string; label: string; value: number; color: string }[];
}

export interface FinancialFreedomProgress {
  monthlyActiveIncome: number;
  monthlyBusinessIncome: number;
  monthlyPassiveIncome: number;
  monthlyEssentialExpenses: number;
  freedomRatio: number; // percentage
  freedomRunwayMonths: number;
}

// Market reference prices for 1-Click Update
export const MARKET_PRICES: Record<string, number> = {
  FPT: 138000,
  VCB: 94500,
  HPG: 26500,
  E1VFVN30: 24800,
  SJC: 89000000, // 89tr / lượng
  'Nhẫn 9999': 87500000,
  '9999': 87500000,
  BTC: 2350000000, // 2.35 tỷ VND
  ETH: 78500000,
  SOL: 4850000,
  USDT: 25550
};

/**
 * 3.1. Số Dư Thực Được Tiêu (True Spendable Balance) & Ngày Cháy Túi
 * TrueBalance = Tổng tiền thanh khoản (Bank + Cash + E-Wallet) - (Hóa đơn định kỳ chưa trả trong tháng + Dư nợ thẻ tín dụng đến hạn + Khoản nợ phải trả trong tháng)
 */
export function calculateTrueSpendableBalance(data: FinanceData): TrueSpendableResult {
  const today = new Date();
  const todayStr = todayKey();
  const currentMonth = monthKey(today);
  const financialDay = data.user.financialMonthStart || 1;

  // 1. Liquidity: Cash, Bank, E-Wallet balances
  const liquidAccounts = data.accounts.filter(
    a => a.active && (a.type === 'bank' || a.type === 'cash' || a.type === 'ewallet')
  );
  const liquidity = liquidAccounts.reduce((sum, a) => sum + Math.max(0, balance(a, data.transactions)), 0);

  // 2. Upcoming recurring bills this month
  const upcomingRecurringBills = data.recurring
    .filter(r => r.active && r.type === 'expense' && r.nextDate.startsWith(currentMonth) && r.nextDate >= todayStr)
    .reduce((sum, r) => sum + r.amount, 0);

  // 3. Credit Card due balances
  // Credit card balance is negative when used (e.g. -12.000.000đ)
  const creditAccounts = data.accounts.filter(a => a.active && a.type === 'credit_card');
  const creditCardDueBalance = creditAccounts.reduce((sum, acc) => {
    const bal = balance(acc, data.transactions);
    return sum + (bal < 0 ? Math.abs(bal) : 0);
  }, 0);

  // 4. Debts due this month (Owed)
  const debtsDueThisMonth = data.debts
    .filter(d => d.kind === 'owed' && d.dueDate.startsWith(currentMonth))
    .reduce((sum, d) => sum + debtRemaining(d), 0);

  // True Balance
  const trueBalance = Math.max(0, liquidity - (upcomingRecurringBills + creditCardDueBalance + debtsDueThisMonth));

  // Days remaining in financial cycle
  let nextCycleDate = new Date(today.getFullYear(), today.getMonth(), financialDay);
  if (today.getDate() >= financialDay) {
    nextCycleDate = new Date(today.getFullYear(), today.getMonth() + 1, financialDay);
  }
  const daysRemainingInMonth = Math.max(1, differenceInCalendarDays(nextCycleDate, today));

  // Safe to Spend today
  const dailySafeToSpend = daysRemainingInMonth > 0 ? Math.round(trueBalance / daysRemainingInMonth) : 0;

  // Burn-Rate: average daily expense over last 7 days
  const sevenDaysAgo = format(subDays(today, 7), 'yyyy-MM-dd');
  const past7DaysExpenses = data.transactions
    .filter(t => t.type === 'expense' && t.status === 'completed' && t.date >= sevenDaysAgo && t.date <= todayStr)
    .reduce((sum, t) => sum + t.amount, 0);
  const burnRate7Days = Math.round(past7DaysExpenses / 7);

  // Burn-Rate Days Left & Exhaustion Date
  const burnRateDaysLeft = burnRate7Days > 0 ? Math.floor(trueBalance / burnRate7Days) : 999;
  const burnRateExhaustionDate = format(addDays(today, Math.min(burnRateDaysLeft, 365)), 'yyyy-MM-dd');

  let status: 'safe' | 'warning' | 'danger' = 'safe';
  if (burnRateDaysLeft <= 7 || trueBalance < debtsDueThisMonth + creditCardDueBalance) {
    status = 'danger';
  } else if (burnRateDaysLeft <= 15 || dailySafeToSpend < 100000) {
    status = 'warning';
  }

  return {
    liquidity,
    upcomingRecurringBills,
    creditCardDueBalance,
    debtsDueThisMonth,
    trueBalance,
    dailySafeToSpend,
    daysRemainingInMonth,
    burnRate7Days,
    burnRateDaysLeft,
    burnRateExhaustionDate,
    status
  };
}

/**
 * 3.2. Hệ thống Cảnh báo Rủi ro Đa tầng (Risk Alert Engine) & Điều phối 1-Click
 */
export function analyzeFinancialRisks(data: FinanceData): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  const today = new Date();
  const currentMonth = monthKey(today);

  // Check 1: Critical - Debts owed due <= 3 days
  data.debts.forEach(d => {
    if (d.kind === 'owed') {
      const rem = debtRemaining(d);
      if (rem > 0) {
        const daysLeft = differenceInCalendarDays(parseISO(d.dueDate), today);
        if (daysLeft >= 0 && daysLeft <= 3) {
          alerts.push({
            id: `debt-due-${d.id}`,
            level: 'critical',
            title: `Khoản nợ "${d.name}" còn ${daysLeft === 0 ? 'hôm nay' : `${daysLeft} ngày`} là đến hạn!`,
            description: `Dư nợ cần thanh toán: ${new Intl.NumberFormat('vi-VN').format(rem)} ₫. Vui lòng thanh toán trước ngày ${d.dueDate} để tránh phát sinh phạt trễ hạn.`,
            actionLabel: 'Xem khoản nợ',
            actionType: 'pay_debt'
          });
        }
      }
    }
  });

  // Check 2: Critical - Credit card statement or due day approaching
  const creditCards = data.accounts.filter(a => a.type === 'credit_card' && a.active);
  creditCards.forEach(card => {
    const bal = balance(card, data.transactions);
    const owed = bal < 0 ? Math.abs(bal) : 0;
    if (owed > 0 && card.dueDay) {
      const curDay = today.getDate();
      let daysUntilDue = card.dueDay - curDay;
      if (daysUntilDue < 0) {
        daysUntilDue += 30; // next month
      }
      if (daysUntilDue <= 3) {
        alerts.push({
          id: `cc-due-${card.id}`,
          level: 'critical',
          title: `Thẻ tín dụng "${card.name}" sắp đến hạn thanh toán!`,
          description: `Dư nợ hiện tại: ${new Intl.NumberFormat('vi-VN').format(owed)} ₫. Còn ${daysUntilDue} ngày tới hạn ngày ${card.dueDay}. Lãi suất phạt quá hạn: ${card.interestRate || 28}%/năm.`,
          actionLabel: 'Xem tài khoản thẻ',
          actionType: 'view_credit'
        });
      }
    }
  });

  // Check 3: Critical - Liquidity < Total debt due in next 7 days
  const liquidAccounts = data.accounts.filter(
    a => a.active && (a.type === 'bank' || a.type === 'cash' || a.type === 'ewallet')
  );
  const totalLiquidity = liquidAccounts.reduce((sum, a) => sum + Math.max(0, balance(a, data.transactions)), 0);

  const debtsDueNext7Days = data.debts
    .filter(d => {
      if (d.kind !== 'owed') return false;
      const days = differenceInCalendarDays(parseISO(d.dueDate), today);
      return days >= 0 && days <= 7;
    })
    .reduce((sum, d) => sum + debtRemaining(d), 0);

  if (totalLiquidity < debtsDueNext7Days && debtsDueNext7Days > 0) {
    alerts.push({
      id: 'liquidity-shortage',
      level: 'critical',
      title: 'Nguy cơ thiếu thanh khoản trong 7 ngày tới! (Cảnh báo vỡ nợ)',
      description: `Tổng tiền mặt & ngân hàng hiện có (${new Intl.NumberFormat('vi-VN').format(totalLiquidity)} ₫) nhỏ hơn tổng nợ phải trả trong 7 ngày tới (${new Intl.NumberFormat('vi-VN').format(debtsDueNext7Days)} ₫).`,
      actionLabel: 'Kiểm tra tài khoản',
      actionType: 'view_credit'
    });
  }

  // Check 4: Warning - Budget > 80% spent before half month elapsed
  const dayOfMonth = today.getDate();
  const isEarlyHalf = dayOfMonth <= 15;
  const monthlyBudgets = data.budgets.filter(b => b.month === currentMonth && b.categoryId);

  // Track overspent and surplus budgets for Smart Rebalancer
  const overspentBudgets: { budget: Budget; spent: number; exceeded: number; catName: string }[] = [];
  const surplusBudgets: { budget: Budget; spent: number; surplus: number; catName: string }[] = [];

  monthlyBudgets.forEach(b => {
    const spent = budgetSpent(b, data.transactions);
    const cat = data.categories.find(c => c.id === b.categoryId);
    const catName = cat?.name || b.name;

    if (spent > b.limit) {
      overspentBudgets.push({ budget: b, spent, exceeded: spent - b.limit, catName });
    } else if (b.limit - spent > 150000) {
      surplusBudgets.push({ budget: b, spent, surplus: b.limit - spent, catName });
    }

    if (isEarlyHalf && b.limit > 0 && spent / b.limit >= 0.8 && spent <= b.limit) {
      alerts.push({
        id: `budget-early-burn-${b.id}`,
        level: 'warning',
        title: `Cảnh báo tốc độ tiêu danh mục "${catName}"`,
        description: `Đã chi ${Math.round((spent / b.limit) * 100)}% ngân sách (${new Intl.NumberFormat('vi-VN').format(spent)} ₫ / ${new Intl.NumberFormat('vi-VN').format(b.limit)} ₫) dù chưa hết nửa tháng!`,
        actionLabel: 'Xem ngân sách',
        actionType: 'view_budget'
      });
    }
  });

  // Smart Budget Rebalancer Suggestion
  if (overspentBudgets.length > 0 && surplusBudgets.length > 0) {
    const worst = overspentBudgets[0];
    const best = surplusBudgets.sort((a, b) => b.surplus - a.surplus)[0];

    const rebalanceAmt = Math.min(worst.exceeded, Math.floor(best.surplus * 0.8));
    if (rebalanceAmt >= 50000 && best.budget.categoryId && worst.budget.categoryId) {
      alerts.push({
        id: `rebalance-${worst.budget.id}-${best.budget.id}`,
        level: 'warning',
        title: `Gợi ý điều phối ngân sách 1-Click: "${worst.catName}" vượt ngân sách`,
        description: `Danh mục "${worst.catName}" vượt ${new Intl.NumberFormat('vi-VN').format(worst.exceeded)} ₫, trong khi "${best.catName}" đang dư ${new Intl.NumberFormat('vi-VN').format(best.surplus)} ₫.`,
        actionLabel: `Bù ${new Intl.NumberFormat('vi-VN').format(rebalanceAmt)} ₫ từ ${best.catName} sang ${worst.catName}`,
        actionType: 'rebalance',
        rebalanceData: {
          fromCategoryId: best.budget.categoryId,
          fromCategoryName: best.catName,
          toCategoryId: worst.budget.categoryId,
          toCategoryName: worst.catName,
          amount: rebalanceAmt
        }
      });
    }
  }

  return alerts;
}

/**
 * Execute 1-Click Budget Rebalance
 */
export function executeBudgetRebalance(
  budgets: Budget[],
  month: string,
  fromCategoryId: string,
  toCategoryId: string,
  amount: number
): Budget[] {
  return budgets.map(b => {
    if (b.month === month && b.categoryId === fromCategoryId) {
      return { ...b, limit: Math.max(0, b.limit - amount) };
    }
    if (b.month === month && b.categoryId === toCategoryId) {
      return { ...b, limit: b.limit + amount };
    }
    return b;
  });
}

/**
 * 4.1. Investment Portfolio & Asset PnL Engine
 */
export function calculateInvestmentSummary(investments: InvestmentAsset[] = []): InvestmentPnLSummary {
  let totalCostBasis = 0;
  let totalCurrentValue = 0;

  const classLabels: Record<InvestmentAsset['assetClass'], { label: string; color: string }> = {
    stock: { label: 'Chứng khoán / Quỹ', color: '#3b82f6' },
    gold: { label: 'Vàng SJC / 9999', color: '#f59e0b' },
    crypto: { label: 'Tài sản số (Crypto)', color: '#f97316' },
    savings: { label: 'Tiết kiệm / Gửi góp', color: '#10b981' },
    real_estate: { label: 'Bất động sản', color: '#ec4899' }
  };

  const classTotals: Record<string, number> = {
    stock: 0,
    gold: 0,
    crypto: 0,
    savings: 0,
    real_estate: 0
  };

  const assetsWithPnL = investments.map(asset => {
    let currentVal = asset.quantity * asset.currentUnitPrice;

    // If savings or real estate with annual yield rate, factor in accrued yield
    if (asset.annualYieldRate && (asset.assetClass === 'savings' || asset.assetClass === 'real_estate')) {
      const daysHeld = Math.max(1, differenceInCalendarDays(new Date(), parseISO(asset.updatedAt || todayKey())));
      const accrued = Math.round(asset.totalCostBasis * (asset.annualYieldRate / 100) * (daysHeld / 365));
      currentVal = Math.max(currentVal, asset.totalCostBasis + accrued);
    }

    const pnl = currentVal - asset.totalCostBasis;
    const pnlPercent = asset.totalCostBasis > 0 ? (pnl / asset.totalCostBasis) * 100 : 0;

    totalCostBasis += asset.totalCostBasis;
    totalCurrentValue += currentVal;
    classTotals[asset.assetClass] = (classTotals[asset.assetClass] || 0) + currentVal;

    return {
      ...asset,
      currentValue: currentVal,
      pnl,
      pnlPercent
    };
  });

  const totalPnL = totalCurrentValue - totalCostBasis;
  const totalPnLPercent = totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0;

  const allocationByClass = Object.entries(classTotals)
    .filter(([_, val]) => val > 0)
    .map(([cls, val]) => ({
      assetClass: cls,
      label: classLabels[cls as InvestmentAsset['assetClass']]?.label || cls,
      value: val,
      color: classLabels[cls as InvestmentAsset['assetClass']]?.color || '#64748b'
    }));

  return {
    totalCostBasis,
    totalCurrentValue,
    totalPnL,
    totalPnLPercent,
    assetsWithPnL,
    allocationByClass
  };
}

/**
 * 4.2. Financial Freedom Progress (Passive Income vs Essential Expenses)
 */
export function calculateFinancialFreedom(data: FinanceData): FinancialFreedomProgress {
  const today = new Date();
  const past30DaysStr = format(subDays(today, 30), 'yyyy-MM-dd');
  const todayStr = todayKey();

  const recentTransactions = data.transactions.filter(
    t => t.status === 'completed' && t.date >= past30DaysStr && t.date <= todayStr
  );

  let monthlyActiveIncome = 0;
  let monthlyBusinessIncome = 0;
  let monthlyPassiveIncome = 0;
  let monthlyEssentialExpenses = 0;

  recentTransactions.forEach(t => {
    if (t.type === 'income') {
      const cat = data.categories.find(c => c.id === t.categoryId);
      const incomeKind = t.incomeSourceType || cat?.incomeKind || 'active';

      if (incomeKind === 'passive' || incomeKind === 'investment_yield') {
        monthlyPassiveIncome += t.amount;
      } else if (incomeKind === 'business') {
        monthlyBusinessIncome += t.amount;
      } else {
        monthlyActiveIncome += t.amount;
      }
    } else if (t.type === 'expense') {
      const cat = data.categories.find(c => c.id === t.categoryId);
      // Essential categories: marked isEssential or common essentials
      const isEssential =
        cat?.isEssential ??
        ['food', 'housing', 'bills', 'health', 'transport'].includes(cat?.id || '');

      if (isEssential) {
        monthlyEssentialExpenses += t.amount;
      }
    }
  });

  // If essential expenses recorded is 0, fallback to 70% of total expenses to avoid division by 0
  const totalExpense30Days = recentTransactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  const baselineEssential = monthlyEssentialExpenses > 0 ? monthlyEssentialExpenses : Math.max(1, Math.round(totalExpense30Days * 0.7));

  const freedomRatio = Math.min(100, Math.round((monthlyPassiveIncome / baselineEssential) * 100));

  const liquidBalance = data.accounts
    .filter(a => a.active && a.type !== 'credit_card')
    .reduce((sum, a) => sum + Math.max(0, balance(a, data.transactions)), 0);

  const investmentValue = (data.investments || []).reduce(
    (sum, inv) => sum + (inv.quantity * inv.currentUnitPrice),
    0
  );

  const totalAssets = liquidBalance + investmentValue;
  const freedomRunwayMonths = baselineEssential > 0 ? Number((totalAssets / baselineEssential).toFixed(1)) : 99;

  return {
    monthlyActiveIncome,
    monthlyBusinessIncome,
    monthlyPassiveIncome,
    monthlyEssentialExpenses: baselineEssential,
    freedomRatio,
    freedomRunwayMonths
  };
}
