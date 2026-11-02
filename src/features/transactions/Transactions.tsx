import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import {
  Search,
  Plus,
  Download,
  Eye,
  Pencil,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight
} from 'lucide-react';
import {
  Box,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Alert
} from '@mui/material';

import { useFinance } from '../../store';
import { balance, dateLabel, downloadCsv, money, uid, todayKey } from '../../lib/finance';
import { Confirm, Empty, PageHead } from '../../components/ui';
import {
  MuiTextField,
  MuiCurrencyInput,
  MuiSelect,
  MuiDatePicker,
  MuiTransactionTypeToggle
} from '../../components/mui/MuiInputs';
import type { Transaction, TxType } from '../../types';

type FormValues = {
  name: string;
  amount: string;
  type: TxType;
  categoryId: string;
  accountId: string;
  toAccountId: string;
  date: string;
  method: string;
  note: string;
  status: 'completed' | 'pending';
};

const schema = z.object({
  name: z.string().trim().min(2, 'Tên cần ít nhất 2 ký tự'),
  amount: z.coerce.number<number>().int().positive('Số tiền phải lớn hơn 0'),
  date: z.string().min(1, 'Vui lòng chọn ngày')
});

export default function Transactions() {
  const data = useFinance(s => s.data)!;
  const update = useFinance(s => s.update);

  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [open, setOpen] = useState(params.get('add') === '1');

  // Filters
  const [search, setSearch] = useState(params.get('search') || '');
  const [type, setType] = useState('all');
  const [category, setCategory] = useState('all');
  const [account, setAccount] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState('new');
  const [page, setPage] = useState(0); // MUI TablePagination is 0-indexed
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [formError, setFormError] = useState('');

  const defaults: FormValues = {
    name: '',
    amount: '',
    type: 'expense',
    categoryId: 'food',
    accountId: data.accounts[0]?.id || '',
    toAccountId: '',
    date: todayKey(),
    method: 'Chuyển khoản',
    note: '',
    status: 'completed'
  };

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: defaults
  });

  const formType = watch('type');

  useEffect(() => {
    if (params.get('add') === '1') setOpen(true);
    if (params.has('search')) {
      setSearch(params.get('search') || '');
      setPage(0);
    }
  }, [params]);

  const close = () => {
    setOpen(false);
    setEditing(null);
    setFormError('');
    setParams({});
  };

  const startEdit = (t: Transaction) => {
    setEditing(t);
    reset({
      name: t.name,
      amount: String(t.amount),
      type: t.type,
      categoryId: t.categoryId || 'food',
      accountId: t.accountId,
      toAccountId: t.toAccountId || '',
      date: t.date,
      method: t.method,
      note: t.note || '',
      status: t.status
    });
    setOpen(true);
  };

  const filtered = useMemo(
    () =>
      data.transactions
        .filter(
          t =>
            (t.name + ' ' + t.note).toLowerCase().includes(search.toLowerCase()) &&
            (type === 'all' || t.type === type) &&
            (category === 'all' || t.categoryId === category) &&
            (account === 'all' || t.accountId === account || t.toAccountId === account) &&
            (!from || t.date >= from) &&
            (!to || t.date <= to)
        )
        .sort((a, b) =>
          sort === 'old'
            ? a.date.localeCompare(b.date)
            : sort === 'high'
            ? b.amount - a.amount
            : sort === 'low'
            ? a.amount - b.amount
            : b.date.localeCompare(a.date)
        ),
    [data.transactions, search, type, category, account, from, to, sort]
  );

  const paginatedList = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const save = handleSubmit(async values => {
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message || 'Dữ liệu chưa hợp lệ');
      return;
    }
    if (values.type === 'transfer' && (!values.toAccountId || values.toAccountId === values.accountId)) {
      setFormError('Chọn tài khoản nhận khác tài khoản gửi');
      return;
    }

    const selectedCategory =
      data.categories.find(c => c.id === values.categoryId && c.type === values.type && !c.hidden)?.id ||
      data.categories.find(c => c.type === values.type && !c.hidden)?.id;

    if (values.type !== 'transfer' && !selectedCategory) {
      setFormError('Vui lòng chọn danh mục hợp lệ');
      return;
    }

    const tx: Transaction = {
      id: editing?.id || uid(),
      name: values.name.trim(),
      amount: parsed.data.amount,
      type: values.type,
      categoryId: values.type === 'transfer' ? undefined : selectedCategory,
      accountId: values.accountId,
      toAccountId: values.type === 'transfer' ? values.toAccountId : undefined,
      date: values.date,
      method: values.method,
      note: values.note || '',
      status: values.status
    };

    await update(
      d => ({
        ...d,
        transactions: editing
          ? d.transactions.map(t => (t.id === editing.id ? tx : t))
          : [tx, ...d.transactions]
      }),
      editing ? 'Đã cập nhật giao dịch' : 'Đã thêm giao dịch mới'
    );

    close();
    reset(defaults);
  });

  const exportRows = [
    ['ID', 'Tên', 'Số tiền', 'Loại', 'Danh mục', 'Tài khoản', 'Ngày', 'Phương thức', 'Ghi chú', 'Trạng thái'],
    ...filtered.map(t => [
      t.id,
      t.name,
      t.amount,
      t.type,
      data.categories.find(c => c.id === t.categoryId)?.name || '',
      data.accounts.find(a => a.id === t.accountId)?.name || '',
      t.date,
      t.method,
      t.note,
      t.status
    ])
  ];

  return (
    <>
      <PageHead
        eyebrow="DÒNG TIỀN"
        title="Giao dịch"
        subtitle={`${data.transactions.length} giao dịch trong sổ tài chính của bạn`}
        actions={
          <>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<Download size={14} />}
              onClick={() => downloadCsv('finora-giao-dich.csv', exportRows)}
            >
              Xuất CSV
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Plus size={14} />}
              onClick={() => {
                reset(defaults);
                setEditing(null);
                setOpen(true);
              }}
            >
              Thêm giao dịch
            </Button>
          </>
        }
      />

      {/* MUI Filter Bar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: '2fr 1fr 1fr 1fr 1fr'
            },
            gap: 1.5,
            mb: 1.5
          }}
        >
          <MuiTextField
            placeholder="Tìm theo tên hoặc ghi chú..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(0);
            }}
            slotProps={{
              input: {
                startAdornment: <Search size={16} style={{ marginRight: 8, color: '#94a3b8' }} />
              }
            }}
          />

          <MuiSelect
            label="Loại"
            value={type}
            onChange={val => {
              setType(val);
              setPage(0);
            }}
            options={[
              { value: 'all', label: 'Tất cả loại' },
              { value: 'expense', label: 'Chi tiêu' },
              { value: 'income', label: 'Thu nhập' },
              { value: 'transfer', label: 'Chuyển khoản' }
            ]}
          />

          <MuiSelect
            label="Danh mục"
            value={category}
            onChange={val => {
              setCategory(val);
              setPage(0);
            }}
            options={[
              { value: 'all', label: 'Tất cả danh mục' },
              ...data.categories.map(c => ({ value: c.id, label: c.name }))
            ]}
          />

          <MuiSelect
            label="Tài khoản"
            value={account}
            onChange={val => {
              setAccount(val);
              setPage(0);
            }}
            options={[
              { value: 'all', label: 'Tất cả tài khoản' },
              ...data.accounts.map(a => ({
                value: a.id,
                label: a.name,
                subtitle: `${money(balance(a, data.transactions))}`
              }))
            ]}
          />

          <MuiSelect
            label="Sắp xếp"
            value={sort}
            onChange={val => setSort(val)}
            options={[
              { value: 'new', label: 'Mới nhất' },
              { value: 'old', label: 'Cũ nhất' },
              { value: 'high', label: 'Số tiền giảm dần' },
              { value: 'low', label: 'Số tiền tăng dần' }
            ]}
          />
        </Box>

        {/* Date Filters */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ minWidth: 160 }}>
            <MuiDatePicker
              label="Từ ngày"
              value={from}
              onChange={val => {
                setFrom(val);
                setPage(0);
              }}
            />
          </Box>
          <Box sx={{ minWidth: 160 }}>
            <MuiDatePicker
              label="Đến ngày"
              value={to}
              onChange={val => {
                setTo(val);
                setPage(0);
              }}
            />
          </Box>
          {(from || to || search || type !== 'all' || category !== 'all' || account !== 'all') && (
            <Button
              size="small"
              color="inherit"
              onClick={() => {
                setSearch('');
                setType('all');
                setCategory('all');
                setAccount('all');
                setFrom('');
                setTo('');
                setPage(0);
              }}
              sx={{ alignSelf: 'center', fontSize: 12 }}
            >
              Đặt lại bộ lọc
            </Button>
          )}
        </Box>
      </Paper>

      {/* MUI Table View */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {paginatedList.length ? (
          <Table size="small">
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Giao dịch</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Danh mục</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Tài khoản</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Ngày</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Số tiền
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>
                  Thao tác
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedList.map(t => (
                <TableRow key={t.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <Box
                        sx={{
                          width: 30,
                          height: 30,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor:
                            t.type === 'income'
                              ? 'rgba(16, 185, 129, 0.1)'
                              : t.type === 'transfer'
                              ? 'rgba(59, 130, 246, 0.1)'
                              : 'rgba(239, 68, 68, 0.1)',
                          color:
                            t.type === 'income'
                              ? '#059669'
                              : t.type === 'transfer'
                              ? '#3b82f6'
                              : '#ef4444'
                        }}
                      >
                        {t.type === 'income' ? (
                          <ArrowDownLeft size={16} />
                        ) : t.type === 'transfer' ? (
                          <ArrowLeftRight size={16} />
                        ) : (
                          <ArrowUpRight size={16} />
                        )}
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {t.name}
                        </Typography>
                        {t.note && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                            {t.note}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>

                  <TableCell sx={{ fontSize: 13 }}>
                    <Chip
                      label={data.categories.find(c => c.id === t.categoryId)?.name || 'Chuyển khoản'}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: 11, height: 22 }}
                    />
                  </TableCell>

                  <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>
                    {data.accounts.find(a => a.id === t.accountId)?.name}
                    {t.toAccountId && (
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>
                        {' → ' + data.accounts.find(a => a.id === t.toAccountId)?.name}
                      </span>
                    )}
                  </TableCell>

                  <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>
                    {dateLabel(t.date)}
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={t.status === 'completed' ? 'Hoàn tất' : 'Chờ xử lý'}
                      size="small"
                      color={t.status === 'completed' ? 'success' : 'warning'}
                      variant="outlined"
                      sx={{ fontSize: 11, height: 22, fontWeight: 600 }}
                    />
                  </TableCell>

                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 800,
                        color:
                          t.type === 'income'
                            ? '#059669'
                            : t.type === 'expense'
                            ? '#ef4444'
                            : 'inherit'
                      }}
                    >
                      {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}
                      {money(t.amount)}
                    </Typography>
                  </TableCell>

                  <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => setDetail(t)} aria-label="Chi tiết">
                        <Eye size={15} />
                      </IconButton>
                      <IconButton size="small" onClick={() => startEdit(t)} aria-label="Sửa">
                        <Pencil size={15} />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleting(t)}
                        aria-label="Xóa"
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Empty text="Không có giao dịch phù hợp. Hãy thử điều chỉnh bộ lọc hoặc thêm mới." />
        )}

        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="Số hàng mỗi trang:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} trên ${count}`}
        />
      </TableContainer>

      {/* MUI Modal: Add / Edit Transaction */}
      <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, fontSize: 18 }}>
          {editing ? 'Sửa giao dịch' : 'Thêm giao dịch mới'}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2, pt: '16px !important' }}>
          {formError && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {formError}
            </Alert>
          )}

          {/* Toggle Type */}
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <MuiTransactionTypeToggle
                value={field.value}
                onChange={val => field.onChange(val)}
              />
            )}
          />

          {/* Transaction Name */}
          <Controller
            name="name"
            control={control}
            rules={{ required: 'Vui lòng nhập tên giao dịch' }}
            render={({ field }) => (
              <MuiTextField
                label="Tên giao dịch"
                placeholder="VD: Mua thực phẩm, Ăn trưa..."
                value={field.value}
                onChange={field.onChange}
                error={!!errors.name}
                helperText={errors.name?.message}
                autoFocus
              />
            )}
          />

          {/* Amount with Smart VND Denominations */}
          <Controller
            name="amount"
            control={control}
            rules={{ required: 'Vui lòng nhập số tiền' }}
            render={({ field }) => (
              <MuiCurrencyInput
                label="Số tiền (₫)"
                value={field.value}
                onChange={val => field.onChange(val)}
                error={!!errors.amount}
                helperText={errors.amount?.message}
              />
            )}
          />

          {/* Category Select (with color dot) */}
          {formType !== 'transfer' && (
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <MuiSelect
                  label="Danh mục"
                  value={field.value}
                  onChange={field.onChange}
                  options={data.categories
                    .filter(c => c.type === formType && !c.hidden)
                    .map(c => ({
                      value: c.id,
                      label: c.name,
                      icon: (
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: c.color,
                            flexShrink: 0
                          }}
                        />
                      )
                    }))}
                />
              )}
            />
          )}

          {/* Source Account (with balance) */}
          <Controller
            name="accountId"
            control={control}
            render={({ field }) => (
              <MuiSelect
                label={formType === 'transfer' ? 'Tài khoản gửi' : 'Tài khoản thanh toán'}
                value={field.value}
                onChange={field.onChange}
                options={data.accounts
                  .filter(a => a.active)
                  .map(a => ({
                    value: a.id,
                    label: a.name,
                    subtitle: `Số dư: ${money(balance(a, data.transactions))}`
                  }))}
              />
            )}
          />

          {/* Target Account for Transfer */}
          {formType === 'transfer' && (
            <Controller
              name="toAccountId"
              control={control}
              render={({ field }) => (
                <MuiSelect
                  label="Tài khoản nhận"
                  value={field.value}
                  onChange={field.onChange}
                  options={data.accounts
                    .filter(a => a.active)
                    .map(a => ({
                      value: a.id,
                      label: a.name,
                      subtitle: `Số dư: ${money(balance(a, data.transactions))}`
                    }))}
                />
              )}
            />
          )}

          {/* Date Picker */}
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <MuiDatePicker
                label="Ngày giao dịch"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />

          {/* Method & Status */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Controller
              name="method"
              control={control}
              render={({ field }) => (
                <MuiSelect
                  label="Phương thức"
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: 'Chuyển khoản', label: 'Chuyển khoản' },
                    { value: 'Tiền mặt', label: 'Tiền mặt' },
                    { value: 'Ví điện tử', label: 'Ví điện tử' },
                    { value: 'Thẻ', label: 'Thẻ tín dụng / ghi nợ' }
                  ]}
                />
              )}
            />

            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <MuiSelect
                  label="Trạng thái"
                  value={field.value}
                  onChange={val => field.onChange(val as 'completed' | 'pending')}
                  options={[
                    { value: 'completed', label: 'Hoàn tất' },
                    { value: 'pending', label: 'Chờ xử lý' }
                  ]}
                />
              )}
            />
          </Box>

          {/* Note */}
          <Controller
            name="note"
            control={control}
            render={({ field }) => (
              <MuiTextField
                label="Ghi chú (Tùy chọn)"
                placeholder="Ghi chú chi tiết về giao dịch..."
                value={field.value}
                onChange={field.onChange}
                multiline
                rows={2}
              />
            )}
          />
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={close} color="inherit">
            Hủy
          </Button>
          <Button variant="contained" color="primary" onClick={save} disabled={isSubmitting}>
            {isSubmitting ? 'Đang lưu...' : 'Lưu giao dịch'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Chi tiết giao dịch</DialogTitle>
        <DialogContent dividers>
          {detail && (
            <Box sx={{ display: 'grid', gap: 1.5, fontSize: 13 }}>
              {[
                ['Tên giao dịch', detail.name],
                ['Số tiền', money(detail.amount)],
                ['Loại', detail.type === 'income' ? 'Thu nhập' : detail.type === 'expense' ? 'Chi tiêu' : 'Chuyển khoản'],
                ['Danh mục', data.categories.find(c => c.id === detail.categoryId)?.name || 'Chuyển khoản'],
                ['Tài khoản', data.accounts.find(a => a.id === detail.accountId)?.name || ''],
                ['Ngày', dateLabel(detail.date)],
                ['Phương thức', detail.method],
                ['Trạng thái', detail.status === 'completed' ? 'Hoàn tất' : 'Chờ xử lý'],
                ['Ghi chú', detail.note || '—']
              ].map(([k, v]) => (
                <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {k}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {v}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDetail(null)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) {
            await update(
              d => ({
                ...d,
                transactions: d.transactions.filter(t => t.id !== deleting.id)
              }),
              `Đã xóa giao dịch "${deleting.name}"`
            );
          }
        }}
        title="Xác nhận xóa giao dịch"
        message={`Xóa giao dịch “${deleting?.name || ''}”? Các chỉ số và số dư tài khoản sẽ được tính toán lại ngay lập tức.`}
      />
    </>
  );
}
