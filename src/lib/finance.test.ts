import { describe, it, expect } from 'vitest';
import {
  balance,
  budgetSpent,
  debtRemaining,
  goalSaved,
  inRange,
  money,
  netWorth,
  totals
} from './finance';
import { parseVietnameseTransaction } from './nlpParser';
import { calculateSafeToSpend, createReconciliationTransaction, autoExecuteRecurring, updateStreak } from './habit';
import {
  canAddAccount,
  canAddBudget,
  canAddGoal,
  checkNlpUsage,
  canAutoExecuteRecurring
} from './subscription';
import type { Account, Budget, Debt, FinanceData, SavingsGoal, Transaction } from '../types';
import { seed } from '../mocks/data';

const accounts: Account[] = [
  {
    id: 'a',
    name: 'Tài khoản chính',
    type: 'bank',
    openingBalance: 1000000,
    color: '#000',
    createdAt: '2026-01-01',
    active: true
  },
  {
    id: 'b',
    name: 'Ví MoMo',
    type: 'ewallet',
    openingBalance: 200000,
    color: '#000',
    createdAt: '2026-01-01',
    active: true
  }
];

const base = (
  type: Transaction['type'],
  amount: number,
  extra: Partial<Transaction> = {}
): Transaction => ({
  id: 't',
  name: 'Test',
  type,
  amount,
  accountId: 'a',
  date: '2026-10-09',
  method: 'test',
  note: '',
  status: 'completed',
  ...extra
});

describe('Quy tắc tài chính cơ bản', () => {
  it('tính thu chi, bỏ qua chuyển khoản và giao dịch chờ', () => {
    expect(
      totals([
        base('income', 500000),
        base('expense', 120000),
        base('transfer', 200000, { toAccountId: 'b' }),
        base('expense', 90000, { status: 'pending' })
      ])
    ).toEqual({ income: 500000, expense: 120000 });
  });

  it('chuyển khoản giữ nguyên tổng số dư', () => {
    const tx = [base('transfer', 300000, { toAccountId: 'b' })];
    expect(balance(accounts[0], tx)).toBe(700000);
    expect(balance(accounts[1], tx)).toBe(500000);
    expect(accounts.reduce((n, a) => n + balance(a, tx), 0)).toBe(1200000);
  });

  it('tính ngân sách theo đúng danh mục, tháng và trạng thái', () => {
    const b: Budget = {
      id: 'b',
      name: 'Ăn uống',
      categoryId: 'food',
      limit: 1000000,
      month: '2026-10'
    };
    expect(
      budgetSpent(b, [
        base('expense', 200000, { categoryId: 'food' }),
        base('expense', 500000, { categoryId: 'travel' }),
        base('expense', 80000, { categoryId: 'food', date: '2026-09-30' }),
        base('expense', 100000, { categoryId: 'food', status: 'pending' })
      ])
    ).toBe(200000);
  });

  it('tính tiến độ mục tiêu và dư nợ', () => {
    const g: SavingsGoal = {
      id: 'g',
      name: 'Test',
      target: 1000000,
      startDate: '2026-01-01',
      dueDate: '2026-12-31',
      accountId: 'b',
      icon: 'Target',
      contributions: [{ id: 'c', amount: 350000, date: '2026-10-09', accountId: 'a' }]
    };
    const d: Debt = {
      id: 'd',
      name: 'Test',
      kind: 'owed',
      principal: 500000,
      startDate: '2026-01-01',
      dueDate: '2026-12-31',
      payments: [{ id: 'p', amount: 150000, date: '2026-10-09', note: '' }]
    };
    expect(goalSaved(g)).toBe(350000);
    expect(debtRemaining(d)).toBe(350000);
  });

  it('lọc ngày và định dạng VND', () => {
    expect(inRange(base('expense', 1), '2026-10-01', '2026-10-09')).toBe(true);
    expect(inRange(base('expense', 1), '2026-10-10', '2026-10-20')).toBe(false);
    expect(money(1500000)).toBe('1.500.000 ₫');
  });

  it('tài sản ròng không cộng mục tiêu tiết kiệm hai lần', () => {
    const data: FinanceData = {
      ...seed,
      accounts,
      transactions: [],
      debts: [],
      goals: [
        {
          id: 'g',
          name: 'G',
          target: 500000,
          startDate: '2026-01-01',
          dueDate: '2026-12-31',
          accountId: 'b',
          icon: 'Target',
          contributions: [{ id: 'c', amount: 200000, date: '2026-10-01', accountId: 'a' }]
        }
      ]
    };
    expect(netWorth(data)).toBe(1200000);
  });
});

