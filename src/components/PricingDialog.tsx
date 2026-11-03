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
  Card,
  CardActionArea,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Alert
} from '@mui/material';
import {
  X,
  Crown,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { useFinance } from '../store';
import { PLAN_OPTIONS, type PlanOption } from '../lib/subscription';

export function PricingDialog({
  open,
  onClose,
  initialFeatureHighlight
}: {
  open: boolean;
  onClose: () => void;
  initialFeatureHighlight?: string;
}) {
  const { data, update, notify } = useFinance();
  const [selectedPlan, setSelectedPlan] = useState<PlanOption>(PLAN_OPTIONS[1]); // Default to Annual
  const [step, setStep] = useState<'compare' | 'checkout'>('compare');
  const [processing, setProcessing] = useState(false);

  const userId = data?.user.id || 'demo';
  const qrTransferContent = `TICHLOC PRO ${userId.toUpperCase()}`;
  const qrUrl = `https://api.vietqr.io/image/970422-99998888TICHLOC-compact2.jpg?amount=${selectedPlan.price}&addInfo=${encodeURIComponent(
    qrTransferContent
  )}&accountName=TICHLOC%20PREMIUM`;

  const handleActivatePro = async () => {
    setProcessing(true);
    await update(d => ({
      ...d,
      user: {
        ...d.user,
        plan: 'pro',
        proExpiresAt:
          selectedPlan.id === 'lifetime'
            ? '2099-12-31'
            : selectedPlan.id === 'year'
            ? new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
            : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
      }
    }));
    setProcessing(false);
    notify(`Chúc mừng bạn đã nâng cấp thành công gói ${selectedPlan.name}!`);
    setStep('compare');
    onClose();
  };

  const featureComparisons = [
    { name: 'Số lượng Tài khoản (/accounts)', free: 'Tối đa 2', pro: 'Không giới hạn + Thẻ tín dụng' },
    { name: 'Danh mục Đầu tư theo Mã & PnL', free: 'Tối đa 2 mã', pro: 'Chứng khoán, Vàng, Coin không giới hạn' },
    { name: 'AI Command Bar (5 Intents) & WebMCP', free: '5 lần / ngày', pro: 'Không giới hạn + Lệnh tự nhiên' },
    { name: 'Cảnh báo Rủi ro & Bù ngân sách 1-Click', free: 'Cơ bản', pro: 'Đa tầng (Critical / Warning) + Rebalancer' },
    { name: 'Chia tiền nhóm & Trả góp thẻ', free: 'Thủ công', pro: 'Tự động tính & đẩy vào Sổ nợ' },
    { name: 'Thu nhập Thụ động & Tự do Tài chính', free: 'Không hỗ trợ', pro: 'Thước đo Tự do & Runway tháng' },
    { name: 'Mẫu nhập 1-Chạm & Gói Kinh doanh', free: 'Tối đa 3 mẫu', pro: 'Không giới hạn + Trích giá vốn' },
    { name: 'Tự động chạy định kỳ (Auto-Execute)', free: 'Thủ công bấm tay', pro: 'Tự động ngầm mỗi ngày' },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3.5,
            p: 1,
            overflow: 'hidden'
          }
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2.5,
          pb: 1.5
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              bgcolor: 'warning.main',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Crown size={20} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Nâng cấp Tích Lộc Pro
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Mở khóa toàn bộ sức mạnh tài chính cá nhân và tự động hóa không giới hạn
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Đóng">
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2.5 }}>
        {initialFeatureHighlight && (
          <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
            <strong>Tính năng Pro:</strong> {initialFeatureHighlight}. Hãy nâng cấp gói cước để tiếp tục sử dụng!
          </Alert>
        )}

        {step === 'compare' ? (
          <>
            {/* Plan Cards */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                gap: 2,
                mb: 3
              }}
            >
              {PLAN_OPTIONS.map(plan => {
                const isSelected = selectedPlan.id === plan.id;
                return (
                  <Card
                    key={plan.id}
                    variant="outlined"
                    sx={{
                      borderRadius: 3,
                      position: 'relative',
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      bgcolor: isSelected ? 'action.selected' : 'background.paper',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                        transform: 'translateY(-2px)'
                      }
                    }}
                  >
                    {plan.badge && (
                      <Chip
                        label={plan.badge}
                        size="small"
                        color={plan.popular ? 'primary' : 'default'}
                        sx={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          fontSize: 10,
                          fontWeight: 700,
                          height: 20
                        }}
                      />
                    )}
                    <CardActionArea
                      onClick={() => setSelectedPlan(plan)}
                      sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>
                        {plan.name}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
                        {new Intl.NumberFormat('vi-VN').format(plan.price)} ₫
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1.5, minHeight: 32 }}>
                        {plan.billing}
                      </Typography>
                      <Button
                        fullWidth
                        size="small"
                        variant={isSelected ? 'contained' : 'outlined'}
                        color="primary"
                        sx={{ mt: 'auto', pointerEvents: 'none' }}
                      >
                        {isSelected ? 'Đang chọn' : 'Chọn gói'}
                      </Button>
                    </CardActionArea>
                  </Card>
                );
              })}
            </Box>

            {/* Feature Table */}
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Sparkles size={16} color="#20705B" /> So sánh đặc quyền gói Free vs Pro
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Tính năng / Giới hạn</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: '28%' }}>Gói Free</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: '35%', color: 'primary.main' }}>Tích Lộc Pro</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {featureComparisons.map((row, index) => (
                    <TableRow key={index} hover>
                      <TableCell sx={{ fontSize: 13, fontWeight: 500 }}>{row.name}</TableCell>
                      <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <XCircle size={14} color="#A4AEA8" />
                          <span>{row.free}</span>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, fontWeight: 600, color: 'primary.main' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <CheckCircle2 size={15} color="#15966B" />
                          <span>{row.pro}</span>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : (
          /* Checkout / VietQR simulation view */
          <Box sx={{ py: 1 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '260px 1fr' },
                gap: 3,
                alignItems: 'center'
              }}
            >
              {/* QR Image Box */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  p: 2,
                  bgcolor: '#ffffff',
                  color: '#0f172a',
                  borderRadius: 3,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  border: '1px solid #e2e8f0',
                  textAlign: 'center'
                }}
              >
                <Box
                  component="img"
                  src={qrUrl}
                  alt="VietQR Chuyển khoản"
                  sx={{
                    width: 220,
                    height: 220,
                    objectFit: 'contain',
                    borderRadius: 2
                  }}
                  onError={e => {
                    // Fallback visual if offline
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <Typography variant="caption" sx={{ mt: 1, fontWeight: 700, color: '#0f172a' }}>
                  Quét bằng ứng dụng ngân hàng / MoMo
                </Typography>
              </Box>

              {/* Transfer Details */}
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                  Thông tin thanh toán ({selectedPlan.name})
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  Chuyển khoản chính xác số tiền và nội dung để hệ thống tự động kích hoạt tức thì.
                </Typography>

                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: 'action.hover', mb: 2 }}>
                  <Box sx={{ display: 'grid', gap: 1.25, fontSize: 13 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Ngân hàng:</span>
                      <strong>MBBank (Quân Đội)</strong>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Số tài khoản:</span>
                      <strong style={{ fontFamily: 'monospace', fontSize: 15, color: '#20705B' }}>
                        99998888TICHLOC
                      </strong>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Tên thụ hưởng:</span>
                      <strong>TÍCH LỘC TECHNOLOGY</strong>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Số tiền:</span>
                      <strong style={{ color: '#D65B58', fontSize: 15 }}>
                        {new Intl.NumberFormat('vi-VN').format(selectedPlan.price)} ₫
                      </strong>
                    </Box>
                    <Divider sx={{ my: 0.5 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Nội dung CK:</span>
                      <Chip
                        label={qrTransferContent}
                        size="small"
                        color="primary"
                        sx={{ fontWeight: 700, fontFamily: 'monospace' }}
                      />
                    </Box>
                  </Box>
                </Paper>

                <Alert severity="success" icon={<ShieldCheck size={18} />} sx={{ borderRadius: 2, mb: 2 }}>
                  Đây là màn hình demo giả lập giao dịch. Bạn có thể bấm nút bên dưới để trải nghiệm ngay quyền lợi Tích Lộc Pro!
                </Alert>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        {step === 'compare' ? (
          <>
            <Button onClick={onClose} color="inherit">
              Để sau
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setStep('checkout')}
              startIcon={<Zap size={16} />}
              endIcon={<ArrowRight size={16} />}
              sx={{ px: 3 }}
            >
              Tiến hành thanh toán ({new Intl.NumberFormat('vi-VN').format(selectedPlan.price)} ₫)
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => setStep('compare')} color="inherit">
              Quay lại
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleActivatePro}
              disabled={processing}
              startIcon={<Sparkles size={16} />}
              sx={{ px: 3, fontWeight: 700 }}
            >
              {processing ? 'Đang kích hoạt...' : 'Tôi đã thanh toán (Demo kích hoạt Pro ngay)'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
