import { z } from 'zod';
import { useFinance } from '../store';
import { totals, uid, todayKey } from './finance';
import { parseVietnameseTransaction } from './nlpParser';
import { createReconciliationTransaction, updateStreak } from './habit';
import type { Transaction } from '../types';

type Tool = {
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
      registerTool: (tool: Tool, options?: { signal?: AbortSignal }) => void | Promise<void>;
    };
  }
}

const transactionInput = z.object({
  name: z.string().trim().min(2),
  amount: z.number().int().positive(),
  type: z.enum(['income', 'expense']),
  categoryId: z.string(),
  accountId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().optional()
});

const reconcileInput = z.object({
  accountId: z.string(),
  actualBalance: z.number().int().nonnegative(),
  note: z.string().optional()
});

const quickParseInput = z.object({
  text: z.string().trim().min(3)
});

export function registerFinanceTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return () => {};

  const controller = new AbortController();
  const register = (tool: Tool) => {
    try {
      void Promise.resolve(context.registerTool(tool, { signal: controller.signal })).catch(() => {});
    } catch {
      /* unsupported browser */
    }
  };

  // Tool 1: get_finance_summary
  register({
    name: 'get_finance_summary',
    title: 'Read finance summary',
    description: 'Read the current completed income, expenses and account count from the visible Finora demo.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: async () => {
      const data = useFinance.getState().data;
      if (!data) throw new Error('Dữ liệu chưa sẵn sàng');
      return { ...totals(data.transactions), accountCount: data.accounts.length };
    }
  });

  // Tool 2: create_transaction
  register({
    name: 'create_transaction',
    title: 'Create transaction',
    description: 'Create an income or expense transaction in the Finora demo and update the visible dashboard.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        amount: { type: 'integer', minimum: 1 },
        type: { type: 'string', enum: ['income', 'expense'] },
        categoryId: { type: 'string' },
        accountId: { type: 'string' },
        date: { type: 'string', format: 'date' },
        note: { type: 'string' }
      },
      required: ['name', 'amount', 'type', 'categoryId', 'accountId', 'date'],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: async raw => {
      const values = transactionInput.parse(raw);
      const state = useFinance.getState();
      const data = state.data;
      if (!data) throw new Error('Dữ liệu chưa sẵn sàng');
      if (!data.accounts.some(a => a.id === values.accountId && a.active)) {
        throw new Error('Tài khoản không hợp lệ');
      }
      if (!data.categories.some(c => c.id === values.categoryId && c.type === values.type && !c.hidden)) {
        throw new Error('Danh mục không hợp lệ');
      }

      const tx: Transaction = {
        id: uid(),
        name: values.name,
        amount: values.amount,
        type: values.type,
        categoryId: values.categoryId,
        accountId: values.accountId,
        date: values.date,
        method: 'WebMCP',
        note: values.note || '',
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
      }));

      return { id: tx.id, status: 'completed' };
    }
  });

  // Tool 3: reconcile_account_balance
  register({
    name: 'reconcile_account_balance',
    title: 'Reconcile account balance',
    description: 'Adjust and reconcile an account balance to match actual bank/cash balance in 1-click.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'ID of the account to reconcile' },
        actualBalance: { type: 'integer', minimum: 0, description: 'Actual balance in bank/wallet' },
        note: { type: 'string', description: 'Optional explanation note' }
      },
      required: ['accountId', 'actualBalance'],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: async raw => {
      const values = reconcileInput.parse(raw);
      const state = useFinance.getState();
      const data = state.data;
      if (!data) throw new Error('Dữ liệu chưa sẵn sàng');

      const account = data.accounts.find(a => a.id === values.accountId);
      if (!account) throw new Error('Không tìm thấy tài khoản');

      const result = createReconciliationTransaction(
        account,
        values.actualBalance,
        data.transactions,
        data.categories
      );

      if (!result) {
        return { reconciled: true, difference: 0, message: 'Số dư thực tế đã khớp hoàn hảo' };
      }

      if (values.note) {
        result.transaction.note += ` (${values.note})`;
      }

      await state.update(d => ({
        ...d,
        transactions: [result.transaction, ...d.transactions]
      }));

      return {
        reconciled: true,
        difference: result.difference,
        adjustmentTransactionId: result.transaction.id,
        newBalance: values.actualBalance
      };
    }
  });

  // Tool 4: quick_parse_transaction
  register({
    name: 'quick_parse_transaction',
    title: 'Quick Parse Natural Language Transaction',
    description: 'Parse natural Vietnamese text (e.g. "ăn trưa 45k", "đổ xăng 70k ví momo") and create the transaction.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Natural Vietnamese sentence describing transaction' }
      },
      required: ['text'],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: async raw => {
      const values = quickParseInput.parse(raw);
      const state = useFinance.getState();
      const data = state.data;
      if (!data) throw new Error('Dữ liệu chưa sẵn sàng');

      const parsed = parseVietnameseTransaction(
        values.text,
        data.categories,
        data.accounts,
        data.user.defaultAccountId
      );

      if (!parsed) {
        throw new Error('Không thể nhận diện số tiền từ câu nhập vào');
      }

      const tx: Transaction = {
        id: uid(),
        name: parsed.name,
        amount: parsed.amount,
        type: parsed.type,
        categoryId: parsed.categoryId,
        accountId: parsed.accountId,
        date: parsed.date,
        method: 'WebMCP NLP',
        note: 'Tạo tự động qua WebMCP: ' + values.text,
        status: 'completed'
      };

      const streakResult = updateStreak(data.user, todayKey());

      await state.update(d => ({
        ...d,
        transactions: [tx, ...d.transactions],
        user: {
          ...d.user,
          streakCount: streakResult.streakCount,
          lastCheckInDate: streakResult.lastCheckInDate
        }
      }));

      return {
        id: tx.id,
        name: tx.name,
        amount: tx.amount,
        type: tx.type,
        categoryId: tx.categoryId,
        accountId: tx.accountId,
        explanation: parsed.explanation
      };
    }
  });

  return () => controller.abort();
}
