import { useState } from 'react';
import { Card, Box, Typography, Button, Chip, Alert, AlertTitle, Collapse, IconButton } from '@mui/material';
import { ArrowRightLeft, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import { useFinance } from '../store';
import { analyzeFinancialRisks, executeBudgetRebalance, type RiskAlert } from '../lib/riskAndInsightEngine';
import { monthKey } from '../lib/finance';

export function RiskAlertsCard() {
  const { data, update } = useFinance();
  const [expanded, setExpanded] = useState(true);

  if (!data) return null;

  const alerts = analyzeFinancialRisks(data);
  if (alerts.length === 0) return null;

  const currentMonth = monthKey(new Date());

  const handleRebalance = async (alert: RiskAlert) => {
    if (!alert.rebalanceData) return;
    const { fromCategoryId, toCategoryId, fromCategoryName, toCategoryName, amount } = alert.rebalanceData;

    await update(
      d => ({
        ...d,
        budgets: executeBudgetRebalance(d.budgets, currentMonth, fromCategoryId, toCategoryId, amount)
      }),
      `Đã bù ${new Intl.NumberFormat('vi-VN').format(amount)} ₫ từ "${fromCategoryName}" sang "${toCategoryName}"`
    );
  };

  const criticalCount = alerts.filter(a => a.level === 'critical').length;
  const warningCount = alerts.filter(a => a.level === 'warning').length;

  return (
    <Card
      variant="outlined"
      sx={{
        p: 2,
        mb: 2.5,
        borderRadius: 3,
        bgcolor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        boxShadow: 'none'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShieldAlert size={17} style={{ color: criticalCount > 0 ? 'var(--accent-expense)' : 'var(--accent-warning)' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 750, fontSize: 13.5 }}>
            Cảnh báo Rủi ro & Điều phối Chi tiêu ({alerts.length})
          </Typography>
          {criticalCount > 0 && (
            <Chip label={`${criticalCount} Nguy cấp`} size="small" color="error" sx={{ height: 20, fontSize: 10, fontWeight: 750 }} />
          )}
          {warningCount > 0 && (
            <Chip label={`${warningCount} Cần chú ý`} size="small" color="warning" sx={{ height: 20, fontSize: 10, fontWeight: 750 }} />
          )}
        </Box>

        <IconButton size="small" onClick={() => setExpanded(!expanded)} aria-label="Thu gọn hoặc mở rộng cảnh báo">
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ display: 'grid', gap: 1.25, mt: 1.5 }}>
          {alerts.map(alert => (
            <Alert
              key={alert.id}
              severity={alert.level === 'critical' ? 'error' : 'warning'}
              variant="outlined"
              sx={{
                borderRadius: 2,
                fontSize: 12,
                bgcolor: 'var(--bg-subtle)',
                alignItems: 'center',
                '& .MuiAlert-message': { width: '100%' }
              }}
              action={
                alert.actionType === 'rebalance' && alert.rebalanceData ? (
                  <Button
                    color="warning"
                    size="small"
                    variant="contained"
                    startIcon={<ArrowRightLeft size={12} />}
                    onClick={() => handleRebalance(alert)}
                    sx={{ textTransform: 'none', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}
                  >
                    1-Click Bù ngân sách
                  </Button>
                ) : undefined
              }
            >
              <AlertTitle sx={{ fontWeight: 750, fontSize: 12.5, mb: 0.25 }}>
                {alert.title}
              </AlertTitle>
              {alert.description}
            </Alert>
          ))}
        </Box>
      </Collapse>
    </Card>
  );
}
