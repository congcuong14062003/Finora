import { Card, Box, Typography, Chip, LinearProgress } from '@mui/material';
import { Compass, Award } from 'lucide-react';
import { useFinance } from '../store';
import { calculateFinancialFreedom } from '../lib/riskAndInsightEngine';
import { money } from '../lib/finance';

export function FinancialFreedomCard() {
  const data = useFinance(s => s.data);
  if (!data) return null;

  const freedom = calculateFinancialFreedom(data);

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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1.5,
              bgcolor: 'info.main',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.9
            }}
          >
            <Compass size={15} />
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 750, fontSize: 13.5 }}>
            Tự Do Tài Chính & Runway
          </Typography>
        </Box>

        <Chip
          icon={<Award size={12} />}
          label={`${freedom.freedomRatio}% Tự Do`}
          size="small"
          color="info"
          variant="outlined"
          sx={{
            fontWeight: 750,
            fontSize: 11,
            height: 22
          }}
        />
      </Box>

      {/* Progress Bar */}
      <Box sx={{ mb: 1.75 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, mb: 0.5, color: 'text.secondary' }}>
          <span>Thu nhập thụ động / Chi thiết yếu</span>
          <strong>{freedom.freedomRatio}% (Mục tiêu 100%)</strong>
        </Box>
        <LinearProgress
          variant="determinate"
          value={Math.min(100, freedom.freedomRatio)}
          color="info"
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: 'var(--bg-subtle)'
          }}
        />
      </Box>

      {/* Key Metric Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1.5,
          p: 1.5,
          borderRadius: 2,
          bgcolor: 'var(--bg-subtle)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <Box>
          <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 650, display: 'block', fontSize: 10.5 }}>
            Thu nhập thụ động
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'success.main', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
            {money(freedom.monthlyPassiveIncome)}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
            / tháng
          </Typography>
        </Box>

        <Box>
          <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 650, display: 'block', fontSize: 10.5 }}>
            Chi thiết yếu
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
            {money(freedom.monthlyEssentialExpenses)}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
            / tháng
          </Typography>
        </Box>

        <Box>
          <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 650, display: 'block', fontSize: 10.5 }}>
            Runway sống sót
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'info.main', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
            {freedom.freedomRunwayMonths} tháng
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
            Nếu nghỉ làm
          </Typography>
        </Box>
      </Box>
    </Card>
  );
}
