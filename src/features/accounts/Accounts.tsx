import React, { useState } from 'react';
import {
  Plus,
  ArrowLeftRight,
  Wallet,
  Pencil,
  Trash2,
  History,
  Scale
} from 'lucide-react';
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
import { balance, dateLabel, money, uid, todayKey } from '../../lib/finance';
import { Confirm, PageHead } from '../../components/ui';
import { ReconcileDialog } from '../../components/ReconcileDialog';
import { canAddAccount } from '../../lib/subscription';
import { MuiTextField, MuiSelect, MuiCurrencyInput } from '../../components/mui/MuiInputs';
import type { Account, Transaction } from '../../types';

const kinds: Record<Account['type'], string> = {
  bank: 'Ngân hàng',
  cash: 'Tiền mặt',
  ewallet: 'Ví điện tử',
  savings: 'Tiết kiệm',
  investment: 'Đầu tư'
};

const blank = {
  name: '',
  type: 'bank' as Account['type'],
  openingBalance: '0',
  color: '#10b981'
};

export default function Accounts() {
  const data = useFinance(s => s.data)!;
  const update = useFinance(s => s.update);
  const notify = useFinance(s => s.notify);
  const openPricing = useFinance(s => s.openPricing);

  const [form, setForm] = useState(blank);
  const [edit, setEdit] = useState<Account | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const [history, setHistory] = useState<Account | null>(null);
  const [reconcileAccount, setReconcileAccount] = useState<Account | null>(null);
  const [transfer, setTransfer] = useState(false);
  const [source, setSource] = useState(data.accounts[0]?.id || '');
  const [target, setTarget] = useState(data.accounts[1]?.id || '');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const start = (a?: Account) => {
    if (!a && !canAddAccount(data)) {
      openPricing('Gói Free hỗ trợ tối đa 2 tài khoản. Nâng cấp Pro để thêm tài khoản không giới hạn!');
      return;
    }
    setEdit(a || null);
    setForm(
      a
        ? {
            name: a.name,
            type: a.type,
            openingBalance: String(a.openingBalance),
            color: a.color
          }
        : blank
    );
    setError('');
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const opening = Number(form.openingBalance);
    if (!form.name.trim() || !Number.isInteger(opening) || opening < 0) {
      setError('Nhập tên và số dư đầu kỳ hợp lệ');
      return;
    }

    await update(
      d => ({
        ...d,
        accounts: edit
          ? d.accounts.map(a => (a.id === edit.id ? { ...a, ...form, openingBalance: opening } : a))
          : [
              ...d.accounts,
              {
                id: uid(),
                name: form.name.trim(),
                type: form.type,
                openingBalance: opening,
                color: form.color,
                createdAt: todayKey(),
                active: true
              }
            ]
      }),
      edit ? 'Đã lưu thông tin tài khoản' : 'Đã tạo tài khoản mới'
    );
    setOpen(false);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    const a = data.accounts.find(x => x.id === source);
    if (source === target || !a || !Number.isInteger(n) || n <= 0) {
      setError('Chọn hai tài khoản khác nhau và số tiền hợp lệ');
      return;
    }
    if (balance(a, data.transactions) < n) {
      setError('Số dư tài khoản gửi không đủ');
      return;
    }

    const tx: Transaction = {
      id: uid(),
      name: `Chuyển từ ${a.name} sang ${data.accounts.find(x => x.id === target)?.name}`,
      amount: n,
      type: 'transfer',
      accountId: source,
      toAccountId: target,
      date: todayKey(),
      method: 'Chuyển khoản',
      note: 'Chuyển khoản nội bộ',
      status: 'completed'
    };

    await update(
      d => ({
        ...d,
        transactions: [tx, ...d.transactions]
      }),
      `Đã chuyển ${money(n)} giữa hai tài khoản`
    );
    setTransfer(false);
    setAmount('');
    setError('');
  };

  const totalBal = data.accounts.reduce((n, a) => n + balance(a, data.transactions), 0);

  return (
    <>
      <PageHead
        eyebrow="TÀI SẢN CỦA BẠN"
        title="Tài khoản"
        subtitle="Theo dõi số dư từ số dư đầu kỳ và lịch sử giao dịch."
        actions={
          <>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<ArrowLeftRight size={14} />}
              onClick={() => {
                setTransfer(true);
                setError('');
              }}
            >
              Chuyển tiền
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Plus size={14} />}
              onClick={() => start()}
            >
              Thêm tài khoản
            </Button>
          </>
        }
      />

      {/* Stats Summary */}
      <div className="grid-stats" style={{ marginBottom: 20 }}>
        <div className="card stat">
          <span className="stat-label">Tổng số dư</span>
          <div className="stat-value">{money(totalBal)}</div>
          <div className="stat-meta">{data.accounts.length} tài khoản đang quản lý</div>
        </div>
        {data.accounts.slice(0, 3).map(a => (
          <div className="card stat" key={a.id}>
            <div className="stat-top">
              <span className="stat-label">{a.name}</span>
              <span className="stat-icon" style={{ background: a.color + '20', color: a.color }}>
                <Wallet />
              </span>
            </div>
            <div className="stat-value">{money(balance(a, data.transactions))}</div>
            <div className="stat-meta">{kinds[a.type]}</div>
          </div>
        ))}
      </div>

      {/* Account Cards */}
      <div className="tiles">
        {data.accounts.map(a => {
          const currentBal = balance(a, data.transactions);
          return (
            <Card
              variant="outlined"
              className="card tile"
              key={a.id}
              sx={{ borderRadius: 3, p: 2.5 }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: a.color + '20',
                    color: a.color
                  }}
                >
                  <Wallet size={20} />
                </Box>
                <Chip
                  label={a.active ? 'Hoạt động' : 'Đã khóa'}
                  size="small"
                  color={a.active ? 'success' : 'default'}
                  variant="outlined"
                  sx={{ height: 22, fontSize: 11, fontWeight: 700 }}
                />
              </Box>

              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.25 }}>
                {a.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                {kinds[a.type]} · Từ {dateLabel(a.createdAt)}
              </Typography>

              <Typography variant="h5" sx={{ fontWeight: 900, color: 'text.primary', mb: 2 }}>
                {money(currentBal)}
              </Typography>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* 1-Click Balance Reconciliation Button */}
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  startIcon={<Scale size={14} />}
                  onClick={() => setReconcileAccount(a)}
                  sx={{ fontWeight: 700, fontSize: 11 }}
                >
                  Cân bằng số dư
                </Button>

                <Button
                  size="small"
                  variant="text"
                  color="inherit"
                  startIcon={<History size={14} />}
                  onClick={() => setHistory(a)}
                  sx={{ fontSize: 11 }}
                >
                  Lịch sử
                </Button>

                <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
                  <IconButton size="small" onClick={() => start(a)} aria-label="Sửa tài khoản">
                    <Pencil size={14} />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => setDeleting(a)}
                    aria-label="Xóa tài khoản"
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </Box>
              </Box>
            </Card>
          );
        })}
      </div>

      {/* 1-Click Balance Reconciliation Modal */}
      <ReconcileDialog
        account={reconcileAccount}
        open={!!reconcileAccount}
        onClose={() => setReconcileAccount(null)}
      />

      {/* Add / Edit Account Modal */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {edit ? 'Sửa thông tin tài khoản' : 'Thêm tài khoản mới'}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2, pt: '16px !important' }}>
          {error && <Alert severity="error">{error}</Alert>}
          <MuiTextField
            label="Tên tài khoản"
            placeholder="VD: Vietcombank, Ví MoMo, Tiền mặt"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
            autoFocus
          />
          <MuiSelect
            label="Loại tài khoản"
            value={form.type}
            onChange={val => setForm({ ...form, type: val as Account['type'] })}
            options={Object.entries(kinds).map(([k, v]) => ({ value: k, label: v }))}
          />
          <MuiCurrencyInput
            label="Số dư đầu kỳ (₫)"
            value={form.openingBalance}
            onChange={val => setForm({ ...form, openingBalance: val })}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
              Màu đại diện:
            </Typography>
            <Box
              component="input"
              type="color"
              value={form.color}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm({ ...form, color: e.target.value })
              }
              sx={{
                width: 44,
                height: 36,
                border: 'none',
                borderRadius: 2,
                cursor: 'pointer',
                p: 0
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Hủy</Button>
          <Button variant="contained" color="primary" onClick={save}>
            Lưu tài khoản
          </Button>
        </DialogActions>
      </Dialog>

      {/* Internal Transfer Modal */}
      <Dialog open={transfer} onClose={() => setTransfer(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Chuyển tiền nội bộ</DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2, pt: '16px !important' }}>
          {error && <Alert severity="error">{error}</Alert>}
          <MuiSelect
            label="Từ tài khoản"
            value={source}
            onChange={val => setSource(val)}
            options={data.accounts
              .filter(a => a.active)
              .map(a => ({
                value: a.id,
                label: a.name,
                subtitle: `Số dư: ${money(balance(a, data.transactions))}`
              }))}
          />
          <MuiSelect
            label="Đến tài khoản"
            value={target}
            onChange={val => setTarget(val)}
            options={data.accounts
              .filter(a => a.active)
              .map(a => ({
                value: a.id,
                label: a.name,
                subtitle: `Số dư: ${money(balance(a, data.transactions))}`
              }))}
          />
          <MuiCurrencyInput
            label="Số tiền chuyển (₫)"
            value={amount}
            onChange={val => setAmount(val)}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            Chuyển tiền nội bộ chỉ thay đổi số dư giữa 2 tài khoản, không làm thay đổi thu nhập hay chi tiêu tiêu dùng.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTransfer(false)}>Hủy</Button>
          <Button variant="contained" color="primary" onClick={send}>
            Chuyển tiền
          </Button>
        </DialogActions>
      </Dialog>

      {/* Account History Modal */}
      <Dialog open={!!history} onClose={() => setHistory(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Lịch sử giao dịch · {history?.name || ''}
        </DialogTitle>
        <DialogContent dividers>
          <div className="mini-list">
            {data.transactions
              .filter(t => t.accountId === history?.id || t.toAccountId === history?.id)
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 15)
              .map(t => (
                <div className="mini-row" key={t.id}>
                  <div>
                    <div className="mini-name">{t.name}</div>
                    <div className="mini-sub">{dateLabel(t.date)}</div>
                  </div>
                  <strong
                    className={
                      t.type === 'income' || t.toAccountId === history?.id
                        ? 'positive'
                        : 'negative'
                    }
                  >
                    {t.type === 'income' || t.toAccountId === history?.id ? '+' : '-'}
                    {money(t.amount)}
                  </strong>
                </div>
              ))}
          </div>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setHistory(null)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Account */}
      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          const used =
            data.transactions.some(
              t => t.accountId === deleting.id || t.toAccountId === deleting.id
            ) ||
            data.goals.some(g => g.accountId === deleting.id) ||
            data.recurring.some(r => r.accountId === deleting.id);

          if (used) {
            notify('Tài khoản có giao dịch hoặc kế hoạch liên quan nên không thể xóa');
            return;
          }
          update(d => ({
            ...d,
            accounts: d.accounts.filter(a => a.id !== deleting.id)
          }));
        }}
        message={`Xóa tài khoản “${deleting?.name || ''}”? Tài khoản đã có giao dịch sẽ được giữ lại để bảo toàn lịch sử.`}
      />
    </>
  );
}
