import { Card, Box, Typography, Chip, LinearProgress } from '@mui/material';
import { ShieldCheck, AlertCircle, AlertTriangle } from 'lucide-react';
import { useFinance } from '../store';
import { calculateSafeToSpend } from '../lib/habit';
import { money } from '../lib/finance';

export function SafeToSpendCard() {
  const data = useFinance(s => s.data);
  if (!data) return null;

  const result = calculateSafeToSpend(data);

  const statusConfig = {
    safe: {
      color: '#059669',
      border: 'rgba(16, 185, 129, 0.25)',
      badge: 'An toàn',
      icon: ShieldCheck,
      desc: 'Chi tiêu đang trong tầm kiểm soát an toàn.'
    },
    warning: {
      color: '#d97706',
      border: 'rgba(245, 158, 11, 0.3)',
      badge: 'Cần chú ý',
      icon: AlertTriangle,
      desc: 'Đã dùng trên 80% ngân sách chu kỳ này.'
    },
    danger: {
      color: '#dc2626',
      border: 'rgba(239, 68, 68, 0.3)',
      badge: 'Vượt ngân sách',
      icon: AlertCircle,
      desc: 'Đã chạm trần hạn mức ngân sách tháng.'
    }
  }[result.status];

  const Icon = statusConfig.icon;
  const spentPct = result.totalBudget > 0 ? (result.totalSpent / result.totalBudget) * 100 : 0;

  return (
    <Card
      variant="outlined"
      sx={{
        p: 2.5,
        mb: 3,
        borderRadius: 3,
        bgcolor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        borderLeft: `4px solid ${statusConfig.color}`,
        position: 'relative'
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography
              variant="overline"
              sx={{
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                fontSize: 10.5,
                lineHeight: 1
              }}
            >
              HÔM NAY ĐƯỢC TIÊU BAO NHIÊU? (SAFE-TO-SPEND)
            </Typography>
            <Chip
              icon={<Icon size={12} style={{ color: statusConfig.color }} />}
              label={statusConfig.badge}
              size="small"
              sx={{
                height: 20,
                fontSize: 10.5,
                fontWeight: 750,
                color: statusConfig.color,
                bgcolor: 'var(--bg-subtle)',
                border: `1px solid ${statusConfig.border}`
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 900,
                color: 'var(--text-primary)',
                letterSpacing: '-0.04em',
                fontSize: { xs: 26, sm: 32 },
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {money(result.dailyLimit)}
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>
              / ngày
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 0.5, fontSize: 13 }}>
            {statusConfig.desc} Còn <strong>{money(result.remainingBudget)}</strong> cho <strong>{result.daysRemaining} ngày</strong> tới kỳ tiếp theo.
          </Typography>
        </Box>

        <Box sx={{ minWidth: 220, flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75, fontSize: 12 }}>
            <span style={{ color: 'var(--text-muted)' }}>Đã tiêu dùng:</span>
            <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(spentPct)}% ({money(result.totalSpent)})
            </strong>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, spentPct)}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: 'var(--bg-subtle)',
              '& .MuiLinearProgress-bar': {
                bgcolor: statusConfig.color,
                borderRadius: 3
              }
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75, fontSize: 11, color: 'var(--text-muted)' }}>
            <span>Hạn mức: {money(result.totalBudget)}</span>
            <span>Còn {result.daysRemaining} ngày</span>
          </Box>
        </Box>
      </Box>
    </Card>
  );
}
