import type { FinanceData } from '../types';
import { todayKey } from './finance';

export const PRO_LIMITS = {
  free: {
    accounts: 2,
    budgets: 3,
    goals: 1,
    quickTemplates: 3,
    nlpPerDay: 5,
    allowAllReports: false,
    allowAutoRecurring: false,
    allowCsvExport: false,
  },
  pro: {
    accounts: Infinity,
    budgets: Infinity,
    goals: Infinity,
    quickTemplates: Infinity,
    nlpPerDay: Infinity,
    allowAllReports: true,
    allowAutoRecurring: true,
    allowCsvExport: true,
  }
} as const;

export interface PlanOption {
  id: 'month' | 'year' | 'lifetime';
  name: string;
  price: number;
  originalPrice?: number;
  billing: string;
  badge?: string;
  popular?: boolean;
}

export const PLAN_OPTIONS: PlanOption[] = [
  {
    id: 'month',
    name: 'Gói Tháng',
    price: 49000,
    billing: '49.000 ₫ / tháng',
    badge: 'Linh hoạt'
  },
  {
    id: 'year',
    name: 'Gói Năm',
    price: 399000,
    originalPrice: 588000,
    billing: '33.250 ₫ / tháng (399.000 ₫/năm)',
    badge: 'Tiết kiệm 32%',
    popular: true
  },
  {
    id: 'lifetime',
    name: 'Gói Trọn Đời',
    price: 799000,
    billing: 'Thanh toán một lần duy nhất',
    badge: 'VIP Lifetime'
  }
];

export function isProUser(data: FinanceData): boolean {
  return data.user.plan === 'pro';
}

export function canAddAccount(data: FinanceData): boolean {
  if (isProUser(data)) return true;
  return data.accounts.length < PRO_LIMITS.free.accounts;
}

export function canAddBudget(data: FinanceData): boolean {
  if (isProUser(data)) return true;
  return data.budgets.length < PRO_LIMITS.free.budgets;
}

export function canAddGoal(data: FinanceData): boolean {
  if (isProUser(data)) return true;
  return data.goals.length < PRO_LIMITS.free.goals;
}

export function canAddQuickTemplate(data: FinanceData): boolean {
  if (isProUser(data)) return true;
  return (data.quickTemplates?.length || 0) < PRO_LIMITS.free.quickTemplates;
}

export function checkNlpUsage(data: FinanceData): { allowed: boolean; remaining: number } {
  if (isProUser(data)) return { allowed: true, remaining: Infinity };
  
  const today = todayKey();
  const usage = data.user.nlpUsageToday;
  const count = usage && usage.date === today ? usage.count : 0;
  const limit = PRO_LIMITS.free.nlpPerDay;
  const remaining = Math.max(0, limit - count);

  return {
    allowed: count < limit,
    remaining
  };
}

export function canUsePeriodInReport(data: FinanceData, period: string): boolean {
  if (isProUser(data)) return true;
  return period === 'month';
}

export function canAutoExecuteRecurring(data: FinanceData): boolean {
  return isProUser(data);
}
