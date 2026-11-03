import { z } from 'zod';
import { useFinance } from '../store';
import { totals, uid, todayKey, netWorth } from './finance';
import { parseVietnameseCommand } from './nlpParser';
import { createReconciliationTransaction, updateStreak } from './habit';
import {
  calculateTrueSpendableBalance,
  analyzeFinancialRisks,
  calculateInvestmentSummary,
  calculateFinancialFreedom,
  MARKET_PRICES
} from './riskAndInsightEngine';
import type { Transaction, InvestmentAsset, Debt } from '../types';

export type WebMCPTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => Promise<unknown>;
};

declare global {
  interface Document {
    modelContext?: {
      registerTool: (tool: WebMCPTool, options?: { signal?: AbortSignal }) => void | Promise<void>;
    };
  }
}

const transactionInput = z.object({
  name: z.string().trim().min(2),
  amount: z.number().int().positive(),
  type: z.enum(['income', 'expense', 'transfer']),
  categoryId: z.string().optional(),
  accountId: z.string(),
  toAccountId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().optional()
});

const smartCommandInput = z.object({
  command: z.string().trim().min(3)
});

const investmentInput = z.object({
  symbol: z.string().trim().min(1),
  name: z.string().trim().optional(),
  assetClass: z.enum(['stock', 'gold', 'crypto', 'savings', 'real_estate']),
  quantity: z.number().positive(),
  totalCostBasis: z.number().int().positive(),
  currentUnitPrice: z.number().int().positive().optional(),
  annualYieldRate: z.number().optional()
});

