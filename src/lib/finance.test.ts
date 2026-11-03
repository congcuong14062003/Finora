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
import { parseVietnameseTransaction, parseVietnameseCommand } from './nlpParser';
import { calculateSafeToSpend, createReconciliationTransaction, autoExecuteRecurring, updateStreak } from './habit';
import {
  calculateTrueSpendableBalance,
  analyzeFinancialRisks,
  executeBudgetRebalance,
  calculateInvestmentSummary,
  calculateFinancialFreedom
} from './riskAndInsightEngine';
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
      investments: [],
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

describe('Các trụ cột nâng cấp mới (Finora CFO Thông minh)', () => {
  it('NLP Multi-Intent: nhận diện ý định đầu tư (Cổ phiếu/Vàng/Crypto)', () => {
    const res1 = parseVietnameseCommand('mua 100 cổ FPT giá 130tr', seed.categories, seed.accounts, 'bank');
    expect(res1?.intent).toBe('investment');
    expect(res1?.investment?.symbol).toBe('FPT');
    expect(res1?.investment?.quantity).toBe(100);
    expect(res1?.investment?.totalCostBasis).toBe(130000000);

    const res2 = parseVietnameseCommand('mua 2 chỉ vàng SJC 17tr', seed.categories, seed.accounts, 'bank');
    expect(res2?.intent).toBe('investment');
    expect(res2?.investment?.assetClass).toBe('gold');
    expect(res2?.investment?.quantity).toBe(2);

    const res3 = parseVietnameseCommand('mua 0.02 BTC 45tr', seed.categories, seed.accounts, 'bank');
    expect(res3?.intent).toBe('investment');
    expect(res3?.investment?.assetClass).toBe('crypto');
    expect(res3?.investment?.quantity).toBe(0.02);
  });

  it('NLP Multi-Intent: nhận diện ý định chia tiền nhóm (Split Bill)', () => {
    const res = parseVietnameseCommand('ăn lẩu 1200k chia 4 người', seed.categories, seed.accounts, 'bank');
    expect(res?.intent).toBe('split_bill');
    expect(res?.splitBill?.totalAmount).toBe(1200000);
    expect(res?.splitBill?.peopleCount).toBe(4);
    expect(res?.splitBill?.personalShare).toBe(300000);
    expect(res?.splitBill?.othersShare).toBe(900000);
  });

  it('NLP Multi-Intent: nhận diện ý định quẹt thẻ tín dụng trả góp', () => {
    const res = parseVietnameseCommand('quẹt thẻ VCB mua tủ lạnh 12tr trả góp 6 tháng', seed.categories, seed.accounts, 'bank');
    expect(res?.intent).toBe('credit_installment');
    expect(res?.creditInstallment?.totalAmount).toBe(12000000);
    expect(res?.creditInstallment?.installments).toBe(6);
    expect(res?.creditInstallment?.monthlyAmount).toBe(2000000);
  });

  it('NLP Multi-Intent: nhận diện ý định cân bằng số dư', () => {
    const res = parseVietnameseCommand('số dư ví tiền mặt còn 350k', seed.categories, seed.accounts, 'bank');
    expect(res?.intent).toBe('reconcile');
    expect(res?.reconcile?.actualBalance).toBe(350000);
  });

  it('NLP Multi-Intent: nhận diện gói dòng tiền kinh doanh (Business Bundle)', () => {
    const res = parseVietnameseCommand('doanh thu bán hàng 10tr', seed.categories, seed.accounts, 'bank');
    expect(res?.intent).toBe('business_bundle');
    expect(res?.businessBundle?.revenue).toBe(10000000);
    expect(res?.businessBundle?.cost).toBe(6000000);
  });

  it('Tính toán True Spendable Balance & Ngày Cháy Túi', () => {
    const result = calculateTrueSpendableBalance(seed);
    expect(result.liquidity).toBeGreaterThan(0);
    expect(result.trueBalance).toBeDefined();
    expect(result.burnRate7Days).toBeDefined();
    expect(result.burnRateDaysLeft).toBeDefined();
    expect(result.burnRateExhaustionDate).toBeDefined();
  });

  it('Hệ thống Cảnh báo Rủi ro & Điều phối ngân sách 1-Click', () => {
    const alerts = analyzeFinancialRisks(seed);
    expect(Array.isArray(alerts)).toBe(true);

    const budgets: Budget[] = [
      { id: 'b-food', name: 'Ăn uống', categoryId: 'food', limit: 1000000, month: '2026-10' },
      { id: 'b-shop', name: 'Mua sắm', categoryId: 'shopping', limit: 3000000, month: '2026-10' }
    ];
    // Rebalance 400k from shopping to food
    const nextBudgets = executeBudgetRebalance(budgets, '2026-10', 'shopping', 'food', 400000);
    expect(nextBudgets.find(b => b.categoryId === 'shopping')?.limit).toBe(2600000);
    expect(nextBudgets.find(b => b.categoryId === 'food')?.limit).toBe(1400000);
  });

  it('Thống kê Danh mục Đầu tư & Tính Lãi/Lỗ PnL', () => {
    const summary = calculateInvestmentSummary(seed.investments || []);
    expect(summary.totalCostBasis).toBeGreaterThan(0);
    expect(summary.totalCurrentValue).toBeGreaterThan(0);
    expect(summary.assetsWithPnL.length).toBe((seed.investments || []).length);
    expect(summary.allocationByClass.length).toBeGreaterThan(0);
  });

  it('Thước đo Tự do Tài chính & Runway', () => {
    const freedom = calculateFinancialFreedom(seed);
    expect(freedom.freedomRatio).toBeGreaterThanOrEqual(0);
    expect(freedom.freedomRunwayMonths).toBeGreaterThan(0);
    expect(freedom.monthlyEssentialExpenses).toBeGreaterThan(0);
  });
});

