import React, { useState } from 'react';
import {
  Plus,
  ArrowLeftRight,
  Wallet,
  Pencil,
  Trash2,
  History,
  Scale,
  Users
} from 'lucide-react';
import {
  Box,
  Button,
  Card,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  FormControlLabel,
  Switch
} from '@mui/material';

import { useFinance } from '../../store';
import { balance, dateLabel, money, uid, todayKey } from '../../lib/finance';
import { Confirm, PageHead } from '../../components/ui';
import { ReconcileDialog } from '../../components/ReconcileDialog';
import { canAddAccount } from '../../lib/subscription';
import { MuiTextField, MuiSelect, MuiCurrencyInput } from '../../components/mui/MuiInputs';
import { BankLogoBadge } from '../../lib/brandBadges';
import { ItemActionMenu } from '../../components/ItemActionMenu';
import type { Account, Transaction } from '../../types';

const kinds: Record<Account['type'], string> = {
  bank: 'Ngân hàng',
  cash: 'Tiền mặt',
  ewallet: 'Ví điện tử',
  savings: 'Tiết kiệm',
  investment: 'Đầu tư',
  credit_card: 'Thẻ tín dụng / BNPL'
};

const blank = {
  name: '',
  type: 'bank' as Account['type'],
  openingBalance: '0',
  color: '#10b981',
  creditLimit: '50000000',
  statementDay: '20',
  dueDay: '5',
  interestRate: '28',
  isShared: false,
  sharedMembers: 'Bạn, Vợ/Chồng',
  sharedGoalName: 'Quỹ chi tiêu gia đình'
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
            color: a.color,
            creditLimit: String(a.creditLimit || '50000000'),
            statementDay: String(a.statementDay || '20'),
            dueDay: String(a.dueDay || '5'),
            interestRate: String(a.interestRate || '28'),
            isShared: !!a.isShared,
            sharedMembers: a.sharedMembers?.join(', ') || 'Bạn, Vợ/Chồng',
            sharedGoalName: a.sharedGoalName || ''
          }
        : blank
    );
    setError('');
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const opening = Number(form.openingBalance);
    if (!form.name.trim() || !Number.isInteger(opening)) {
      setError('Nhập tên và số dư đầu kỳ hợp lệ');
      return;
    }

    const isCredit = form.type === 'credit_card';

    await update(
      d => ({
        ...d,
        accounts: edit
          ? d.accounts.map(a =>
              a.id === edit.id
                ? {
                    ...a,
                    ...form,
                    openingBalance: opening,
                    creditLimit: isCredit ? Number(form.creditLimit) : undefined,
                    statementDay: isCredit ? Number(form.statementDay) : undefined,
                    dueDay: isCredit ? Number(form.dueDay) : undefined,
                    interestRate: isCredit ? Number(form.interestRate) : undefined,
                    isShared: form.isShared,
                    sharedMembers: form.isShared
                      ? form.sharedMembers.split(',').map((s: string) => s.trim()).filter(Boolean)
                      : undefined,
                    sharedGoalName: form.isShared ? form.sharedGoalName.trim() : undefined
                  }
                : a
            )
          : [
              ...d.accounts,
              {
                id: uid(),
                name: form.name.trim(),
                type: form.type,
                openingBalance: opening,
                color: form.color,
                createdAt: todayKey(),
                active: true,
                creditLimit: isCredit ? Number(form.creditLimit) : undefined,
                statementDay: isCredit ? Number(form.statementDay) : undefined,
                dueDay: isCredit ? Number(form.dueDay) : undefined,
                interestRate: isCredit ? Number(form.interestRate) : undefined,
                isShared: form.isShared,
                sharedMembers: form.isShared
                  ? form.sharedMembers.split(',').map((s: string) => s.trim()).filter(Boolean)
                  : undefined,
                sharedGoalName: form.isShared ? form.sharedGoalName.trim() : undefined
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
              <span className="stat-icon" style={{ background: 'transparent', color: a.color }}>
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
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <BankLogoBadge accountName={a.name} accountType={a.type} size="large" />
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.75 }}>
                  <Chip
                    label={a.active ? 'Hoạt động' : 'Đã khóa'}
                    size="small"
                    color={a.active ? 'success' : 'default'}
                    variant="outlined"
                    sx={{ height: 22, fontSize: 10.5, fontWeight: 700 }}
                  />
                  {a.isShared && (
                    <Chip
                      icon={<Users size={12} color="#059669" />}
                      label="Quỹ chung"
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ height: 22, fontSize: 10, fontWeight: 700 }}
                    />
                  )}
                </Box>
              </Box>

              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.25 }}>
                {a.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                {kinds[a.type]} · Từ {dateLabel(a.createdAt)}
              </Typography>

              {a.type === 'credit_card' ? (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 650 }}>
                      Dư nợ hiện tại:
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#ef4444' }}>
                      {money(Math.abs(Math.min(0, currentBal)))}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', mb: 0.5 }}>
                    <span>Khả dụng: {money(Math.max(0, (a.creditLimit || 0) + currentBal))}</span>
                    <span>Hạn mức: {money(a.creditLimit || 0)}</span>
                  </Box>
                  {(() => {
                    const used = Math.abs(Math.min(0, currentBal));
                    const limit = a.creditLimit || 1;
                    const pct = Math.min(100, Math.round((used / limit) * 100));
                    return (
                      <Box sx={{ mt: 0.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, mb: 0.25 }}>
                          <span style={{ color: 'var(--text-muted)' }}>Tỷ lệ sử dụng tín dụng:</span>
                          <strong style={{ color: pct > 70 ? '#ef4444' : pct > 40 ? '#f59e0b' : '#10b981' }}>{pct}%</strong>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: 'action.hover',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: pct > 70 ? '#ef4444' : pct > 40 ? '#f59e0b' : '#10b981',
                              borderRadius: 3
                            }
                          }}
                        />
                      </Box>
                    );
                  })()}
                  <Box sx={{ display: 'flex', gap: 1, mt: 1.25, flexWrap: 'wrap' }}>
                    <Chip label={`Sao kê: Ngày ${a.statementDay || 20}`} size="small" sx={{ fontSize: 10.5, height: 20 }} />
                    <Chip label={`Hạn nộp: Ngày ${a.dueDay || 5}`} size="small" color="error" variant="outlined" sx={{ fontSize: 10.5, height: 20, fontWeight: 700 }} />
                    {a.interestRate && (
                      <Chip label={`Lãi phạt: ${a.interestRate}%/năm`} size="small" sx={{ fontSize: 10.5, height: 20 }} />
                    )}
                  </Box>
                </Box>
              ) : (
                <Typography variant="h5" sx={{ fontWeight: 900, color: 'text.primary', mb: 2 }}>
                  {money(currentBal)}
                </Typography>
              )}

              {/* Action Buttons: 1 Nút chính + Nút More gọn gàng */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', pt: 1.5, borderTop: '1px solid var(--border-subtle)' }}>
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  startIcon={<Scale size={14} />}
                  onClick={() => setReconcileAccount(a)}
                  sx={{ fontWeight: 600, fontSize: 11, borderRadius: 1.5 }}
                >
                  Cân bằng số dư
                </Button>

                <ItemActionMenu
                  ariaLabel={`Tùy chọn tài khoản ${a.name}`}
                  items={[
                    {
                      label: 'Lịch sử giao dịch',
                      icon: <History size={15} />,
                      onClick: () => setHistory(a)
                    },
                    {
                      label: 'Chỉnh sửa tài khoản',
                      icon: <Pencil size={15} />,
                      onClick: () => start(a)
                    },
                    {
                      label: 'Xóa tài khoản',
                      icon: <Trash2 size={15} />,
                      color: 'error',
                      onClick: () => setDeleting(a)
                    }
                  ]}
                />
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
            placeholder="VD: Vietcombank, Thẻ Visa VCB, Ví MoMo, Tiền mặt"
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
            label={form.type === 'credit_card' ? 'Dư nợ đầu kỳ (0 nếu mới)' : 'Số dư đầu kỳ (₫)'}
            value={form.openingBalance}
            onChange={val => setForm({ ...form, openingBalance: val })}
          />

          {form.type === 'credit_card' && (
            <>
              <MuiCurrencyInput
                label="Hạn mức tín dụng (₫)"
                value={form.creditLimit}
                onChange={val => setForm({ ...form, creditLimit: val })}
              />
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <MuiTextField
                  label="Ngày sao kê (1-31)"
                  type="number"
                  value={form.statementDay}
                  onChange={e => setForm({ ...form, statementDay: e.target.value })}
                  placeholder="20"
                />
                <MuiTextField
                  label="Ngày đến hạn (1-31)"
                  type="number"
                  value={form.dueDay}
                  onChange={e => setForm({ ...form, dueDay: e.target.value })}
                  placeholder="5"
                />
              </Box>
              <MuiTextField
                label="Lãi suất quá hạn (%/năm)"
                type="number"
                value={form.interestRate}
                onChange={e => setForm({ ...form, interestRate: e.target.value })}
                placeholder="28"
              />
            </>
          )}

          <Box sx={{ display: 'grid', gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
              Màu sắc nhận diện:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {['#10b981', '#3b82f6', '#0284c7', '#ec4899', '#f59e0b', '#ef4444', '#06b6d4', '#64748b'].map(c => (
                <Box
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    bgcolor: c,
                    cursor: 'pointer',
                    border: form.color === c ? '3px solid #fff' : '2px solid transparent',
                    boxShadow: form.color === c ? '0 0 0 2px ' + c : 'none',
                    transition: 'transform 0.1s',
                    '&:hover': { transform: 'scale(1.15)' }
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* Shared Wallet Section */}
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover', border: '1px solid var(--border-subtle)' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.isShared}
                  onChange={e => setForm({ ...form, isShared: e.target.checked })}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Users size={16} color="#059669" />
                    <span>Ví dùng chung / Quỹ nhóm (Shared Wallet)</span>
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Dành cho quỹ gia đình, nhóm bạn đi du lịch, chi tiêu chung
                  </Typography>
                </Box>
              }
            />

            {form.isShared && (
              <Box sx={{ mt: 1.5, display: 'grid', gap: 1.5 }}>
                <MuiTextField
                  label="Tên / Mục tiêu quỹ chung"
                  placeholder="Ví dụ: Quỹ gia đình, Quỹ du lịch Phú Quốc"
                  value={form.sharedGoalName}
                  onChange={e => setForm({ ...form, sharedGoalName: e.target.value })}
                />
                <MuiTextField
                  label="Thành viên tham gia (phân cách bằng dấu phẩy)"
                  placeholder="Ví dụ: Bạn, Vợ/Chồng, Nam, Hùng"
                  value={form.sharedMembers}
                  onChange={e => setForm({ ...form, sharedMembers: e.target.value })}
                />
              </Box>
            )}
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
