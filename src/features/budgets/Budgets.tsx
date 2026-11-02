import React, { useState } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
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
import { budgetSpent, money, monthKey, uid } from '../../lib/finance';
import { Confirm, PageHead, Progress } from '../../components/ui';
import { canAddBudget } from '../../lib/subscription';
import {
  MuiTextField,
  MuiSelect,
  MuiCurrencyInput,
  MuiMonthPicker
} from '../../components/mui/MuiInputs';
import type { Budget } from '../../types';

export default function Budgets() {
  const data = useFinance(s => s.data)!;
  const update = useFinance(s => s.update);
  const openPricing = useFinance(s => s.openPricing);

  const current = monthKey(new Date());
  const [month, setMonth] = useState(current);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Budget | null>(null);
  const [deleting, setDeleting] = useState<Budget | null>(null);
  const [form, setForm] = useState({ name: '', categoryId: '', limit: '', month: current });
  const [error, setError] = useState('');

  const budgets = data.budgets.filter(b => b.month === month);

  const start = (b?: Budget) => {
    if (!b && !canAddBudget(data)) {
      openPricing('Gói Free hỗ trợ tối đa 3 ngân sách. Nâng cấp Pro để thiết lập ngân sách không giới hạn!');
      return;
    }
    setEdit(b || null);
    setForm(
      b
        ? {
            name: b.name,
            categoryId: b.categoryId || '',
            limit: String(b.limit),
            month: b.month
          }
        : { name: '', categoryId: '', limit: '', month }
    );
    setError('');
    setOpen(true);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const limit = Number(form.limit);
    if (!form.name.trim() || !Number.isInteger(limit) || limit <= 0) {
      setError('Nhập tên và hạn mức hợp lệ');
      return;
    }

    update(d => ({
      ...d,
      budgets: edit
        ? d.budgets.map(b =>
            b.id === edit.id ? { ...b, ...form, categoryId: form.categoryId || undefined, limit } : b
          )
        : [
            ...d.budgets,
            {
              id: uid(),
              name: form.name.trim(),
              categoryId: form.categoryId || undefined,
              limit,
              month: form.month
            }
          ]
    }));
    setOpen(false);
  };

  const total = budgets.find(b => !b.categoryId);
  const spent = total ? budgetSpent(total, data.transactions) : 0;

  return (
    <>
      <PageHead
        eyebrow="KIỂM SOÁT CHI TIÊU"
        title="Ngân sách"
        subtitle="Theo dõi mức đã dùng từ các giao dịch chi tiêu thực tế."
        actions={
          <>
            <MuiMonthPicker
              label="Chọn tháng"
              value={month}
              onChange={val => setMonth(val)}
            />
            <Button
              variant="contained"
              color="primary"
              startIcon={<Plus size={14} />}
              onClick={() => start()}
            >
              Tạo ngân sách
            </Button>
          </>
        }
      />

      {/* Stats Summary */}
      <div className="grid-stats" style={{ marginBottom: 20 }}>
        <div className="card stat">
          <span className="stat-label">Tổng hạn mức</span>
          <div className="stat-value">
            {money(
              total?.limit ||
                budgets.filter(b => b.categoryId).reduce((n, b) => n + b.limit, 0)
            )}
          </div>
          <div className="stat-meta">Tháng {month}</div>
        </div>
        <div className="card stat">
          <span className="stat-label">Đã chi</span>
          <div className="stat-value">
            {money(
              spent ||
                data.transactions
                  .filter(
                    t =>
                      t.type === 'expense' &&
                      t.status === 'completed' &&
                      t.date.startsWith(month)
                  )
                  .reduce((n, t) => n + t.amount, 0)
            )}
          </div>
          <div className="stat-meta">Giao dịch hoàn tất</div>
        </div>
        <div className="card stat">
          <span className="stat-label">Còn lại</span>
          <div className="stat-value">
            {money(Math.max(0, (total?.limit || 0) - spent))}
          </div>
          <div className="stat-meta">Theo ngân sách tổng</div>
        </div>
        <div className="card stat">
          <span className="stat-label">Cảnh báo</span>
          <div className="stat-value">
            {budgets.filter(b => budgetSpent(b, data.transactions) / b.limit >= 0.8).length}
          </div>
          <div className="stat-meta">Đạt từ 80% hạn mức</div>
        </div>
      </div>

      {/* Budget Tiles */}
      <div className="tiles">
        {budgets.map(b => {
          const n = budgetSpent(b, data.transactions);
          const pct = (n / b.limit) * 100;
          return (
            <Card
              variant="outlined"
              className="card tile"
              key={b.id}
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
                    bgcolor: pct >= 100 ? '#fef0ef' : pct >= 80 ? '#fff3e1' : '#e9f9f2',
                    color: pct >= 100 ? '#dc2626' : pct >= 80 ? '#d97706' : '#059669'
                  }}
                >
                  <AlertTriangle size={18} />
                </Box>
                <Chip
                  label={pct >= 100 ? 'Vượt hạn mức' : pct >= 80 ? 'Sắp đạt' : 'Bình thường'}
                  size="small"
                  color={pct >= 100 ? 'error' : pct >= 80 ? 'warning' : 'success'}
                  variant="outlined"
                  sx={{ height: 22, fontSize: 11, fontWeight: 700 }}
                />
              </Box>

              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.25 }}>
                {b.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                {b.categoryId
                  ? data.categories.find(c => c.id === b.categoryId)?.name
                  : 'Tất cả danh mục'}{' '}
                · Tháng {b.month}
              </Typography>

              <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>
                {money(n)}{' '}
                <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontSize: 12 }}>
                  / {money(b.limit)}
                </Typography>
              </Typography>

              <Progress
                value={pct}
                color={pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981'}
              />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, fontSize: 11, color: 'text.secondary' }}>
                <span>{Math.round(pct)}% đã dùng</span>
                <span>Còn {money(Math.max(0, b.limit - n))}</span>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mt: 2, alignItems: 'center' }}>
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  startIcon={<Pencil size={14} />}
                  onClick={() => start(b)}
                >
                  Sửa
                </Button>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => setDeleting(b)}
                  aria-label="Xóa ngân sách"
                  sx={{ ml: 'auto' }}
                >
                  <Trash2 size={14} />
                </IconButton>
              </Box>
            </Card>
          );
        })}
        {budgets.length === 0 && (
          <Box sx={{ gridColumn: '1 / -1', p: 4, textAlign: 'center', color: 'text.secondary' }}>
            Chưa có ngân sách trong tháng này. Hãy tạo ngân sách để kiểm soát chi tiêu!
          </Box>
        )}
      </div>

      {/* Add / Edit Budget Modal */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {edit ? 'Sửa ngân sách' : 'Tạo ngân sách mới'}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2, pt: '16px !important' }}>
          {error && <Alert severity="error">{error}</Alert>}
          <MuiTextField
            label="Tên ngân sách"
            placeholder="Ví dụ: Ăn uống, Di chuyển, Tổng chi tiêu"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
            autoFocus
          />
          <MuiSelect
            label="Danh mục áp dụng"
            value={form.categoryId}
            onChange={val => setForm({ ...form, categoryId: val })}
            options={[
              { value: '', label: 'Tất cả danh mục (Ngân sách tổng)' },
              ...data.categories
                .filter(c => c.type === 'expense' && !c.hidden)
                .map(c => ({ value: c.id, label: c.name }))
            ]}
          />
          <MuiMonthPicker
            label="Tháng áp dụng"
            value={form.month}
            onChange={val => setForm({ ...form, month: val })}
          />
          <MuiCurrencyInput
            label="Hạn mức ngân sách (₫)"
            value={form.limit}
            onChange={val => setForm({ ...form, limit: val })}
            required
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Hủy</Button>
          <Button variant="contained" color="primary" onClick={save}>
            Lưu ngân sách
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
              budgets: d.budgets.filter(b => b.id !== deleting.id)
            }));
          }
        }}
        title="Xác nhận xóa ngân sách"
        message={`Xóa ngân sách “${deleting?.name || ''}”? Các giao dịch thực tế sẽ được giữ nguyên.`}
      />
    </>
  );
}
