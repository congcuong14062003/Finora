import React, { useState } from 'react';
import { Plus, CalendarClock, Pencil, Trash2, Play, Sparkles } from 'lucide-react';
import {
  Box,
  Button,
  IconButton,
  Card,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Alert
} from '@mui/material';

import { useFinance } from '../../store';
import { dateLabel, money, nextDate, uid, todayKey } from '../../lib/finance';
import { Confirm, PageHead } from '../../components/ui';
import { canAutoExecuteRecurring } from '../../lib/subscription';
import {
  MuiTextField,
  MuiSelect,
  MuiCurrencyInput,
  MuiDatePicker,
  MuiTransactionTypeToggle
} from '../../components/mui/MuiInputs';
import type { RecurringTransaction, Transaction } from '../../types';

export default function Recurring() {
  const data = useFinance(s => s.data)!;
  const update = useFinance(s => s.update);
  const notify = useFinance(s => s.notify);
  const openPricing = useFinance(s => s.openPricing);

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<RecurringTransaction | null>(null);
  const [deleting, setDeleting] = useState<RecurringTransaction | null>(null);
  const [error, setError] = useState('');

  const blank = {
    name: '',
    amount: '',
    type: 'expense' as RecurringTransaction['type'],
    categoryId: 'food',
    accountId: data.accounts[0]?.id || '',
    frequency: 'monthly' as RecurringTransaction['frequency'],
    nextDate: todayKey(),
    active: true,
    autoExecute: false
  };
  const [form, setForm] = useState(blank);

  const frequency = {
    daily: 'Hằng ngày',
    weekly: 'Hằng tuần',
    monthly: 'Hằng tháng',
    yearly: 'Hằng năm'
  };

  const start = (r?: RecurringTransaction) => {
    setEdit(r || null);
    setForm(
      r
        ? {
            name: r.name,
            amount: String(r.amount),
            type: r.type,
            categoryId: r.categoryId,
            accountId: r.accountId,
            frequency: r.frequency,
            nextDate: r.nextDate,
            active: r.active,
            autoExecute: r.autoExecute || false
          }
        : blank
    );
    setError('');
    setOpen(true);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(form.amount);
    if (!form.name.trim() || !Number.isInteger(n) || n <= 0) {
      setError('Nhập tên và số tiền hợp lệ');
      return;
    }
    const category =
      data.categories.find(c => c.id === form.categoryId && c.type === form.type)?.id ||
      data.categories.find(c => c.type === form.type)?.id ||
      '';

    update(d => ({
      ...d,
      recurring: edit
        ? d.recurring.map(r =>
            r.id === edit.id ? { ...r, ...form, categoryId: category, amount: n } : r
          )
        : [...d.recurring, { ...form, categoryId: category, id: uid(), amount: n }]
    }));
    setOpen(false);
  };

  const generate = (r: RecurringTransaction) => {
    if (data.transactions.some(t => t.recurringId === r.id && t.date === r.nextDate)) {
      notify('Kỳ này đã được ghi nhận trước đó');
      return;
    }
    const tx: Transaction = {
      id: uid(),
      name: r.name,
      amount: r.amount,
      type: r.type,
      categoryId: r.categoryId,
      accountId: r.accountId,
      date: r.nextDate,
      method: 'Định kỳ',
      note: 'Tạo từ lịch định kỳ',
      status: r.nextDate <= todayKey() ? 'completed' : 'pending',
      recurringId: r.id
    };
    update(d => ({
      ...d,
      transactions: [tx, ...d.transactions],
      recurring: d.recurring.map(x => (x.id === r.id ? { ...x, nextDate: nextDate(x) } : x))
    }));
    notify(`✅ Đã ghi nhận kỳ thanh toán cho "${r.name}"`);
  };

  const toggleAutoExecute = (r: RecurringTransaction) => {
    if (!canAutoExecuteRecurring(data)) {
      openPricing('Tự động ghi nhận định kỳ (Auto-Execute) là tính năng của gói Finora Pro 👑');
      return;
    }
    update(d => ({
      ...d,
      recurring: d.recurring.map(x =>
        x.id === r.id ? { ...x, autoExecute: !x.autoExecute } : x
      )
    }));
    notify(
      !r.autoExecute
        ? `🤖 Đã bật tự động chạy cho "${r.name}"`
        : `Đã tắt tự động chạy cho "${r.name}"`
    );
  };

  return (
    <>
      <PageHead
        eyebrow="LỊCH THANH TOÁN"
        title="Giao dịch định kỳ"
        subtitle="Lên lịch thanh toán lặp lại; Finora Pro hỗ trợ tự động ghi nhận ngầm không cần bấm tay."
        actions={
          <Button
            variant="contained"
            color="primary"
            startIcon={<Plus size={14} />}
            onClick={() => start()}
          >
            Tạo lịch
          </Button>
        }
      />

      <div className="tiles">
        {[...data.recurring]
          .sort((a, b) => a.nextDate.localeCompare(b.nextDate))
          .map(r => (
            <Card
              variant="outlined"
              className="card tile"
              key={r.id}
              sx={{ borderRadius: 3, p: 2.5 }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#e9f9f2',
                    color: '#059669'
                  }}
                >
                  <CalendarClock size={18} />
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {r.autoExecute && (
                    <Chip
                      icon={<Sparkles size={11} color="#059669" />}
                      label="Auto"
                      size="small"
                      color="success"
                      sx={{ height: 22, fontSize: 10, fontWeight: 700 }}
                    />
                  )}
                  <Chip
                    label={r.active ? 'Đang chạy' : 'Tạm dừng'}
                    size="small"
                    color={r.active ? 'primary' : 'default'}
                    variant="outlined"
                    sx={{ height: 22, fontSize: 11, fontWeight: 700 }}
                  />
                </Box>
              </Box>

              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.25 }}>
                {r.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                {frequency[r.frequency]} · Kỳ tiếp theo {dateLabel(r.nextDate)}
              </Typography>

              <Typography
                variant="h5"
                sx={{
                  fontWeight: 900,
                  color: r.type === 'income' ? '#059669' : '#ef4444',
                  mb: 1
                }}
              >
                {r.type === 'income' ? '+' : '-'}
                {money(r.amount)}
              </Typography>

              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                {data.accounts.find(a => a.id === r.accountId)?.name} ·{' '}
                {data.categories.find(c => c.id === r.categoryId)?.name}
              </Typography>

              {/* Auto Execute Switch */}
              <Box sx={{ mb: 1.5, p: 1, borderRadius: 2, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  Tự động ghi nhận (Auto)
                </Typography>
                <Switch
                  size="small"
                  checked={!!r.autoExecute}
                  onChange={() => toggleAutoExecute(r)}
                  color="primary"
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  disabled={!r.active}
                  startIcon={<Play size={14} />}
                  onClick={() => generate(r)}
                >
                  Ghi nhận kỳ này
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  onClick={() =>
                    update(d => ({
                      ...d,
                      recurring: d.recurring.map(x => (x.id === r.id ? { ...x, active: !x.active } : x))
                    }))
                  }
                >
                  {r.active ? 'Tạm dừng' : 'Kích hoạt'}
                </Button>
                <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
                  <IconButton size="small" onClick={() => start(r)} aria-label="Sửa lịch">
                    <Pencil size={14} />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => setDeleting(r)}
                    aria-label="Xóa lịch"
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </Box>
              </Box>
            </Card>
          ))}
      </div>

      {/* Add / Edit Recurring Modal */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {edit ? 'Sửa lịch định kỳ' : 'Tạo lịch định kỳ mới'}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2, pt: '16px !important' }}>
          {error && <Alert severity="error">{error}</Alert>}
          <MuiTransactionTypeToggle
            value={form.type}
            onChange={val => {
              if (val !== 'transfer') {
                setForm({ ...form, type: val });
              }
            }}
            includeTransfer={false}
          />
          <MuiTextField
            label="Tên giao dịch"
            placeholder="VD: Tiền thuê nhà, Tiền lương, Gói Netflix..."
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
            autoFocus
          />
          <MuiCurrencyInput
            label="Số tiền (₫)"
            value={form.amount}
            onChange={val => setForm({ ...form, amount: val })}
            required
          />
          <MuiSelect
            label="Danh mục"
            value={form.categoryId}
            onChange={val => setForm({ ...form, categoryId: val })}
            options={data.categories
              .filter(c => c.type === form.type && !c.hidden)
              .map(c => ({ value: c.id, label: c.name }))}
          />
          <MuiSelect
            label="Tài khoản liên kết"
            value={form.accountId}
            onChange={val => setForm({ ...form, accountId: val })}
            options={data.accounts.map(a => ({ value: a.id, label: a.name }))}
          />
          <MuiSelect
            label="Tần suất lặp lại"
            value={form.frequency}
            onChange={val =>
              setForm({ ...form, frequency: val as RecurringTransaction['frequency'] })
            }
            options={Object.entries(frequency).map(([k, v]) => ({ value: k, label: v }))}
          />
          <MuiDatePicker
            label="Kỳ tiếp theo"
            value={form.nextDate}
            onChange={val => setForm({ ...form, nextDate: val })}
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.autoExecute}
                onChange={e => {
                  if (e.target.checked && !canAutoExecuteRecurring(data)) {
                    openPricing('Tự động ghi nhận định kỳ là tính năng Pro');
                    return;
                  }
                  setForm({ ...form, autoExecute: e.target.checked });
                }}
              />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Tự động ghi nhận khi đến hạn (Auto-Execute 👑)
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Hệ thống tự quét và sinh giao dịch khi khởi chạy
                </Typography>
              </Box>
            }
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Hủy</Button>
          <Button variant="contained" color="primary" onClick={save}>
            Lưu lịch
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            update(d => ({
              ...d,
              recurring: d.recurring.filter(r => r.id !== deleting.id)
            }));
          }
        }}
        message={`Xóa lịch “${deleting?.name || ''}”? Các giao dịch đã được ghi nhận trước đây vẫn sẽ được giữ lại.`}
      />
    </>
  );
}
