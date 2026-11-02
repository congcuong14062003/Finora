import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Alert,
  Paper
} from '@mui/material';
import { X, Scale, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { useFinance } from '../store';
import { balance, money } from '../lib/finance';
import { createReconciliationTransaction } from '../lib/habit';
import { MuiCurrencyInput } from './mui/MuiInputs';
import type { Account } from '../types';

export function ReconcileDialog({
  account,
  open,
  onClose
}: {
  account: Account | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data, update, notify } = useFinance();
  const [actualBalanceStr, setActualBalanceStr] = useState('');

  if (!account || !data) return null;

  const currentAppBalance = balance(account, data.transactions);
  const actualBalance = actualBalanceStr !== '' ? Number(actualBalanceStr) : currentAppBalance;
  const difference = actualBalance - currentAppBalance;

  const handleReconcile = async () => {
    if (difference === 0) {
      notify('Số dư thực tế đã khớp với ứng dụng!');
      onClose();
      return;
    }

    const result = createReconciliationTransaction(
      account,
      actualBalance,
      data.transactions,
      data.categories
    );

    if (result) {
      await update(d => ({
        ...d,
        transactions: [result.transaction, ...d.transactions]
      }));
      notify(
        `✅ Đã cân bằng số dư cho ${account.name}: Tạo giao dịch ${
          difference > 0 ? 'Thu nhập' : 'Chi tiêu'
        } ${money(Math.abs(difference))}`
      );
    }

    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          pb: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Scale size={20} color="#059669" />
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 17 }}>
            Cân bằng số dư 1-Click
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2.5, display: 'grid', gap: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 13 }}>
          Cứu cánh khi bạn quên ghi chép một vài giao dịch nhỏ. Chỉ cần nhập số dư hiện tại trong ví hoặc ứng dụng ngân hàng, Finora sẽ tự động bù đắp chênh lệch.
        </Typography>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, fontSize: 13 }}>
            <span style={{ color: '#64748b' }}>Tài khoản:</span>
            <strong>{account.name}</strong>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: '#64748b' }}>Số dư trên ứng dụng:</span>
            <strong style={{ color: '#059669' }}>{money(currentAppBalance)}</strong>
          </Box>
        </Paper>

        <MuiCurrencyInput
          label="Số dư thực tế hiện tại"
          placeholder="Nhập số tiền thực tế"
          value={actualBalanceStr !== '' ? actualBalanceStr : String(currentAppBalance)}
          onChange={val => setActualBalanceStr(val)}
          autoFocus
        />

        {difference !== 0 && (
          <Alert
            severity={difference > 0 ? 'success' : 'warning'}
            icon={difference > 0 ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
            sx={{ borderRadius: 2 }}
          >
            Chênh lệch: <strong>{difference > 0 ? '+' : ''}{money(difference)}</strong>.
            <br />
            Hệ thống sẽ tự động tạo 1 giao dịch{' '}
            <strong>{difference > 0 ? 'Thu nhập' : 'Chi tiêu'}</strong> vào danh mục{' '}
            <em>"Điều chỉnh số dư / Quên ghi"</em> để khớp số tiền ngay lập tức.
          </Alert>
        )}

        {difference === 0 && (
          <Alert severity="info" icon={<CheckCircle2 size={18} />} sx={{ borderRadius: 2 }}>
            Số dư thực tế đang trùng khớp với số dư trên ứng dụng.
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Hủy
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleReconcile}
          disabled={difference === 0}
        >
          Khớp số dư ngay
        </Button>
      </DialogActions>
    </Dialog>
  );
}
