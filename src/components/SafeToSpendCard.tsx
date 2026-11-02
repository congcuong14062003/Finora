import { Card, Box, Typography, Chip, LinearProgress, Tooltip } from '@mui/material';
import { ShieldCheck, AlertCircle, AlertTriangle, Flame, Wallet, CalendarClock, CreditCard, HandCoins } from 'lucide-react';
import { useFinance } from '../store';
import { calculateTrueSpendableBalance } from '../lib/riskAndInsightEngine';
import { money, dateLabel } from '../lib/finance';

export function SafeToSpendCard() {
  const data = useFinance(s => s.data);
  if (!data) return null;

  const result = calculateTrueSpendableBalance(data);

  const statusConfig = {
    safe: {
      color: 'success.main',
      border: 'rgba(16, 185, 129, 0.25)',
      badge: 'An toàn tài chính',
      icon: ShieldCheck,
      desc: 'Chi tiêu và thanh khoản đang trong tầm kiểm soát tốt.'
    },
    warning: {
      color: 'warning.main',
      border: 'rgba(245, 158, 11, 0.3)',
      badge: 'Cần cẩn trọng',
      icon: AlertTriangle,
      desc: 'Tốc độ tiêu cao, nên thắt chặt chi tiêu không thiết yếu.'
    },
    danger: {
      color: 'error.main',
      border: 'rgba(239, 68, 68, 0.3)',
      badge: 'Cảnh báo cháy túi',
      icon: AlertCircle,
      desc: 'Nguy cơ cạn kiệt thanh khoản trước kỳ nhận lương tiếp theo!'
    }
  }[result.status];

  const Icon = statusConfig.icon;

  return (
    <Card
      variant="outlined"
      sx={{
        p: 2.25,
        borderRadius: 3,
        bgcolor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: 'var(--text-muted)',
              fontSize: 11
            }}
          >
            SỐ DƯ THỰC ĐƯỢC TIÊU
          </Typography>
          <Chip
            icon={<Icon size={12} />}
            label={statusConfig.badge}
            size="small"
            sx={{
              height: 22,
              fontSize: 10.5,
              fontWeight: 700,
              color: statusConfig.color,
              bgcolor: 'var(--bg-subtle)',
              border: '1px solid',
              borderColor: statusConfig.border
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, my: 0.5 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.035em',
              fontSize: { xs: 26, sm: 32 },
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {money(result.trueBalance)}
          </Typography>
        </Box>

        <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontSize: 12.5, mt: 0.5 }}>
          {statusConfig.desc} An toàn hôm nay: <strong>{money(result.dailySafeToSpend)}</strong> / ngày ({result.daysRemainingInMonth} ngày nữa).
        </Typography>

        {/* Breakdown Pills */}
        <Box sx={{ display: 'flex', gap: 0.75, mt: 1.5, flexWrap: 'wrap' }}>
          <Tooltip title="Tổng tiền mặt, ngân hàng & ví điện tử">
            <Chip
              icon={<Wallet size={11} />}
              label={`Thanh khoản: ${money(result.liquidity)}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: 10.5, height: 22, fontWeight: 600 }}
            />
          </Tooltip>
          {result.upcomingRecurringBills > 0 && (
            <Tooltip title="Hóa đơn định kỳ chưa thanh toán tháng này">
              <Chip
                icon={<CalendarClock size={11} />}
                label={`-Hóa đơn: ${money(result.upcomingRecurringBills)}`}
                size="small"
                variant="outlined"
                color="warning"
                sx={{ fontSize: 10.5, height: 22, fontWeight: 600 }}
              />
            </Tooltip>
          )}
          {result.creditCardDueBalance > 0 && (
            <Tooltip title="Dư nợ thẻ tín dụng đến hạn thanh toán">
              <Chip
                icon={<CreditCard size={11} />}
                label={`-Thẻ tín dụng: ${money(result.creditCardDueBalance)}`}
                size="small"
                variant="outlined"
                color="error"
                sx={{ fontSize: 10.5, height: 22, fontWeight: 600 }}
              />
            </Tooltip>
          )}
          {result.debtsDueThisMonth > 0 && (
            <Tooltip title="Khoản nợ phải trả trong tháng này">
              <Chip
                icon={<HandCoins size={11} />}
                label={`-Nợ đến hạn: ${money(result.debtsDueThisMonth)}`}
                size="small"
                variant="outlined"
                color="error"
                sx={{ fontSize: 10.5, height: 22, fontWeight: 600 }}
              />
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Burn-rate sub-box */}
      <Box
        sx={{
          mt: 2,
          p: 1.5,
          borderRadius: 2,
          bgcolor: 'var(--bg-subtle)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Flame size={14} style={{ color: 'var(--accent-expense)' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 750, fontSize: 12 }}>
              Dự báo Cháy Túi (Burn-Rate)
            </Typography>
          </Box>
          <Chip
            label={`~${money(result.burnRate7Days)}/ngày`}
            size="small"
            sx={{ fontWeight: 700, fontSize: 10.5, height: 20 }}
          />
        </Box>

        <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontSize: 12, mb: 1 }}>
          Chi tiêu 7 ngày qua: đủ trang trải{' '}
          <strong>
            {result.burnRateDaysLeft >= 999 ? 'thoải mái' : `${result.burnRateDaysLeft} ngày`}
          </strong>
          {result.burnRateDaysLeft < 365 && (
            <>
              {' '}(dự kiến đến <strong>{dateLabel(result.burnRateExhaustionDate)}</strong>)
            </>
          )}.
        </Typography>

        <LinearProgress
          variant="determinate"
          value={Math.min(100, Math.max(5, (result.burnRateDaysLeft / 30) * 100))}
          color={result.status === 'danger' ? 'error' : result.status === 'warning' ? 'warning' : 'success'}
          sx={{
            height: 5,
            borderRadius: 2.5,
            bgcolor: 'action.hover'
          }}
        />
      </Box>
    </Card>
  );
}