describe('NLP Parser Tiếng Việt (Chống lười & Nhập nhanh)', () => {
  it('bóc tách đúng "ăn sáng 35k" -> 35.000, chi tiêu, danh mục food', () => {
    const result = parseVietnameseTransaction('ăn sáng 35k', seed.categories, accounts, 'a');
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(35000);
    expect(result?.type).toBe('expense');
    expect(result?.categoryId).toBe('food');
    expect(result?.name).toBe('Ăn sáng');
  });

  it('bóc tách đúng "đổ xăng 70k ví momo" -> 70.000, tài khoản ví MoMo', () => {
    const result = parseVietnameseTransaction('đổ xăng 70k ví momo', seed.categories, accounts, 'a');
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(70000);
    expect(result?.type).toBe('expense');
    expect(result?.categoryId).toBe('transport');
    expect(result?.accountId).toBe('b'); // account b is Ví MoMo
  });

  it('bóc tách đúng "lương tháng 25tr" -> 25.000.000, thu nhập', () => {
    const result = parseVietnameseTransaction('lương tháng 25tr', seed.categories, accounts, 'a');
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(25000000);
    expect(result?.type).toBe('income');
    expect(result?.categoryId).toBe('salary');
  });

  it('xử lý chuỗi định dạng số 350.000 hoặc 500k', () => {
    const r1 = parseVietnameseTransaction('mua áo 350.000', seed.categories, accounts, 'a');
    expect(r1?.amount).toBe(350000);
    expect(r1?.categoryId).toBe('shopping');

    const r2 = parseVietnameseTransaction('tiền điện 500k', seed.categories, accounts, 'a');
    expect(r2?.amount).toBe(500000);
    expect(r2?.categoryId).toBe('bills');
  });
});

describe('Chỉ số Safe-to-Spend & Cân bằng số dư 1-Click', () => {
  it('tính SafeToSpend dựa trên ngân sách tháng và số ngày còn lại', () => {
    const mockData: FinanceData = {
      ...seed,
      budgets: [{ id: 'b-main', name: 'Tổng chi tiêu', limit: 30000000, month: seed.budgets[0].month }],
      transactions: []
    };
    const safe = calculateSafeToSpend(mockData);
    expect(safe.totalBudget).toBe(30000000);
    expect(safe.remainingBudget).toBe(30000000);
    expect(safe.daysRemaining).toBeGreaterThanOrEqual(1);
    expect(safe.dailyLimit).toBeGreaterThan(0);
    expect(safe.status).toBe('safe');
  });

  it('cân bằng số dư khi số dư thực tế cao hơn số dư app (Tạo Thu nhập)', () => {
    const acc = accounts[0]; // openingBalance 1.000.000
    const res = createReconciliationTransaction(acc, 1500000, [], seed.categories);
    expect(res).not.toBeNull();
    expect(res?.difference).toBe(500000);
    expect(res?.transaction.type).toBe('income');
    expect(res?.transaction.amount).toBe(500000);
    expect(res?.transaction.accountId).toBe(acc.id);
  });

  it('cân bằng số dư khi số dư thực tế thấp hơn số dư app (Tạo Chi tiêu bù)', () => {
    const acc = accounts[0]; // openingBalance 1.000.000
    const res = createReconciliationTransaction(acc, 800000, [], seed.categories);
    expect(res).not.toBeNull();
    expect(res?.difference).toBe(-200000);
    expect(res?.transaction.type).toBe('expense');
    expect(res?.transaction.amount).toBe(200000);
  });

  it('cân bằng số dư trả về null khi số dư đã khớp', () => {
    const acc = accounts[0];
    const res = createReconciliationTransaction(acc, 1000000, [], seed.categories);
    expect(res).toBeNull();
  });

  it('cập nhật streak khi check-in hoặc có giao dịch', () => {
    const user = { ...seed.user, streakCount: 3, lastCheckInDate: '2026-10-08' };
    const res = updateStreak(user, '2026-10-09');
    expect(res.streakCount).toBe(4);
    expect(res.changed).toBe(true);

    // Cùng ngày không tăng chuỗi thêm
    const sameDay = updateStreak({ ...user, streakCount: 4, lastCheckInDate: '2026-10-09' }, '2026-10-09');
    expect(sameDay.streakCount).toBe(4);
    expect(sameDay.changed).toBe(false);
  });
});