export function registerFinanceTools() {
  const context = document.modelContext;
  const registeredList: WebMCPTool[] = [];
  const controller = new AbortController();

  const register = (tool: WebMCPTool) => {
    registeredList.push(tool);
    if (context?.registerTool) {
      try {
        void Promise.resolve(context.registerTool(tool, { signal: controller.signal })).catch(() => {});
      } catch {
        /* unsupported browser */
      }
    }
  };

  // Tool 1: get_finance_summary
  register({
    name: 'get_finance_summary',
    title: 'Get Complete Finance Summary',
    description: 'Returns complete financial health summary: income, expense, true spendable balance, burn-rate exhaustion, risk count, passive income ratio, and investment PnL.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: async () => {
      const data = useFinance.getState().data;
      if (!data) throw new Error('Dữ liệu chưa sẵn sàng');

      const tot = totals(data.transactions);
      const trueSpendable = calculateTrueSpendableBalance(data);
      const risks = analyzeFinancialRisks(data);
      const invSummary = calculateInvestmentSummary(data.investments || []);
      const freedom = calculateFinancialFreedom(data);
      const currentNetWorth = netWorth(data);

      return {
        income: tot.income,
        expense: tot.expense,
        netWorth: currentNetWorth,
        trueSpendableBalance: trueSpendable.trueBalance,
        dailySafeToSpend: trueSpendable.dailySafeToSpend,
        burnRateDaysLeft: trueSpendable.burnRateDaysLeft,
        burnRateExhaustionDate: trueSpendable.burnRateExhaustionDate,
        riskAlertsCount: risks.length,
        criticalRisksCount: risks.filter(r => r.level === 'critical').length,
        passiveIncomeRatio: freedom.freedomRatio,
        freedomRunwayMonths: freedom.freedomRunwayMonths,
        totalInvestmentCurrentValue: invSummary.totalCurrentValue,
        totalInvestmentPnL: invSummary.totalPnL,
        totalInvestmentPnLPercent: invSummary.totalPnLPercent,
        accountCount: data.accounts.length
      };
    }
  });

  // Tool 2: create_transaction
  register({
    name: 'create_transaction',
    title: 'Create Transaction',
    description: 'Create an income, expense, or transfer transaction in Finora and update the live dashboard.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Transaction description' },
        amount: { type: 'integer', minimum: 1, description: 'Amount in VND' },
        type: { type: 'string', enum: ['income', 'expense', 'transfer'] },
        categoryId: { type: 'string', description: 'Target category ID' },
        accountId: { type: 'string', description: 'Source account ID' },
        toAccountId: { type: 'string', description: 'Destination account ID (for transfer)' },
        date: { type: 'string', format: 'date' },
        note: { type: 'string' }
      },
      required: ['name', 'amount', 'type', 'accountId', 'date'],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: async raw => {
      const values = transactionInput.parse(raw);
      const state = useFinance.getState();
      const data = state.data;
      if (!data) throw new Error('Dữ liệu chưa sẵn sàng');

      if (!data.accounts.some(a => a.id === values.accountId && a.active)) {
        throw new Error('Tài khoản nguồn không hợp lệ hoặc đã bị khóa');
      }

      const tx: Transaction = {
        id: uid(),
        name: values.name,
        amount: values.amount,
        type: values.type,
        categoryId: values.categoryId || (values.type === 'income' ? 'salary' : 'other'),
        accountId: values.accountId,
        toAccountId: values.toAccountId,
        date: values.date,
        method: 'WebMCP Tool',
        note: values.note || 'Tạo tự động qua WebMCP',
        status: 'completed'
      };

      const streakResult = updateStreak(data.user, values.date);

      await state.update(d => ({
        ...d,
        transactions: [tx, ...d.transactions],
        user: {
          ...d.user,
          streakCount: streakResult.streakCount,
          lastCheckInDate: streakResult.lastCheckInDate
        }
      }), `WebMCP: Đã tạo giao dịch "${tx.name}"`);

      return { id: tx.id, status: 'completed', transaction: tx };
    }
  });

  // Tool 3: smart_command_execute
  register({
    name: 'smart_command_execute',
    title: 'Smart Multi-Intent Command Execution',
    description: 'Parses and executes any natural Vietnamese financial intent: expense/income ("ăn trưa 45k"), investment ("mua 100 cổ FPT 13tr"), credit installments ("quẹt thẻ VCB 12tr góp 6T"), split bill ("ăn lẩu 1.2tr chia 4"), reconcile ("số dư ví 350k"), or business bundle.',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Natural Vietnamese sentence describing the action' }
      },
      required: ['command'],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: async raw => {
      const { command } = smartCommandInput.parse(raw);
      const state = useFinance.getState();
      const data = state.data;
      if (!data) throw new Error('Dữ liệu chưa sẵn sàng');

      const parsed = parseVietnameseCommand(command, data.categories, data.accounts, data.user.defaultAccountId);
      if (!parsed) {
        throw new Error('Không thể phân tích ý định từ câu lệnh');
      }

      const today = todayKey();
      const streakResult = updateStreak(data.user, today);

      // Execute based on intent
      if (parsed.intent === 'reconcile' && parsed.reconcile) {
        const { accountId, actualBalance } = parsed.reconcile;
        const account = data.accounts.find(a => a.id === accountId);
        if (!account) throw new Error('Không tìm thấy tài khoản');
        const rec = createReconciliationTransaction(account, actualBalance, data.transactions, data.categories);
        if (rec) {
          await state.update(d => ({
            ...d,
            transactions: [rec.transaction, ...d.transactions]
          }), `WebMCP: Cân bằng số dư "${account.name}"`);
        }
        return { intent: 'reconcile', account: account.name, newBalance: actualBalance };
      }

      if (parsed.intent === 'split_bill' && parsed.splitBill) {
        const { name, totalAmount, personalShare, othersShare, accountId, categoryId } = parsed.splitBill;
        const personalTx: Transaction = {
          id: uid(),
          name: `${name} (Phần cá nhân)`,
          amount: personalShare,
          type: 'expense',
          categoryId,
          accountId,
          date: today,
          method: 'WebMCP Split Bill',
          note: `Tổng hóa đơn ${totalAmount}, chia ${parsed.splitBill.peopleCount} người`,
          status: 'completed'
        };
        const loanTx: Transaction = {
          id: uid(),
          name: `Tạm ứng chia tiền: ${name}`,
          amount: othersShare,
          type: 'expense',
          categoryId: 'other',
          accountId,
          date: today,
          method: 'WebMCP Split Bill',
          note: `Phần bạn bè: ${othersShare}`,
          status: 'completed'
        };
        const newDebt: Debt = {
          id: uid(),
          name: `Khoản nợ chia tiền: ${name}`,
          kind: 'lent',
          principal: othersShare,
          startDate: today,
          dueDate: today,
          payments: []
        };
        await state.update(d => ({
          ...d,
          transactions: [personalTx, loanTx, ...d.transactions],
          debts: [newDebt, ...d.debts]
        }), `WebMCP: Đã chia tiền "${name}"`);
        return { intent: 'split_bill', personalShare, othersShare, debtId: newDebt.id };
      }

      if (parsed.intent === 'investment' && parsed.investment) {
        const inv = parsed.investment;
        const newAsset: InvestmentAsset = {
          id: uid(),
          symbol: inv.symbol,
          name: inv.name,
          assetClass: inv.assetClass,
          quantity: inv.quantity,
          totalCostBasis: inv.totalCostBasis,
          currentUnitPrice: inv.currentUnitPrice,
          accountId: inv.accountId,
          updatedAt: today
        };
        const investTx: Transaction = {
          id: uid(),
          name: `Đầu tư: ${inv.quantity} ${inv.symbol}`,
          amount: inv.totalCostBasis,
          type: 'expense',
          categoryId: 'invest',
          accountId: inv.accountId,
          date: today,
          method: 'WebMCP Đầu tư',
          note: `Mua ${inv.quantity} ${inv.symbol}`,
          status: 'completed'
        };
        await state.update(d => {
          const list = d.investments || [];
          const idx = list.findIndex(a => a.symbol.toUpperCase() === inv.symbol.toUpperCase());
          let nextInv: InvestmentAsset[];
          if (idx >= 0) {
            nextInv = list.map((a, i) =>
              i === idx
                ? { ...a, quantity: a.quantity + inv.quantity, totalCostBasis: a.totalCostBasis + inv.totalCostBasis, updatedAt: today }
                : a
            );
          } else {
            nextInv = [newAsset, ...list];
          }
          return {
            ...d,
            investments: nextInv,
            transactions: [investTx, ...d.transactions]
          };
        }, `WebMCP: Đầu tư ${inv.quantity} ${inv.symbol}`);
        return { intent: 'investment', symbol: inv.symbol, quantity: inv.quantity, cost: inv.totalCostBasis };
      }

      if (parsed.transaction) {
        const t = parsed.transaction;
        const newTx: Transaction = {
          id: uid(),
          name: t.name,
          amount: t.amount,
          type: t.type,
          categoryId: t.categoryId,
          accountId: t.accountId,
          date: t.date,
          method: 'WebMCP Smart Command',
          note: parsed.raw,
          status: 'completed'
        };
        await state.update(d => ({
          ...d,
          transactions: [newTx, ...d.transactions],
          user: {
            ...d.user,
            streakCount: streakResult.streakCount,
            lastCheckInDate: streakResult.lastCheckInDate
          }
        }), `WebMCP: Thêm ${newTx.name}`);
        return { intent: 'transaction', transaction: newTx, explanation: parsed.explanation };
      }

      return { intent: parsed.intent, explanation: parsed.explanation };
    }
  });

  // Tool 4: add_or_update_investment
  register({
    name: 'add_or_update_investment',
    title: 'Add or Update Investment Asset',
    description: 'Add a stock, gold, crypto, or savings asset to user portfolio with ticker/symbol, quantity, and cost basis.',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Ticker symbol e.g. FPT, SJC, BTC' },
        name: { type: 'string', description: 'Display name' },
        assetClass: { type: 'string', enum: ['stock', 'gold', 'crypto', 'savings', 'real_estate'] },
        quantity: { type: 'number', minimum: 0.000001 },
        totalCostBasis: { type: 'integer', minimum: 1 },
        currentUnitPrice: { type: 'integer' },
        annualYieldRate: { type: 'number' }
      },
      required: ['symbol', 'assetClass', 'quantity', 'totalCostBasis'],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: async raw => {
      const values = investmentInput.parse(raw);
      const state = useFinance.getState();
      const data = state.data;
      if (!data) throw new Error('Dữ liệu chưa sẵn sàng');

      const today = todayKey();
      const unitPrice =
        values.currentUnitPrice ||
        MARKET_PRICES[values.symbol.toUpperCase()] ||
        Math.round(values.totalCostBasis / values.quantity);

      const newAsset: InvestmentAsset = {
        id: uid(),
        symbol: values.symbol.toUpperCase(),
        name: values.name || values.symbol.toUpperCase(),
        assetClass: values.assetClass,
        quantity: values.quantity,
        totalCostBasis: values.totalCostBasis,
        currentUnitPrice: unitPrice,
        annualYieldRate: values.annualYieldRate,
        updatedAt: today
      };

      await state.update(d => {
        const list = d.investments || [];
        const idx = list.findIndex(a => a.symbol.toUpperCase() === values.symbol.toUpperCase());
        let next: InvestmentAsset[];
        if (idx >= 0) {
          next = list.map((a, i) =>
            i === idx
              ? {
                  ...a,
                  quantity: a.quantity + values.quantity,
                  totalCostBasis: a.totalCostBasis + values.totalCostBasis,
                  currentUnitPrice: unitPrice,
                  updatedAt: today
                }
              : a
          );
        } else {
          next = [newAsset, ...list];
        }
        return { ...d, investments: next };
      }, `WebMCP: Đã cập nhật tài sản đầu tư ${newAsset.symbol}`);

      return { status: 'success', asset: newAsset };
    }
  });

  // Tool 5: analyze_financial_risks
  register({
    name: 'analyze_financial_risks',
    title: 'Analyze Financial Risks & Rebalance',
    description: 'Scans the entire finance system for credit card due risks, liquidity shortages, overspent budgets, and returns smart rebalancing recommendations.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: async () => {
      const data = useFinance.getState().data;
      if (!data) throw new Error('Dữ liệu chưa sẵn sàng');

      const alerts = analyzeFinancialRisks(data);
      const trueSpendable = calculateTrueSpendableBalance(data);

      return {
        healthStatus: trueSpendable.status,
        burnRateDaysLeft: trueSpendable.burnRateDaysLeft,
        burnRateExhaustionDate: trueSpendable.burnRateExhaustionDate,
        risksCount: alerts.length,
        alerts: alerts.map(a => ({
          level: a.level,
          title: a.title,
          description: a.description,
          actionType: a.actionType,
          rebalanceData: a.rebalanceData
        }))
      };
    }
  });

  return () => {
    controller.abort();
  };
}
