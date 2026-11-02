import React, { useState } from 'react';
import { differenceInCalendarMonths, parseISO } from 'date-fns';
import { Plus, Target, Pencil, Trash2, History, Laptop, ShieldCheck, Plane } from 'lucide-react';
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
import { balance, dateLabel, goalSaved, money, uid, todayKey } from '../../lib/finance';
import { Confirm, PageHead, Progress } from '../../components/ui';
import { canAddGoal } from '../../lib/subscription';
import {
  MuiTextField,
  MuiSelect,
  MuiCurrencyInput,
  MuiDatePicker
} from '../../components/mui/MuiInputs';
import type { SavingsGoal, Transaction } from '../../types';

export default function Savings() {
  const data = useFinance(s => s.data)!;
  const update = useFinance(s => s.update);
  const openPricing = useFinance(s => s.openPricing);

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<SavingsGoal | null>(null);
  const [deleting, setDeleting] = useState<SavingsGoal | null>(null);
  const [contribute, setContribute] = useState<SavingsGoal | null>(null);
  const [history, setHistory] = useState<SavingsGoal | null>(null);
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState(data.accounts[0]?.id || '');
  const [error, setError] = useState('');

  const blank = {
    name: '',
    target: '',
    startDate: todayKey(),
    dueDate: '',
    accountId: data.accounts.find(a => a.type === 'savings')?.id || data.accounts[0]?.id || '',
    icon: 'Target'
  };
  const [form, setForm] = useState(blank);

  const start = (g?: SavingsGoal) => {
    if (!g && !canAddGoal(data)) {
      openPricing('Gói Free hỗ trợ tối đa 1 mục tiêu tiết kiệm. Nâng cấp Pro để tạo không giới hạn!');
      return;
    }
    setEdit(g || null);
    setForm(
      g
        ? {
            name: g.name,
            target: String(g.target),
            startDate: g.startDate,
            dueDate: g.dueDate,
            accountId: g.accountId,
            icon: g.icon
          }
        : blank
    );
    setError('');
    setOpen(true);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(form.target);
    if (!form.name.trim() || !Number.isInteger(n) || n <= 0 || form.dueDate <= form.startDate) {
      setError('Kiểm tra tên, số tiền mục tiêu và ngày hoàn thành');
      return;
    }

    update(d => ({
      ...d,
      goals: edit
        ? d.goals.map(g => (g.id === edit.id ? { ...g, ...form, target: n } : g))
        : [...d.goals, { ...form, id: uid(), target: n, contributions: [] }]
    }));
    setOpen(false);
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribute) return;
    const n = Number(amount),
      a = data.accounts.find(x => x.id === source);
    if (!Number.isInteger(n) || n <= 0 || !a) {
      setError('Nhập số tiền hợp lệ');
      return;
    }
    if (source !== contribute.accountId && balance(a, data.transactions) < n) {
      setError('Số dư tài khoản nguồn không đủ');
      return;
    }

    const tx: Transaction = {
      id: uid(),
      name: `Dành cho mục tiêu: ${contribute.name}`,
      amount: n,
      type: 'transfer',
      accountId: source,
      toAccountId: contribute.accountId,
      date: todayKey(),
      method: 'Chuyển khoản',
      note: 'Đóng góp mục tiêu tiết kiệm',
      status: 'completed'
    };

    update(d => ({
      ...d,
      goals: d.goals.map(g =>
        g.id === contribute.id
          ? {
              ...g,
              contributions: [...g.contributions, { id: uid(), amount: n, date: tx.date, accountId: source }]
            }
          : g
      ),
      transactions: source === contribute.accountId ? d.transactions : [tx, ...d.transactions]
    }));

    setContribute(null);
    setAmount('');
    setError('');
  };

  return (
    <>
      <PageHead
        eyebrow="KẾ HOẠCH TƯƠNG LAI"
        title="Mục tiêu tiết kiệm"
        subtitle="Theo dõi tiến độ và số tiền cần dành mỗi tháng."
        actions={
          <Button
            variant="contained"
            color="primary"
            startIcon={<Plus size={14} />}
            onClick={() => start()}
          >
            Tạo mục tiêu
          </Button>
        }
      />

      <div className="grid-stats" style={{ marginBottom: 20 }}>
        <div className="card stat">
          <span className="stat-label">Đã dành cho mục tiêu</span>
          <div className="stat-value">{money(data.goals.reduce((n, g) => n + goalSaved(g), 0))}</div>
        </div>
        <div className="card stat">
          <span className="stat-label">Tổng số tiền mục tiêu</span>
          <div className="stat-value">{money(data.goals.reduce((n, g) => n + g.target, 0))}</div>
        </div>
        <div className="card stat">
          <span className="stat-label">Mục tiêu đang thực hiện</span>
          <div className="stat-value">{data.goals.filter(g => goalSaved(g) < g.target).length}</div>
        </div>
      </div>

      <div className="tiles">
        {data.goals.map(g => {
          const Icon =
            { Target, Laptop, ShieldCheck, Plane }[
              g.icon as 'Target' | 'Laptop' | 'ShieldCheck' | 'Plane'
            ] || Target;
          const saved = goalSaved(g),
            remaining = Math.max(0, g.target - saved),
            months = Math.max(1, differenceInCalendarMonths(parseISO(g.dueDate), new Date()));
          return (
            <Card
              variant="outlined"
              className="card tile"
              key={g.id}
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
                  <Icon size={18} />
                </Box>
                <Chip
                  label={saved >= g.target ? 'Hoàn thành' : dateLabel(g.dueDate)}
                  size="small"
                  color={saved >= g.target ? 'success' : 'default'}
                  variant="outlined"
                  sx={{ height: 22, fontSize: 11, fontWeight: 700 }}
                />
              </Box>

              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.25 }}>
                {g.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                Tài khoản: {data.accounts.find(a => a.id === g.accountId)?.name}
              </Typography>

              <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>
                {money(saved)}{' '}
                <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontSize: 12 }}>
                  / {money(g.target)}
                </Typography>
              </Typography>

              <Progress value={(saved / g.target) * 100} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, fontSize: 11, color: 'text.secondary' }}>
                <span>Còn thiếu {money(remaining)}</span>
                <span>{Math.round((saved / g.target) * 100)}%</span>
              </Box>

              <Typography variant="body2" sx={{ mt: 1.5, fontSize: 12 }}>
                Cần dành khoảng <strong>{money(Math.ceil(remaining / months))}</strong> / tháng
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, mt: 2, alignItems: 'center' }}>
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  startIcon={<Plus size={14} />}
                  onClick={() => {
                    setContribute(g);
                    setSource(data.accounts.find(a => a.id !== g.accountId)?.id || g.accountId);
                    setError('');
                  }}
                >
                  Thêm tiền
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  startIcon={<History size={14} />}
                  onClick={() => setHistory(g)}
                >
                  Lịch sử
                </Button>
                <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
                  <IconButton size="small" onClick={() => start(g)} aria-label="Sửa mục tiêu">
                    <Pencil size={14} />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => setDeleting(g)}
                    aria-label="Xóa mục tiêu"
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </Box>
              </Box>
            </Card>
          );
        })}
      </div>

      {/* Add / Edit Goal Modal */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {edit ? 'Sửa mục tiêu tiết kiệm' : 'Tạo mục tiêu tiết kiệm mới'}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2, pt: '16px !important' }}>
          {error && <Alert severity="error">{error}</Alert>}
          <MuiTextField
            label="Tên mục tiêu"
            placeholder="VD: Mua laptop, Quỹ du lịch, Mua nhà"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
            autoFocus
          />
          <MuiCurrencyInput
            label="Số tiền mục tiêu (₫)"
            value={form.target}
            onChange={val => setForm({ ...form, target: val })}
            required
          />
          <MuiSelect
            label="Tài khoản tích lũy"
            value={form.accountId}
            onChange={val => setForm({ ...form, accountId: val })}
            options={data.accounts.map(a => ({
              value: a.id,
              label: a.name,
              subtitle: `Số dư: ${money(balance(a, data.transactions))}`
            }))}
          />
          <MuiSelect
            label="Biểu tượng"
            value={form.icon}
            onChange={val => setForm({ ...form, icon: val })}
            options={[
              { value: 'Target', label: 'Mục tiêu chung' },
              { value: 'Laptop', label: 'Đồ công nghệ (Laptop)' },
              { value: 'ShieldCheck', label: 'Quỹ an toàn / Dự phòng' },
              { value: 'Plane', label: 'Du lịch / Kỳ nghỉ' }
            ]}
          />
          <MuiDatePicker
            label="Ngày bắt đầu"
            value={form.startDate}
            onChange={val => setForm({ ...form, startDate: val })}
          />
          <MuiDatePicker
            label="Dự kiến hoàn thành"
            value={form.dueDate}
            onChange={val => setForm({ ...form, dueDate: val })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Hủy</Button>
          <Button variant="contained" color="primary" onClick={save}>
            Lưu mục tiêu
          </Button>
        </DialogActions>
      </Dialog>

      {/* Contribute Funds Modal */}
      <Dialog open={!!contribute} onClose={() => setContribute(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Thêm tiền vào · {contribute?.name || ''}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2, pt: '16px !important' }}>
          {error && <Alert severity="error">{error}</Alert>}
          <MuiSelect
            label="Trích từ tài khoản"
            value={source}
            onChange={val => setSource(val)}
            options={data.accounts.map(a => ({
              value: a.id,
              label: a.name,
              subtitle: `Khả dụng: ${money(balance(a, data.transactions))}`
            }))}
          />
          <MuiCurrencyInput
            label="Số tiền thêm (₫)"
            value={amount}
            onChange={val => setAmount(val)}
            required
          />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Nếu chọn tài khoản khác tài khoản tích lũy, hệ thống sẽ ghi nhận một chuyển khoản nội bộ. Khoản này không tính vào chi tiêu.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setContribute(null)}>Hủy</Button>
          <Button variant="contained" color="primary" onClick={add}>
            Xác nhận thêm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Contribution History Modal */}
      <Dialog open={!!history} onClose={() => setHistory(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Lịch sử đóng góp · {history?.name || ''}
        </DialogTitle>
        <DialogContent dividers>
          <div className="mini-list">
            {history?.contributions.map(c => (
              <div className="mini-row" key={c.id}>
                <span>{dateLabel(c.date)}</span>
                <strong style={{ color: '#059669' }}>+{money(c.amount)}</strong>
              </div>
            ))}
            {history?.contributions.length === 0 && (
              <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 2 }}>
                Chưa có lần đóng góp nào.
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
            update(d => ({
              ...d,
              goals: d.goals.filter(g => g.id !== deleting.id)
            }));
          }
        }}
        message={`Xóa mục tiêu “${deleting?.name || ''}”? Lịch sử giao dịch chuyển tiền trước đây vẫn sẽ được giữ lại.`}
      />
    </>
  );
}