describe('Phân tầng Free vs Pro (Monetization)', () => {
  it('giới hạn Free: tối đa 2 tài khoản, Pro không giới hạn', () => {
    const freeData: FinanceData = {
      ...seed,
      user: { ...seed.user, plan: 'free' },
      accounts: [accounts[0], accounts[1]]
    };
    expect(canAddAccount(freeData)).toBe(false);

    const proData: FinanceData = {
      ...freeData,
      user: { ...freeData.user, plan: 'pro' }
    };
    expect(canAddAccount(proData)).toBe(true);
  });

  it('giới hạn Free: tối đa 3 ngân sách, Pro không giới hạn', () => {
    const freeData: FinanceData = {
      ...seed,
      user: { ...seed.user, plan: 'free' },
      budgets: [
        { id: '1', name: 'A', limit: 100, month: '2026-11' },
        { id: '2', name: 'B', limit: 200, month: '2026-11' },
        { id: '3', name: 'C', limit: 300, month: '2026-11' }
      ]
    };
    expect(canAddBudget(freeData)).toBe(false);

    const proData: FinanceData = { ...freeData, user: { ...freeData.user, plan: 'pro' } };
    expect(canAddBudget(proData)).toBe(true);
  });

  it('giới hạn Free: tối đa 1 mục tiêu tiết kiệm', () => {
    const freeData: FinanceData = {
      ...seed,
      user: { ...seed.user, plan: 'free' },
      goals: [seed.goals[0]]
    };
    expect(canAddGoal(freeData)).toBe(false);
  });

  it('giới hạn NLP 5 lượt/ngày cho Free, Pro không giới hạn', () => {
    const today = new Date().toISOString().slice(0, 10);
    const freeData: FinanceData = {
      ...seed,
      user: {
        ...seed.user,
        plan: 'free',
        nlpUsageToday: { date: today, count: 5 }
      }
    };
    expect(checkNlpUsage(freeData).allowed).toBe(false);
    expect(checkNlpUsage(freeData).remaining).toBe(0);

    const proData: FinanceData = { ...freeData, user: { ...freeData.user, plan: 'pro' } };
    expect(checkNlpUsage(proData).allowed).toBe(true);
  });

  it('quyền tự động chạy giao dịch định kỳ (Auto-Execute) chỉ dành cho Pro', () => {
    const freeData: FinanceData = { ...seed, user: { ...seed.user, plan: 'free' } };
    expect(canAutoExecuteRecurring(freeData)).toBe(false);

    const proData: FinanceData = { ...seed, user: { ...seed.user, plan: 'pro' } };
    expect(canAutoExecuteRecurring(proData)).toBe(true);
  });

  it('hàm autoExecuteRecurring tự động sinh giao dịch khi đến hạn và autoExecute = true', () => {
    const today = new Date().toISOString().slice(0, 10);
    const mockData: FinanceData = {
      ...seed,
      transactions: [],
      recurring: [
        {
          id: 'rec-test',
          name: 'Netflix',
          amount: 150000,
          type: 'expense',
          categoryId: 'entertainment',
          accountId: 'a',
          frequency: 'monthly',
          nextDate: today,
          active: true,
          autoExecute: true
        }
      ]
    };
    const res = autoExecuteRecurring(mockData);
    expect(res.executedCount).toBe(1);
    expect(res.newTransactions.length).toBe(1);
    expect(res.newTransactions[0].name).toBe('Netflix');
    expect(res.newTransactions[0].amount).toBe(150000);
  });
});
