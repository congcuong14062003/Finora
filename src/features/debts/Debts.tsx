import React, { useState } from 'react';
import { Plus, HandCoins, Pencil, Trash2, History } from 'lucide-react';
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
  Alert
} from '@mui/material';

import { useFinance } from '../../store';
import { balance, dateLabel, debtRemaining, money, uid, todayKey } from '../../lib/finance';
import { Confirm, PageHead, Progress } from '../../components/ui';
import {
  MuiTextField,
  MuiSelect,
  MuiCurrencyInput,
  MuiDatePicker
} from '../../components/mui/MuiInputs';
import type { Debt, Transaction } from '../../types';

export default function Debts() {
  const data = useFinance(s => s.data)!;
  const update = useFinance(s => s.update);

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Debt | null>(null);
  const [deleting, setDeleting] = useState<Debt | null>(null);
  const [pay, setPay] = useState<Debt | null>(null);
  const [history, setHistory] = useState<Debt | null>(null);
  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState(data.accounts[0]?.id || '');
  const [error, setError] = useState('');

  const blank = {
    name: '',
    kind: 'owed' as Debt['kind'],
    principal: '',
    startDate: todayKey(),
    dueDate: '',
    interestRate: '0'
  };
  const [form, setForm] = useState(blank);

  const start = (d?: Debt) => {
    setEdit(d || null);
    setForm(
      d
        ? {
            name: d.name,
            kind: d.kind,
            principal: String(d.principal),
            startDate: d.startDate,
            dueDate: d.dueDate,
            interestRate: String(d.interestRate || 0)
          }
        : blank
    );
    setError('');
    setOpen(true);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const principal = Number(form.principal),
      interestRate = Number(form.interestRate);
    if (!form.name.trim() || !Number.isInteger(principal) || principal <= 0 || form.dueDate < form.startDate || interestRate < 0) {
      setError('Kiểm tra tên, số tiền và ngày hạn trả');
      return;
    }
    update(x => ({
      ...x,
      debts: edit
        ? x.debts.map(d => (d.id === edit.id ? { ...d, ...form, principal, interestRate } : d))
        : [...x.debts, { id: uid(), ...form, principal, interestRate, payments: [] }]
    }));
    setOpen(false);
  };

  const record = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pay) return;
    const n = Number(amount),
      a = data.accounts.find(x => x.id === account);
    if (!Number.isInteger(n) || n <= 0 || n > debtRemaining(pay) || !a) {
      setError('Số tiền phải hợp lệ và không vượt quá số dư nợ');
      return;
    }
    if (pay.kind === 'owed' && balance(a, data.transactions) < n) {
      setError('Số dư tài khoản không đủ');
      return;
    }

    const date = todayKey();
    const transaction: Transaction = {
      id: uid(),
      name: pay.kind === 'owed' ? `Trả nợ · ${pay.name}` : `Thu hồi nợ · ${pay.name}`,
      amount: n,
      type: 'transfer',
      accountId: pay.kind === 'owed' ? account : 'external-debt',
      toAccountId: pay.kind === 'lent' ? account : undefined,
      date,
      method: 'Chuyển khoản',
      note: 'Thanh toán khoản nợ; không tính thu chi',
      status: 'completed'
    };

    update(x => ({
      ...x,
      debts: x.debts.map(d =>
        d.id === pay.id
          ? { ...d, payments: [...d.payments, { id: uid(), amount: n, date, note: 'Thanh toán' }] }
          : d
      ),
      transactions: [transaction, ...x.transactions]
    }));

    setPay(null);
    setAmount('');
    setError('');
  };

  const owed = data.debts
    .filter(d => d.kind === 'owed')
    .reduce((n, d) => n + debtRemaining(d), 0);
  const lent = data.debts
    .filter(d => d.kind === 'lent')
    .reduce((n, d) => n + debtRemaining(d), 0);

  return (
    <>
      <PageHead
        eyebrow="CÁC KHOẢN CẦN THEO DÕI"
        title="Khoản nợ"
        subtitle="Ghi nhận từng lần trả hoặc thu hồi nợ, không tự tính lãi phát sinh."
        actions={
          <Button
            variant="contained"
            color="primary"
            startIcon={<Plus size={14} />}
            onClick={() => start()}
          >
            Thêm khoản nợ
          </Button>
        }
      />

      <div className="grid-stats" style={{ marginBottom: 20 }}>
        <div className="card stat">
          <span className="stat-label">Cần trả (Tôi nợ)</span>
          <div className="stat-value negative">{money(owed)}</div>
        </div>
        <div className="card stat">
          <span className="stat-label">Cần thu (Người khác nợ tôi)</span>
          <div className="stat-value positive">{money(lent)}</div>
        </div>
        <div className="card stat">
          <span className="stat-label">Sắp hoặc đã đến hạn</span>
          <div className="stat-value">
            {
              data.debts.filter(
                d =>
                  debtRemaining(d) > 0 &&
                  d.dueDate <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
              ).length
            }
          </div>
        </div>
      </div>

      <div className="tiles">
        {data.debts.map(d => {
          const remaining = debtRemaining(d);
          const overdue = d.dueDate < todayKey() && remaining > 0;
          return (
            <Card
              variant="outlined"
              className="card tile"
              key={d.id}
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
                    bgcolor: d.kind === 'owed' ? '#fef0ef' : '#e9f9f2',
                    color: d.kind === 'owed' ? '#dc2626' : '#059669'
                  }}
                >
                  <HandCoins size={18} />
                </Box>
                <Chip
                  label={
                    remaining === 0
                      ? 'Đã tất toán'
                      : overdue
                      ? 'Quá hạn'
                      : d.kind === 'owed'
                      ? 'Phải trả'
                      : 'Cần thu'
                  }
                  size="small"
                  color={remaining === 0 ? 'success' : overdue ? 'error' : 'warning'}
                  variant="outlined"
                  sx={{ height: 22, fontSize: 11, fontWeight: 700 }}
                />
              </Box>

              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.25 }}>
                {d.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                Bắt đầu {dateLabel(d.startDate)} · Hạn {dateLabel(d.dueDate)}
              </Typography>

              <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>
                {money(remaining)}
              </Typography>

              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                Còn lại từ {money(d.principal)}
                {d.interestRate ? ` · Lãi suất tham khảo ${d.interestRate}%` : ''}
              </Typography>

              <Progress
                value={((d.principal - remaining) / d.principal) * 100}
                color={d.kind === 'owed' ? '#f59e0b' : '#10b981'}
              />

              <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  disabled={remaining === 0}
                  startIcon={<Plus size={14} />}
                  onClick={() => {
                    setPay(d);
                    setError('');
                  }}
                >
                  {d.kind === 'owed' ? 'Ghi trả nợ' : 'Ghi thu hồi'}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  startIcon={<History size={14} />}
                  onClick={() => setHistory(d)}
                >
                  Lịch sử
                </Button>
                <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
                  <IconButton size="small" onClick={() => start(d)} aria-label="Sửa khoản nợ">
                    <Pencil size={14} />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => setDeleting(d)}
                    aria-label="Xóa khoản nợ"
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </Box>
              </Box>
            </Card>
          );
        })}
      </div>

      {/* Add / Edit Debt Modal */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {edit ? 'Sửa khoản nợ' : 'Thêm khoản nợ mới'}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2, pt: '16px !important' }}>
          {error && <Alert severity="error">{error}</Alert>}
          <MuiTextField
            label="Tên người hoặc khoản nợ"
            placeholder="VD: Vay mua xe, Bạn Nam mượn, Trả góp điện thoại"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
            autoFocus
          />
          <MuiSelect
            label="Loại nợ"
            value={form.kind}
            onChange={val => setForm({ ...form, kind: val as Debt['kind'] })}
            options={[
              { value: 'owed', label: 'Tôi cần trả (Đi vay / Mua trả góp)' },
              { value: 'lent', label: 'Người khác nợ tôi (Cho vay)' }
            ]}
          />
          <MuiCurrencyInput
            label="Số tiền gốc (₫)"
            value={form.principal}
            onChange={val => setForm({ ...form, principal: val })}
            required
          />
          <MuiDatePicker
            label="Ngày bắt đầu"
            value={form.startDate}
            onChange={val => setForm({ ...form, startDate: val })}
          />
          <MuiDatePicker
            label="Hạn thanh toán"
            value={form.dueDate}
            onChange={val => setForm({ ...form, dueDate: val })}
          />
          <MuiTextField
            label="Lãi suất tham khảo (%/năm)"
            type="number"
            value={form.interestRate}
            onChange={e => setForm({ ...form, interestRate: e.target.value })}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Ứng dụng chỉ lưu thông tin lãi suất để bạn theo dõi, chưa tự động tính lãi kép phát sinh.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Hủy</Button>
          <Button variant="contained" color="primary" onClick={save}>
            Lưu khoản nợ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment / Recovery Modal */}
      <Dialog open={!!pay} onClose={() => setPay(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {pay?.kind === 'owed' ? 'Ghi trả nợ' : 'Ghi thu hồi nợ'} · {pay?.name || ''}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2, pt: '16px !important' }}>
          {error && <Alert severity="error">{error}</Alert>}
          <MuiSelect
            label={pay?.kind === 'owed' ? 'Trích từ tài khoản' : 'Nhận vào tài khoản'}
            value={account}
            onChange={val => setAccount(val)}
            options={data.accounts.map(a => ({
              value: a.id,
              label: a.name,
              subtitle: `Số dư: ${money(balance(a, data.transactions))}`
            }))}
          />
          <MuiCurrencyInput
            label="Số tiền thanh toán (₫)"
            value={amount}
            onChange={val => setAmount(val)}
            required
          />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Khoản này chỉ điều chỉnh số dư tài khoản và dư nợ, không tính vào thu nhập hoặc chi tiêu tiêu dùng.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPay(null)}>Hủy</Button>
          <Button variant="contained" color="primary" onClick={record}>
            Ghi nhận
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment History Modal */}
      <Dialog open={!!history} onClose={() => setHistory(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Lịch sử thanh toán · {history?.name || ''}
        </DialogTitle>
        <DialogContent dividers>
          <div className="mini-list">
            {history?.payments.map(p => (
              <div className="mini-row" key={p.id}>
                <span>{dateLabel(p.date)}</span>
                <strong style={{ color: '#059669' }}>{money(p.amount)}</strong>
              </div>
            ))}
            {history?.payments.length === 0 && (
              <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}>
                Chưa có lịch sử thanh toán nào.
              </Typography>
            )}
          </div>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setHistory(null)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            update(x => ({
              ...x,
              debts: x.debts.filter(d => d.id !== deleting.id)
            }));
          }
        }}
        message={`Xóa theo dõi khoản “${deleting?.name || ''}”? Lịch sử các giao dịch thanh toán đã ghi trước đây sẽ được giữ lại.`}
      />
    </>
  );
}