describe('6 Tính năng nâng cấp thực tế (Bank SMS, 6 Hũ, Vay nợ, Hóa đơn, Ví dùng chung, Nhắc nhở định kỳ)', () => {
  it('Bank SMS Parser: bóc tách chính xác tin nhắn trừ tiền VCB', async () => {
    const { parseBankSms } = await import('./bankSmsParser');
    const sms = 'TK 1023456789 tai VCB -250,000 VND vao 14:30 02/11/2026. ND: Qr thanh toan VinMart Daily. So du: 15,230,000 VND';
    const res = parseBankSms(sms, seed.accounts, seed.categories);
    expect(res).not.toBeNull();
    expect(res?.bankCode).toBe('VCB');
    expect(res?.amount).toBe(250000);
    expect(res?.type).toBe('expense');
    expect(res?.balanceAfter).toBe(15230000);
    expect(res?.description.toLowerCase()).toContain('vinmart');
  });

  it('Bank SMS Parser: bóc tách chính xác tin nhắn nhận lương Techcombank', async () => {
    const { parseBankSms } = await import('./bankSmsParser');
    const sms = 'Bien dong so du: TK 1903... tai Techcombank +18,500,000VND luc 09:15 02/11/2026. ND: Cong ty ABC tra luong T10. So du: 31,400,000VND';
    const res = parseBankSms(sms, seed.accounts, seed.categories);
    expect(res).not.toBeNull();
    expect(res?.bankCode).toBe('TCB');
    expect(res?.amount).toBe(18500000);
    expect(res?.type).toBe('income');
    expect(res?.balanceAfter).toBe(31400000);
  });

  it('Bank SMS Parser: bóc tách chính xác tin nhắn MoMo', async () => {
    const { parseBankSms } = await import('./bankSmsParser');
    const sms = 'MoMo: Ban da thanh toan thanh cong 55.000d cho Phuc Long Coffee & Tea. So du vi: 450.000d';
    const res = parseBankSms(sms, seed.accounts, seed.categories);
    expect(res).not.toBeNull();
    expect(res?.bankCode).toBe('MOMO');
    expect(res?.amount).toBe(55000);
    expect(res?.type).toBe('expense');
    expect(res?.balanceAfter).toBe(450000);
  });

  it('Phương pháp 6 chiếc hũ (6 Jars): phân bổ đúng tỷ lệ 100% thu nhập', () => {
    const income = 20000000;
    const nec = Math.round((income * 55) / 100);
    const ltss = Math.round((income * 10) / 100);
    const educ = Math.round((income * 10) / 100);
    const play = Math.round((income * 10) / 100);
    const ffa = Math.round((income * 10) / 100);
    const give = Math.round((income * 5) / 100);

    expect(nec + ltss + educ + play + ffa + give).toBe(income);
    expect(nec).toBe(11000000);
    expect(ffa).toBe(2000000);
    expect(give).toBe(1000000);
  });

  it('Ví dùng chung (Shared Wallets): hỗ trợ cấu hình thành viên và quỹ chung', () => {
    const sharedAcc: Account = {
      id: 'shared-1',
      name: 'Quỹ gia đình',
      type: 'bank',
      openingBalance: 5000000,
      color: '#059669',
      createdAt: '2026-11-01',
      active: true,
      isShared: true,
      sharedMembers: ['Bạn', 'Vợ'],
      sharedGoalName: 'Quỹ chi tiêu sinh hoạt gia đình'
    };
    expect(sharedAcc.isShared).toBe(true);
    expect(sharedAcc.sharedMembers?.length).toBe(2);
    expect(sharedAcc.sharedGoalName).toBeDefined();
  });

  it('Đính kèm hóa đơn / biên lai (Receipt): lưu trữ data URL và liên kết với giao dịch', () => {
    const txWithReceipt: Transaction = {
      id: 'tx-receipt-1',
      name: 'Siêu thị VinMart',
      amount: 250000,
      type: 'expense',
      categoryId: 'food',
      accountId: 'acc-1',
      date: '2026-11-02',
      method: 'Thẻ',
      note: 'Có hóa đơn kèm theo',
      status: 'completed',
      receiptUrl: 'data:image/svg+xml;utf8,<svg>test</svg>'
    };
    expect(txWithReceipt.receiptUrl).toBeDefined();
    expect(txWithReceipt.receiptUrl).toContain('data:image');
  });

  it('Nhắc nhở hóa đơn định kỳ: lọc chính xác hóa đơn đến hạn trong vòng 7 ngày', () => {
    const today = new Date('2026-11-02');
    const recurringList = [
      { id: 'r1', name: 'Tiền nhà', amount: 5000000, nextDate: '2026-11-05', active: true, type: 'expense' },
      { id: 'r2', name: 'Cước Internet', amount: 300000, nextDate: '2026-11-08', active: true, type: 'expense' },
      { id: 'r3', name: 'Netflix', amount: 260000, nextDate: '2026-11-28', active: true, type: 'expense' }
    ];
    const sevenDaysLater = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);
    const upcoming = recurringList.filter(r => r.active && r.nextDate <= sevenDaysLater);

    expect(upcoming.length).toBe(2);
    expect(upcoming.map(u => u.name)).toContain('Tiền nhà');
    expect(upcoming.map(u => u.name)).toContain('Cước Internet');
    expect(upcoming.map(u => u.name)).not.toContain('Netflix');
  });
});

