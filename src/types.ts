export type Money = number; // integer VND
export type TxType = 'income' | 'expense' | 'transfer';
export type Status = 'completed' | 'pending';
export type PlanTier = 'free' | 'pro';

export interface User {
  id: string;
  name: string;
  email: string;
  currency: 'VND';
  financialMonthStart: number;
  plan: PlanTier;
  proExpiresAt?: string;
  streakCount: number;
  lastCheckInDate?: string;
  defaultAccountId?: string;
  nlpUsageToday?: { date: string; count: number };
}

export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'ewallet' | 'savings' | 'investment';
  openingBalance: Money;
  color: string;
  createdAt: string;
  active: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  hidden: boolean;
}

export interface Transaction {
  id: string;
  name: string;
  amount: Money;
  type: TxType;
  categoryId?: string;
  accountId: string;
  toAccountId?: string;
  date: string;
  method: string;
  note: string;
  status: Status;
  recurringId?: string;
}

export interface Budget {
  id: string;
  name: string;
  categoryId?: string;
  limit: Money;
  month: string;
}

export interface GoalContribution {
  id: string;
  amount: Money;
  date: string;
  accountId: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: Money;
  startDate: string;
  dueDate: string;
  accountId: string;
  icon: string;
  contributions: GoalContribution[];
}

export interface DebtPayment {
  id: string;
  amount: Money;
  date: string;
  note: string;
}

export interface Debt {
  id: string;
  name: string;
  kind: 'owed' | 'lent';
  principal: Money;
  startDate: string;
  dueDate: string;
  interestRate?: number;
  payments: DebtPayment[];
}

export interface RecurringTransaction {
  id: string;
  name: string;
  amount: Money;
  type: 'income' | 'expense';
  categoryId: string;
  accountId: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextDate: string;
  active: boolean;
  autoExecute?: boolean;
}

export interface QuickTemplate {
  id: string;
  label: string;
  name: string;
  amount: Money;
  type: 'income' | 'expense';
  categoryId: string;
  accountId?: string;
}

export interface Notification {
  id: string;
  title: string;
  read: boolean;
  date: string;
}

export interface FinanceData {
  user: User;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: SavingsGoal[];
  debts: Debt[];
  recurring: RecurringTransaction[];
  notifications: Notification[];
  quickTemplates: QuickTemplate[];
}
