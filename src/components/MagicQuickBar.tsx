import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Chip,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Switch,
  FormControlLabel,
  Slider
} from '@mui/material';
import {
  Sparkles,
  CornerDownLeft,
  Plus,
  Trash2,
  Zap,
  TrendingUp,
  CreditCard,
  Users,
  Scale,
  Briefcase,
  Landmark
} from 'lucide-react';
import { useFinance } from '../store';
import { parseVietnameseCommand, type ParsedCommand } from '../lib/nlpParser';
import { updateStreak, createReconciliationTransaction } from '../lib/habit';
import { checkNlpUsage, canAddQuickTemplate, isProUser } from '../lib/subscription';
import { uid, todayKey, money } from '../lib/finance';
import type { QuickTemplate, Transaction, InvestmentAsset, Debt } from '../types';
import { MuiCurrencyInput, MuiSelect, MuiTextField } from './mui/MuiInputs';
import { BankSmsModal } from './BankSmsModal';

export function MagicQuickBar({
  onOpenPricing
}: {
  onOpenPricing: (feature?: string) => void;
}) {
  const { data, update, notify } = useFinance();
  const [text, setText] = useState('');
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [bankSmsModalOpen, setBankSmsModalOpen] = useState(false);
  const [newTpl, setNewTpl] = useState({
    label: '',
    name: '',
    amount: '30000',
    categoryId: 'food',
    isBusinessBundle: false,
    costRatio: 60
  });
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Ctrl + K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!data) return null;

  const nlpQuota = checkNlpUsage(data);
  const commandResult: ParsedCommand | null = text.trim()
    ? parseVietnameseCommand(text, data.categories, data.accounts, data.user.defaultAccountId)
    : null;

  // Handle Multi-Intent Submission (Enter key)
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;

    if (!nlpQuota.allowed) {
      onOpenPricing('Bạn đã dùng hết 5 lượt nhập nhanh AI hôm nay. Nâng cấp Pro để dùng không giới hạn!');
      return;
    }

    if (!commandResult) {
      notify('Chưa nhận diện được lệnh. Thử: "ăn trưa 45k", "mua 100 cổ FPT 13tr", "ăn lẩu 1200k chia 4 người"');
      return;
    }

    const today = todayKey();
    const streakResult = updateStreak(data.user, today);
    const currentCount =
      data.user.nlpUsageToday?.date === today
        ? data.user.nlpUsageToday.count + 1
        : 1;

    // 1. RECONCILE INTENT
    if (commandResult.intent === 'reconcile' && commandResult.reconcile) {
      const { accountId, actualBalance } = commandResult.reconcile;
      const account = data.accounts.find(a => a.id === accountId);
      if (!account) {
        notify('Không tìm thấy tài khoản cần cân bằng');
        return;
      }
      const recResult = createReconciliationTransaction(account, actualBalance, data.transactions, data.categories);
      if (!recResult) {
        notify(`Số dư "${account.name}" đã khớp chính xác với ${money(actualBalance)}`);
        setText('');
        return;
      }

      await update(
        d => ({
          ...d,
          transactions: [recResult.transaction, ...d.transactions],
          user: {
            ...d.user,
            streakCount: streakResult.streakCount,
            lastCheckInDate: streakResult.lastCheckInDate,
            nlpUsageToday: { date: today, count: currentCount }
          }
        }),
        `Đã cân bằng số dư "${account.name}" về ${money(actualBalance)}`
      );
      setText('');
      return;
    }

    // 2. SPLIT BILL INTENT
    if (commandResult.intent === 'split_bill' && commandResult.splitBill) {
      const { name, totalAmount, personalShare, othersShare, accountId, categoryId } = commandResult.splitBill;

      // Expense for personal share
      const personalTx: Transaction = {
        id: uid(),
        name: `${name} (Phần cá nhân)`,
        amount: personalShare,
        type: 'expense',
        categoryId,
        accountId,
        date: today,
        method: 'Chia tiền nhóm',
        note: `Tổng hóa đơn ${money(totalAmount)}, chia cho ${commandResult.splitBill.peopleCount} người`,
        status: 'completed'
      };

      // Debt for others' share
      const newDebt: Debt = {
        id: uid(),
        name: `Khoản nợ chia tiền: ${name}`,
        kind: 'lent',
        principal: othersShare,
        startDate: today,
        dueDate: today,
        payments: []
      };

      // Transaction deduction for others' share so account balance drops by full amount
      const loanTx: Transaction = {
        id: uid(),
        name: `Tạm ứng chia tiền: ${name}`,
        amount: othersShare,
        type: 'expense',
        categoryId: 'other',
        accountId,
        date: today,
        method: 'Tạm ứng bạn bè',
        note: `Phần bạn bè cần trả lại: ${money(othersShare)}`,
        status: 'completed'
      };

      await update(
        d => ({
          ...d,
          transactions: [personalTx, loanTx, ...d.transactions],
          debts: [newDebt, ...d.debts],
          user: {
            ...d.user,
            streakCount: streakResult.streakCount,
            lastCheckInDate: streakResult.lastCheckInDate,
            nlpUsageToday: { date: today, count: currentCount }
          }
        }),
        `Đã chia tiền "${name}": cá nhân ${money(personalShare)}, đã đẩy ${money(othersShare)} vào Sổ nợ`
      );
      setText('');
      return;
    }

    // 3. CREDIT INSTALLMENT INTENT
    if (commandResult.intent === 'credit_installment' && commandResult.creditInstallment) {
      const { item, totalAmount, installments, monthlyAmount, accountId } = commandResult.creditInstallment;

      const chargeTx: Transaction = {
        id: uid(),
        name: `Quẹt thẻ: ${item} (Trả góp ${installments}T)`,
        amount: totalAmount,
        type: 'expense',
        categoryId: 'shopping',
        accountId,
        date: today,
        method: 'Thẻ tín dụng',
        note: `Trả góp ${installments} tháng (${money(monthlyAmount)}/tháng)`,
        status: 'completed'
      };

      const debtInstallment: Debt = {
        id: uid(),
        name: `Trả góp: ${item}`,
        kind: 'owed',
        principal: totalAmount,
        startDate: today,
        dueDate: today,
        payments: []
      };

      await update(
        d => ({
          ...d,
          transactions: [chargeTx, ...d.transactions],
          debts: [debtInstallment, ...d.debts],
          user: {
            ...d.user,
            streakCount: streakResult.streakCount,
            lastCheckInDate: streakResult.lastCheckInDate,
            nlpUsageToday: { date: today, count: currentCount }
          }
        }),
        `Đã ghi nhận quẹt thẻ trả góp "${item}" (${money(totalAmount)})`
      );
      setText('');
      return;
    }

    // 4. INVESTMENT INTENT
    if (commandResult.intent === 'investment' && commandResult.investment) {
      const inv = commandResult.investment;

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

      // Create transaction for investment deduction
      const investTx: Transaction = {
        id: uid(),
        name: `Đầu tư: ${inv.quantity} ${inv.symbol}`,
        amount: inv.totalCostBasis,
        type: 'expense',
        categoryId: 'invest',
        accountId: inv.accountId,
        date: today,
        method: 'Đầu tư tài sản',
        note: `Mua ${inv.quantity} ${inv.symbol} (${inv.name})`,
        status: 'completed'
      };

      await update(
        d => {
          const existingList = d.investments || [];
          const existingIdx = existingList.findIndex(a => a.symbol.toUpperCase() === inv.symbol.toUpperCase());
          let nextInvestments: InvestmentAsset[];

          if (existingIdx >= 0) {
            const old = existingList[existingIdx];
            const updated: InvestmentAsset = {
              ...old,
              quantity: old.quantity + inv.quantity,
              totalCostBasis: old.totalCostBasis + inv.totalCostBasis,
              currentUnitPrice: inv.currentUnitPrice,
              updatedAt: today
            };
            nextInvestments = existingList.map((a, i) => (i === existingIdx ? updated : a));
          } else {
            nextInvestments = [newAsset, ...existingList];
          }

          return {
            ...d,
            investments: nextInvestments,
            transactions: [investTx, ...d.transactions],
            user: {
              ...d.user,
              streakCount: streakResult.streakCount,
              lastCheckInDate: streakResult.lastCheckInDate,
              nlpUsageToday: { date: today, count: currentCount }
            }
          };
        },
        `Đã thêm tài sản đầu tư: ${inv.quantity} ${inv.symbol} (${money(inv.totalCostBasis)})`
      );
      setText('');
      return;
    }

    // 5. BUSINESS BUNDLE INTENT
    if (commandResult.intent === 'business_bundle' && commandResult.businessBundle) {
      const { revenue, cost, costRatio, revenueCategoryId, costCategoryId, accountId } = commandResult.businessBundle;

      const incTx: Transaction = {
        id: uid(),
        name: 'Doanh thu bán hàng / Dòng tiền',
        amount: revenue,
        type: 'income',
        categoryId: revenueCategoryId,
        accountId,
        date: today,
        method: 'Kinh doanh',
        note: `Doanh thu kinh doanh (Trích ${costRatio * 100}% giá vốn)`,
        status: 'completed',
        incomeSourceType: 'business'
      };

      const expTx: Transaction = {
        id: uid(),
        name: 'Chi phí giá vốn & vận hành',
        amount: cost,
        type: 'expense',
        categoryId: costCategoryId,
        accountId,
        date: today,
        method: 'Giá vốn kinh doanh',
        note: `Tự động trích ${costRatio * 100}% từ doanh thu`,
        status: 'completed'
      };

      await update(
        d => ({
          ...d,
          transactions: [incTx, expTx, ...d.transactions],
          user: {
            ...d.user,
            streakCount: streakResult.streakCount,
            lastCheckInDate: streakResult.lastCheckInDate,
            nlpUsageToday: { date: today, count: currentCount }
          }
        }),
        `Đã ghi nhận Doanh thu ${money(revenue)} & trích Chi phí ${money(cost)}`
      );
      setText('');
      return;
    }

    // 6. STANDARD TRANSACTION INTENT
    if (commandResult.transaction) {
      const tx = commandResult.transaction;
      const newTx: Transaction = {
        id: uid(),
        name: tx.name,
        amount: tx.amount,
        type: tx.type,
        categoryId: tx.categoryId,
        accountId: tx.accountId,
        date: tx.date,
        method: 'AI Command Bar',
        note: 'Nhập nhanh: ' + commandResult.raw,
        status: 'completed'
      };

      await update(
        d => ({
          ...d,
          transactions: [newTx, ...d.transactions],
          user: {
            ...d.user,
            streakCount: streakResult.streakCount,
            lastCheckInDate: streakResult.lastCheckInDate,
            nlpUsageToday: { date: today, count: currentCount }
          }
        }),
        `Đã thêm "${newTx.name}" (${money(newTx.amount)})`
      );
      setText('');
      return;
    }
  };

  const handleQuickChipClick = async (tpl: QuickTemplate) => {
    const targetAccountId =
      tpl.accountId || data.user.defaultAccountId || data.accounts[0]?.id || 'wallet';
    const today = todayKey();

    // If template is Business Bundle, record both Income and Cost
    if (tpl.isBusinessBundle && tpl.type === 'income') {
      const revenue = tpl.amount;
      const ratio = tpl.costRatio || 0.6;
      const cost = Math.round(revenue * ratio);

      const incTx: Transaction = {
        id: uid(),
        name: tpl.name,
        amount: revenue,
        type: 'income',
        categoryId: tpl.categoryId || 'freelance',
        accountId: targetAccountId,
        date: today,
        method: '1-Chạm Kinh Doanh',
        note: `Doanh thu kinh doanh (Trích ${ratio * 100}% giá vốn)`,
        status: 'completed',
        incomeSourceType: 'business'
      };

      const expTx: Transaction = {
        id: uid(),
        name: `Chi phí vốn (${tpl.name})`,
        amount: cost,
        type: 'expense',
        categoryId: 'bills',
        accountId: targetAccountId,
        date: today,
        method: 'Giá vốn kinh doanh',
        note: `Tự động trích ${ratio * 100}% từ doanh thu`,
        status: 'completed'
      };

      const streakResult = updateStreak(data.user, today);
      await update(
        d => ({
          ...d,
          transactions: [incTx, expTx, ...d.transactions],
          user: {
            ...d.user,
            streakCount: streakResult.streakCount,
            lastCheckInDate: streakResult.lastCheckInDate
          }
        }),
        `Đã ghi nhận: +${money(revenue)} Doanh thu & -${money(cost)} Chi phí vốn`
      );
      return;
    }

    // Standard One-Tap Chip
    const newTx: Transaction = {
      id: uid(),
      name: tpl.name,
      amount: tpl.amount,
      type: tpl.type,
      categoryId: tpl.categoryId,
      accountId: targetAccountId,
      date: today,
      method: '1-Chạm (Quick Chip)',
      note: 'Ghi nhận nhanh qua mẫu ' + tpl.label,
      status: 'completed'
    };

    const streakResult = updateStreak(data.user, today);

    await update(
      d => ({
        ...d,
        transactions: [newTx, ...d.transactions],
        user: {
          ...d.user,
          streakCount: streakResult.streakCount,
          lastCheckInDate: streakResult.lastCheckInDate
        }
      }),
      `Đã ghi nhận: ${tpl.name} (${money(tpl.amount)})`
    );
  };

  const handleSaveTemplate = async () => {
    if (!newTpl.name.trim() || Number(newTpl.amount) <= 0) return;

    if (!canAddQuickTemplate(data)) {
      setTemplateModalOpen(false);
      onOpenPricing('Gói Free hỗ trợ tối đa 3 mẫu 1-Chạm. Nâng cấp Pro để tạo không giới hạn!');
      return;
    }

    const tpl: QuickTemplate = {
      id: uid(),
      label: newTpl.label.trim() || newTpl.name.trim(),
      name: newTpl.name.trim(),
      amount: Number(newTpl.amount),
      type: newTpl.isBusinessBundle ? 'income' : 'expense',
      categoryId: newTpl.categoryId,
      accountId: data.user.defaultAccountId || data.accounts[0]?.id,
      isBusinessBundle: newTpl.isBusinessBundle,
      costRatio: newTpl.isBusinessBundle ? newTpl.costRatio / 100 : undefined
    };

    await update(d => ({
      ...d,
      quickTemplates: [...(d.quickTemplates || []), tpl]
    }));

    setTemplateModalOpen(false);
    setNewTpl({ label: '', name: '', amount: '30000', categoryId: 'food', isBusinessBundle: false, costRatio: 60 });
    notify('Đã thêm mẫu chi tiêu 1-chạm mới');
  };

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await update(d => ({
      ...d,
      quickTemplates: (d.quickTemplates || []).filter(t => t.id !== id)
    }));
    notify('Đã xóa mẫu chi tiêu');
  };

  const templates = data.quickTemplates || [];

  const getIntentIcon = (intent: string) => {
    switch (intent) {
      case 'investment':
        return <TrendingUp size={14} color="#10b981" />;
      case 'credit_installment':
        return <CreditCard size={14} color="#f59e0b" />;
      case 'split_bill':
        return <Users size={14} color="#0284c7" />;
      case 'reconcile':
        return <Scale size={14} color="#06b6d4" />;
      case 'business_bundle':
        return <Briefcase size={14} color="#3b82f6" />;
      default:
        return <Zap size={14} color="#10b981" />;
    }
  };

  return (
    <Box sx={{ mb: 2.5 }}>
      {/* 1. Main Clean Spotlight Command Input */}
      <Paper
        elevation={0}
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: { xs: '6px 10px', sm: '8px 14px' },
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1, sm: 1.5 },
          borderRadius: 3,
          border: '1.5px solid',
          borderColor: commandResult ? 'primary.main' : 'var(--border-subtle)',
          bgcolor: 'var(--bg-surface)',
          boxShadow: '0 2px 8px rgba(18, 61, 53, 0.04)',
          transition: 'all 0.15s ease',
          '&:focus-within': {
            borderColor: 'primary.main',
            boxShadow: '0 0 0 3px rgba(32, 112, 91, 0.12)'
          }
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 2,
            bgcolor: commandResult ? 'rgba(32, 112, 91, 0.1)' : 'var(--bg-subtle)',
            color: 'primary.main',
            flexShrink: 0
          }}
        >
          {commandResult ? getIntentIcon(commandResult.intent) : <Sparkles size={16} />}
        </Box>

        <TextField
          fullWidth
          variant="standard"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder='Nhập lệnh nhanh hoặc dán SMS (VD: "ăn sáng 35k", "lương 25tr", "quẹt VCB 12tr"...)'
          inputRef={inputRef}
          slotProps={{
            input: {
              disableUnderline: true,
              sx: {
                fontSize: { xs: 13, sm: 14 },
                fontWeight: 500,
                color: 'var(--text-primary)',
                fontFamily: 'inherit'
              }
            }
          }}
        />

        {/* Quick SMS Trigger Button */}
        <Tooltip title="Dán tin nhắn SMS/OTT biến động số dư ngân hàng">
          <IconButton
            size="small"
            onClick={() => setBankSmsModalOpen(true)}
            sx={{
              bgcolor: 'rgba(21, 150, 107, 0.1)',
              color: '#15966B',
              width: 32,
              height: 32,
              borderRadius: 2,
              flexShrink: 0,
              '&:hover': {
                bgcolor: 'rgba(21, 150, 107, 0.2)'
              }
            }}
          >
            <Landmark size={15} />
          </IconButton>
        </Tooltip>

        {!isProUser(data) && (
          <Tooltip title="Lượt nhập AI hôm nay">
            <Chip
              label={`AI: ${nlpQuota.remaining}/5`}
              size="small"
              color={nlpQuota.remaining > 0 ? 'default' : 'error'}
              onClick={() => nlpQuota.remaining === 0 && onOpenPricing('Hết lượt AI hôm nay')}
              sx={{ display: { xs: 'none', sm: 'inline-flex' }, fontSize: 10.5, fontWeight: 700, height: 22, cursor: 'pointer' }}
            />
          </Tooltip>
        )}

        <IconButton
          color="primary"
          type="submit"
          disabled={!text.trim()}
          size="small"
          sx={{
            bgcolor: text.trim() ? '#20705B' : 'var(--bg-subtle)',
            color: text.trim() ? '#ffffff !important' : 'var(--text-muted)',
            width: 32,
            height: 32,
            borderRadius: 2,
            flexShrink: 0,
            transition: 'all 0.15s ease',
            '&:hover': {
              bgcolor: text.trim() ? '#185548' : 'var(--bg-subtle)'
            }
          }}
        >
          <CornerDownLeft size={16} />
        </IconButton>
      </Paper>

      {/* 2. Gợi ý mẫu lệnh & Mẫu 1-Chạm (1 hàng cuộn ngang mượt mà) */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mt: 1.25,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          pb: 0.25
        }}
      >
        <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, flexShrink: 0 }}>
          Gợi ý:
        </Typography>

        <Chip
          icon={<Landmark size={12} color="#15966B" />}
          label="Bắt tin nhắn SMS"
          size="small"
          onClick={() => setBankSmsModalOpen(true)}
          sx={{
            fontWeight: 600,
            fontSize: 11,
            height: 24,
            bgcolor: 'rgba(21, 150, 107, 0.08)',
            color: '#15966B',
            border: '1px solid rgba(21, 150, 107, 0.25)',
            cursor: 'pointer',
            flexShrink: 0
          }}
        />

        <Chip
          label="Ăn trưa 45k"
          size="small"
          onClick={() => {
            setText('ăn trưa 45k');
            inputRef.current?.focus();
          }}
          sx={{
            fontWeight: 500,
            fontSize: 11,
            height: 24,
            bgcolor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            cursor: 'pointer',
            flexShrink: 0
          }}
        />

        <Chip
          icon={<CreditCard size={12} color="#b45309" />}
          label="Quẹt thẻ trả góp 6 tháng"
          size="small"
          onClick={() => {
            setText('quẹt thẻ VCB mua tủ lạnh 12tr trả góp 6 tháng');
            inputRef.current?.focus();
          }}
          sx={{
            fontWeight: 500,
            fontSize: 11,
            height: 24,
            bgcolor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            cursor: 'pointer',
            flexShrink: 0
          }}
        />

        <Chip
          label="Lương 25tr"
          size="small"
          onClick={() => {
            setText('lương tháng 25tr');
            inputRef.current?.focus();
          }}
          sx={{
            fontWeight: 500,
            fontSize: 11,
            height: 24,
            bgcolor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            cursor: 'pointer',
            flexShrink: 0
          }}
        />

        <Chip
          icon={<TrendingUp size={12} color="#0f766e" />}
          label="Mua 100 cổ FPT"
          size="small"
          onClick={() => {
            setText('mua 100 cổ FPT 13tr');
            inputRef.current?.focus();
          }}
          sx={{
            fontWeight: 500,
            fontSize: 11,
            height: 24,
            bgcolor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            cursor: 'pointer',
            flexShrink: 0
          }}
        />

        <Chip
          icon={<Users size={12} color="#2563eb" />}
          label="Chia tiền nhóm"
          size="small"
          onClick={() => {
            setText('ăn lẩu 1200k chia 4 người');
            inputRef.current?.focus();
          }}
          sx={{
            fontWeight: 500,
            fontSize: 11,
            height: 24,
            bgcolor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            cursor: 'pointer',
            flexShrink: 0
          }}
        />

        {templates.map(tpl => (
          <Chip
            key={tpl.id}
            label={`${tpl.label || tpl.name} (${money(tpl.amount)})`}
            size="small"
            onClick={() => handleQuickChipClick(tpl)}
            onDelete={e => handleDeleteTemplate(tpl.id, e)}
            deleteIcon={<Trash2 size={11} />}
            sx={{
              fontWeight: 600,
              fontSize: 11,
              height: 24,
              bgcolor: tpl.isBusinessBundle ? 'rgba(21, 150, 107, 0.08)' : 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              flexShrink: 0
            }}
          />
        ))}

        <Button
          size="small"
          variant="text"
          startIcon={<Plus size={12} />}
          onClick={() => setTemplateModalOpen(true)}
          sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', minWidth: 0, p: '2px 8px', flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          Mẫu 1-chạm
        </Button>
      </Box>

      {/* Real-time Multi-Intent Structured Preview Card */}
      {commandResult && (
        <Box
          sx={{
            mt: 1.25,
            p: 1.75,
            borderRadius: 2.5,
            bgcolor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.25
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                size="small"
                label={commandResult.badgeLabel}
                color={commandResult.badgeColor}
                icon={getIntentIcon(commandResult.intent)}
                sx={{ height: 22, fontSize: 11, fontWeight: 750 }}
              />
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {commandResult.explanation}
              </Typography>
            </Box>
            <Button
              size="small"
              variant="contained"
              color="primary"
              onClick={() => handleSubmit()}
              sx={{ fontWeight: 750, height: 28, px: 2, fontSize: 12 }}
            >
              Thực hiện ngay (Enter)
            </Button>
          </Box>

          {/* Structured Details for Credit Installments */}
          {commandResult.intent === 'credit_installment' && commandResult.creditInstallment && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
                gap: 1,
                pt: 1,
                borderTop: '1px solid var(--border-subtle)'
              }}
            >
              <Box sx={{ p: 1, bgcolor: 'var(--bg-subtle)', borderRadius: 1.5 }}>
                <Typography variant="caption" sx={{ color: 'var(--text-muted)', display: 'block', fontSize: 11 }}>
                  Món hàng
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {commandResult.creditInstallment.item}
                </Typography>
              </Box>
              <Box sx={{ p: 1, bgcolor: 'var(--bg-subtle)', borderRadius: 1.5 }}>
                <Typography variant="caption" sx={{ color: 'var(--text-muted)', display: 'block', fontSize: 11 }}>
                  Tài khoản thẻ
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {data.accounts.find(a => a.id === commandResult.creditInstallment?.accountId)?.name || 'Thẻ tín dụng'}
                </Typography>
              </Box>
              <Box sx={{ p: 1, bgcolor: 'var(--bg-subtle)', borderRadius: 1.5 }}>
                <Typography variant="caption" sx={{ color: 'var(--text-muted)', display: 'block', fontSize: 11 }}>
                  Tổng tiền
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: 'var(--accent-expense)' }}>
                  {money(commandResult.creditInstallment.totalAmount)}
                </Typography>
              </Box>
              <Box sx={{ p: 1, bgcolor: 'var(--bg-subtle)', borderRadius: 1.5 }}>
                <Typography variant="caption" sx={{ color: 'var(--text-muted)', display: 'block', fontSize: 11 }}>
                  Trả góp mỗi tháng
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {money(commandResult.creditInstallment.monthlyAmount)} × {commandResult.creditInstallment.installments}T
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      )}



      {/* Dialog for adding new Quick Template / Business Bundle */}
      <Dialog
        open={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>
          {newTpl.isBusinessBundle ? 'Tạo gói Doanh thu / Kinh doanh' : 'Thêm mẫu chi tiêu 1-Chạm'}
        </DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '14px !important' }}>
          <FormControlLabel
            control={
              <Switch
                checked={newTpl.isBusinessBundle}
                onChange={e => setNewTpl({ ...newTpl, isBusinessBundle: e.target.checked })}
                color="primary"
              />
            }
            label={<Typography sx={{ fontSize: 13, fontWeight: 600 }}>Gói Kinh doanh (Tự trích giá vốn)</Typography>}
          />

          <MuiTextField
            label="Nhãn nút bấm (Hiển thị ngắn)"
            placeholder={newTpl.isBusinessBundle ? 'VD: Bán hàng 5tr' : 'VD: Cafe 30k'}
            value={newTpl.label}
            onChange={e => setNewTpl({ ...newTpl, label: e.target.value })}
          />
          <MuiTextField
            label={newTpl.isBusinessBundle ? 'Tên nguồn doanh thu' : 'Tên giao dịch đầy đủ'}
            placeholder={newTpl.isBusinessBundle ? 'VD: Doanh thu bán hàng' : 'VD: Cà phê sáng'}
            value={newTpl.name}
            onChange={e => setNewTpl({ ...newTpl, name: e.target.value })}
            required
          />
          <MuiCurrencyInput
            label={newTpl.isBusinessBundle ? 'Số tiền doanh thu (₫)' : 'Số tiền (₫)'}
            value={newTpl.amount}
            onChange={val => setNewTpl({ ...newTpl, amount: val })}
          />

          {newTpl.isBusinessBundle ? (
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}>
                Tỷ lệ chi phí giá vốn / vận hành: <strong>{newTpl.costRatio}%</strong> ({money((Number(newTpl.amount) * newTpl.costRatio) / 100)})
              </Typography>
              <Slider
                value={newTpl.costRatio}
                onChange={(_, v) => setNewTpl({ ...newTpl, costRatio: v as number })}
                min={10}
                max={90}
                step={5}
                valueLabelDisplay="auto"
              />
            </Box>
          ) : (
            <MuiSelect
              label="Danh mục"
              value={newTpl.categoryId}
              onChange={val => setNewTpl({ ...newTpl, categoryId: val })}
              options={data.categories
                .filter(c => c.type === 'expense' && !c.hidden)
                .map(c => ({ value: c.id, label: c.name }))}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTemplateModalOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleSaveTemplate}>
            Lưu mẫu
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bank & E-Wallet SMS Parser Modal */}
      <BankSmsModal
        open={bankSmsModalOpen}
        onClose={() => setBankSmsModalOpen(false)}
      />
    </Box>
  );
}
