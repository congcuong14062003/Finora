import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  InputBase,
  IconButton,
  Chip,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip
} from '@mui/material';
import {
  Sparkles,
  CornerDownLeft,
  Plus,
  Trash2,
  Zap
} from 'lucide-react';
import { useFinance } from '../store';
import { parseVietnameseTransaction } from '../lib/nlpParser';
import { updateStreak } from '../lib/habit';
import { checkNlpUsage, canAddQuickTemplate, isProUser } from '../lib/subscription';
import { uid, todayKey, money } from '../lib/finance';
import type { QuickTemplate, Transaction } from '../types';
import { MuiCurrencyInput, MuiSelect, MuiTextField } from './mui/MuiInputs';

export function MagicQuickBar({
  onOpenPricing
}: {
  onOpenPricing: (feature?: string) => void;
}) {
  const { data, update, notify } = useFinance();
  const [text, setText] = useState('');
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [newTpl, setNewTpl] = useState({ label: '', name: '', amount: '30000', categoryId: 'food' });
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
  const parsed = text.trim()
    ? parseVietnameseTransaction(text, data.categories, data.accounts, data.user.defaultAccountId)
    : null;

  // Handle Quick-Bar submission (Enter key)
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;

    if (!nlpQuota.allowed) {
      onOpenPricing('Bạn đã dùng hết 5 lượt nhập nhanh AI hôm nay');
      return;
    }

    if (!parsed) {
      notify('Chưa nhận diện được số tiền. Ví dụ: "ăn trưa 45k" hoặc "đổ xăng 70k"');
      return;
    }

    const newTx: Transaction = {
      id: uid(),
      name: parsed.name,
      amount: parsed.amount,
      type: parsed.type,
      categoryId: parsed.categoryId,
      accountId: parsed.accountId,
      date: parsed.date,
      method: 'Magic Quick-Bar',
      note: 'Nhập nhanh: ' + parsed.raw,
      status: 'completed'
    };

    const streakResult = updateStreak(data.user, todayKey());
    const today = todayKey();
    const currentCount =
      data.user.nlpUsageToday?.date === today
        ? data.user.nlpUsageToday.count + 1
        : 1;

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
  };

  const handleQuickChipClick = async (tpl: QuickTemplate) => {
    const targetAccountId =
      tpl.accountId || data.user.defaultAccountId || data.accounts[0]?.id || 'wallet';

    const newTx: Transaction = {
      id: uid(),
      name: tpl.name,
      amount: tpl.amount,
      type: tpl.type,
      categoryId: tpl.categoryId,
      accountId: targetAccountId,
      date: todayKey(),
      method: '1-Chạm (Quick Chip)',
      note: 'Ghi nhận nhanh qua mẫu ' + tpl.label,
      status: 'completed'
    };

    const streakResult = updateStreak(data.user, todayKey());

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
      type: 'expense',
      categoryId: newTpl.categoryId,
      accountId: data.user.defaultAccountId || data.accounts[0]?.id
    };

    await update(d => ({
      ...d,
      quickTemplates: [...(d.quickTemplates || []), tpl]
    }));

    setTemplateModalOpen(false);
    setNewTpl({ label: '', name: '', amount: '30000', categoryId: 'food' });
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

  return (
    <Box sx={{ mb: 3 }}>
      {/* Search / Command Bar */}
      <Paper
        elevation={0}
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: '4px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderRadius: 2.5,
          border: '1px solid',
          borderColor: parsed ? 'primary.main' : 'var(--border-subtle)',
          bgcolor: 'var(--bg-surface)',
          transition: 'all 0.15s ease',
          '&:focus-within': {
            borderColor: 'primary.main',
            boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.12)'
          }
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 1.5,
            bgcolor: 'var(--brand-primary-tint)',
            color: 'primary.main',
            flexShrink: 0
          }}
        >
          <Sparkles size={15} />
        </Box>

        <InputBase
          inputRef={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder='Nhập tự nhiên: "ăn trưa 45k", "đổ xăng 70k ví momo", "cafe 30k"... Nhấn Enter'
          sx={{
            flex: 1,
            fontSize: 13.5,
            fontWeight: 500,
            color: 'text.primary',
            fontFamily: 'inherit'
          }}
        />

        {/* Hotkey Tag */}
        <Box
          sx={{
            display: { xs: 'none', sm: 'flex' },
            alignItems: 'center',
            gap: 0.5,
            px: 1,
            py: 0.25,
            borderRadius: 1,
            bgcolor: 'var(--bg-subtle)',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)'
          }}
        >
          <span>Ctrl K</span>
        </Box>

        {!isProUser(data) && (
          <Tooltip title="Lượt nhập AI miễn phí hôm nay">
            <Chip
              label={`AI: ${nlpQuota.remaining}/5`}
              size="small"
              color={nlpQuota.remaining > 0 ? 'default' : 'error'}
              onClick={() => nlpQuota.remaining === 0 && onOpenPricing('Hết lượt AI hôm nay')}
              sx={{ fontSize: 10.5, fontWeight: 700, height: 20 }}
            />
          </Tooltip>
        )}

        <IconButton
          color="primary"
          type="submit"
          disabled={!text.trim()}
          size="small"
          sx={{
            bgcolor: text.trim() ? 'primary.main' : 'transparent',
            color: text.trim() ? '#fff !important' : 'inherit',
            width: 28,
            height: 28,
            borderRadius: 1.5,
            '&:hover': {
              bgcolor: 'primary.dark'
            }
          }}
        >
          <CornerDownLeft size={14} />
        </IconButton>
      </Paper>

      {/* Real-time Parsed Preview Chip */}
      {parsed && (
        <Box
          sx={{
            mt: 1,
            px: 1.5,
            py: 0.6,
            borderRadius: 1.5,
            bgcolor: 'var(--bg-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
            border: '1px solid var(--border-subtle)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Zap size={13} color="#059669" />
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', fontSize: 12 }}>
              {parsed.explanation}
            </Typography>
          </Box>
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={() => handleSubmit()}
            sx={{ height: 24, fontSize: 11, px: 1.25, py: 0 }}
          >
            Lưu ngay (Enter)
          </Button>
        </Box>
      )}

      {/* One-Tap Quick Chips Row */}
      <Box sx={{ mt: 1.25, display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
        <Typography
          variant="caption"
          sx={{
            fontSize: 11.5,
            fontWeight: 700,
            color: 'var(--text-muted)',
            mr: 0.25
          }}
        >
          1-Chạm:
        </Typography>

        {templates.map(tpl => (
          <Chip
            key={tpl.id}
            label={tpl.label}
            onClick={() => handleQuickChipClick(tpl)}
            onDelete={e => handleDeleteTemplate(tpl.id, e)}
            deleteIcon={<Trash2 size={11} />}
            variant="outlined"
            clickable
            sx={{
              fontWeight: 600,
              fontSize: 11.5,
              height: 26,
              borderRadius: 1.5,
              borderColor: 'var(--border-subtle)',
              bgcolor: 'var(--bg-surface)',
              '&:hover': {
                borderColor: 'var(--border-strong)',
                bgcolor: 'var(--bg-subtle)'
              }
            }}
          />
        ))}

        <Button
          size="small"
          variant="text"
          startIcon={<Plus size={12} />}
          onClick={() => setTemplateModalOpen(true)}
          sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', minWidth: 0, p: '2px 6px' }}
        >
          Thêm mẫu
        </Button>
      </Box>

      {/* Dialog for adding new Quick Template */}
      <Dialog
        open={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>Thêm mẫu chi tiêu 1-Chạm</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '14px !important' }}>
          <MuiTextField
            label="Nhãn nút bấm (Hiển thị ngắn)"
            placeholder="VD: ☕ Cafe 30k"
            value={newTpl.label}
            onChange={e => setNewTpl({ ...newTpl, label: e.target.value })}
          />
          <MuiTextField
            label="Tên giao dịch đầy đủ"
            placeholder="VD: Cà phê sáng"
            value={newTpl.name}
            onChange={e => setNewTpl({ ...newTpl, name: e.target.value })}
            required
          />
          <MuiCurrencyInput
            label="Số tiền (₫)"
            value={newTpl.amount}
            onChange={val => setNewTpl({ ...newTpl, amount: val })}
          />
          <MuiSelect
            label="Danh mục"
            value={newTpl.categoryId}
            onChange={val => setNewTpl({ ...newTpl, categoryId: val })}
            options={data.categories
              .filter(c => c.type === 'expense' && !c.hidden)
              .map(c => ({ value: c.id, label: c.name }))}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTemplateModalOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleSaveTemplate}>
            Lưu mẫu
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
