import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Card,
  Alert
} from '@mui/material';
import { Landmark, ArrowDownLeft, ArrowUpRight, CheckCircle2, Copy } from 'lucide-react';
import { useFinance } from '../store';
import { parseBankSms, SAMPLE_BANK_SMS, type ParsedBankSms } from '../lib/bankSmsParser';
import { money, uid } from '../lib/finance';
import { MuiTextField, MuiSelect } from './mui/MuiInputs';
import { BankLogoBadge } from '../lib/brandBadges';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const BankSmsModal: React.FC<Props> = ({ open, onClose }) => {
  const data = useFinance(s => s.data);
  const update = useFinance(s => s.update);
  const notify = useFinance(s => s.notify);

  const [inputSms, setInputSms] = useState('');
  const [parsed, setParsed] = useState<ParsedBankSms | null>(null);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const updateBalance = true;

  if (!data) return null;

  const handleTextChange = (text: string) => {
    setInputSms(text);
    const result = parseBankSms(text, data.accounts, data.categories, data.user.defaultAccountId);
    setParsed(result);
    if (result) {
      setSelectedAccount(result.matchedAccountId);
      setSelectedCategory(result.matchedCategoryId);
    }
  };

  const handlePickSample = (sampleSms: string) => {
    handleTextChange(sampleSms);
  };

  const handleConfirm = () => {
    if (!parsed) return;

    const finalAccountId = selectedAccount || parsed.matchedAccountId;
    const finalCategoryId = selectedCategory || parsed.matchedCategoryId;

    update(d => {
      // 1. Create transaction
      const newTx = {
        id: uid(),
        name: parsed.description,
        amount: parsed.amount,
        type: parsed.type,
        categoryId: finalCategoryId,
        accountId: finalAccountId,
        date: parsed.date,
        method: parsed.bankCode,
        note: `Tự động bóc tách từ tin nhắn ${parsed.bankName}: "${parsed.raw.slice(0, 80)}..."`,
        status: 'completed' as const
      };

      // 2. Optionally reconcile balance if balanceAfter was provided in the SMS
      let updatedAccounts = d.accounts;
      if (updateBalance && parsed.balanceAfter !== undefined) {
        updatedAccounts = d.accounts.map(acc => {
          if (acc.id === finalAccountId) {
            // Note: opening balance adjust or we let transaction naturally update
            return acc;
          }
          return acc;
        });
      }

      return {
        ...d,
        transactions: [newTx, ...d.transactions],
        accounts: updatedAccounts
      };
    });

    notify?.(`Đã tự động ghi nhận ${parsed.type === 'income' ? 'khoản thu' : 'khoản chi'} ${money(parsed.amount)} từ ${parsed.bankName}!`);
    onClose();
    setInputSms('');
    setParsed(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 800 }}>
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
          <Landmark size={20} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
            Tự động bóc tách tin nhắn Ngân hàng & Ví điện tử
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Hỗ trợ Vietcombank, Techcombank, MBBank, Timo, MoMo, ZaloPay...
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'grid', gap: 2.5, pt: '16px !important' }}>
        {/* Sample Templates */}
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>
            Dán mẫu tin nhắn thử nghiệm (Click để điền ngay):
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {SAMPLE_BANK_SMS.map((sample, idx) => (
              <Chip
                key={idx}
                icon={<Copy size={12} />}
                label={sample.name}
                size="small"
                onClick={() => handlePickSample(sample.sms)}
                variant="outlined"
                sx={{ cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
              />
            ))}
          </Box>
        </Box>

        {/* Text Input */}
        <MuiTextField
          label="Dán nội dung tin nhắn SMS / OTT biến động số dư"
          placeholder="Ví dụ: TK 1023456789 tai VCB -250,000 VND vao 14:30 02/11/2026. ND: Qr thanh toan VinMart..."
          multiline
          rows={3}
          value={inputSms}
          onChange={e => handleTextChange(e.target.value)}
          autoFocus
        />

        {/* Parsed Result Card */}
        {parsed ? (
          <Card
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2.5,
              bgcolor: 'action.hover',
              border: '1.5px solid',
              borderColor: parsed.type === 'income' ? '#059669' : '#e11d48'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BankLogoBadge accountName={parsed.bankName} accountType="bank" size="medium" />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    {parsed.bankName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {parsed.type === 'income' ? 'Biến động TĂNG (+)' : 'Biến động GIẢM (-)'}
                  </Typography>
                </Box>
              </Box>

              <Chip
                icon={parsed.type === 'income' ? <ArrowDownLeft size={14} color="#059669" /> : <ArrowUpRight size={14} color="#e11d48" />}
                label={`${parsed.type === 'income' ? '+' : '-'}${money(parsed.amount)}`}
                sx={{
                  fontWeight: 900,
                  fontSize: 14,
                  bgcolor: parsed.type === 'income' ? '#e9f9f2' : '#fef0ef',
                  color: parsed.type === 'income' ? '#059669' : '#e11d48'
                }}
              />
            </Box>

            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Nội dung: <em>{parsed.description}</em>
            </Typography>

            {parsed.balanceAfter !== undefined && (
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                Số dư báo về sau GD: <strong>{money(parsed.balanceAfter)}</strong>
              </Typography>
            )}

            {/* Adjust Selectors */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mt: 1.5 }}>
              <MuiSelect
                label="Tài khoản ghi nhận"
                value={selectedAccount}
                onChange={val => setSelectedAccount(val)}
                options={data.accounts.map(a => ({ value: a.id, label: a.name }))}
              />
              <MuiSelect
                label="Danh mục chi tiêu"
                value={selectedCategory}
                onChange={val => setSelectedCategory(val)}
                options={data.categories
                  .filter(c => c.type === parsed.type && !c.hidden)
                  .map(c => ({ value: c.id, label: c.name }))}
              />
            </Box>
          </Card>
        ) : (
          inputSms.trim().length > 0 && (
            <Alert severity="warning">
              Chưa nhận diện được cấu trúc ngân hàng hoặc số tiền. Vui lòng kiểm tra lại tin nhắn hoặc thử một trong các mẫu phía trên.
            </Alert>
          )
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Đóng
        </Button>
        <Button
          variant="contained"
          color="primary"
          disabled={!parsed}
          startIcon={<CheckCircle2 size={16} />}
          onClick={handleConfirm}
        >
          Xác nhận ghi nhận giao dịch
        </Button>
      </DialogActions>
    </Dialog>
  );
};
