import React, { useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Chip,
  Button,
  Slider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ShoppingBag,
  PiggyBank,
  GraduationCap,
  PartyPopper,
  TrendingUp,
  HeartHandshake,
  Sliders,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useFinance } from '../../store';
import { money, monthKey } from '../../lib/finance';
import { MuiCurrencyInput, MuiMonthPicker } from '../../components/mui/MuiInputs';
import { Progress } from '../../components/ui';

interface JarDefinition {
  key: 'nec' | 'ltss' | 'educ' | 'play' | 'ffa' | 'give';
  name: string;
  code: string;
  defaultPct: number;
  description: string;
  color: string;
  icon: React.ComponentType<{ size?: number }>;
}

export const JARS_DATA: JarDefinition[] = [
  {
    key: 'nec',
    name: 'Chi tiêu thiết yếu',
    code: 'NEC (55%)',
    defaultPct: 55,
    description: 'Ăn uống, thuê nhà, điện nước, xăng xe, nhu yếu phẩm hàng ngày',
    color: '#059669',
    icon: ShoppingBag
  },
  {
    key: 'ltss',
    name: 'Tiết kiệm dài hạn',
    code: 'LTSS (10%)',
    defaultPct: 10,
    description: 'Quỹ dự phòng khẩn cấp, mua sắm lớn, bảo hiểm, mục tiêu tương lai',
    color: '#2563eb',
    icon: PiggyBank
  },
  {
    key: 'educ',
    name: 'Giáo dục & Bản thân',
    code: 'EDUC (10%)',
    defaultPct: 10,
    description: 'Mua sách, khóa học, hội thảo, rèn luyện kỹ năng chuyên môn',
    color: '#0891b2',
    icon: GraduationCap
  },
  {
    key: 'play',
    name: 'Hưởng thụ & Giải trí',
    code: 'PLAY (10%)',
    defaultPct: 10,
    description: 'Du lịch, cà phê bạn bè, nhà hàng, xem phim, nuông chiều bản thân',
    color: '#b45309',
    icon: PartyPopper
  },
  {
    key: 'ffa',
    name: 'Tự do tài chính',
    code: 'FFA (10%)',
    defaultPct: 10,
    description: 'Đầu tư sinh lời, cổ phiếu, vàng, kinh doanh (tiền để đẻ ra tiền)',
    color: '#16a34a',
    icon: TrendingUp
  },
  {
    key: 'give',
    name: 'Cho đi & Thiện nguyện',
    code: 'GIVE (5%)',
    defaultPct: 5,
    description: 'Giúp đỡ người thân, từ thiện, quà cáp, hiếu hỉ, chia sẻ may mắn',
    color: '#dc2626',
    icon: HeartHandshake
  }
];

export const SixJarsView: React.FC = () => {
  const data = useFinance(s => s.data)!;
  const update = useFinance(s => s.update);
  const notify = useFinance(s => s.notify);

  const currentMonth = monthKey(new Date());
  const [month, setMonth] = useState(currentMonth);

  // Month transactions
  const monthTransactions = data.transactions.filter(
    t => t.status === 'completed' && t.date.startsWith(month)
  );

  const monthIncome = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((n, t) => n + t.amount, 0);

  const monthExpense = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((n, t) => n + t.amount, 0);

  // Custom or default income
  const [customIncome, setCustomIncome] = useState<string>(String(monthIncome || 20000000));
  const [configOpen, setConfigOpen] = useState(false);

  // Jars percentages config
  const savedConfig = data.sixJarsConfig || {
    nec: 55,
    ltss: 10,
    educ: 10,
    play: 10,
    ffa: 10,
    give: 5
  };

  const [percentages, setPercentages] = useState(savedConfig);

  const totalIncomeForJars = Number(customIncome) || monthIncome || 0;
  const totalAllocated = Object.values(percentages).reduce((a, b) => a + b, 0);

  // Estimate actual spending per jar by mapping categories
  const getJarSpending = (jarKey: JarDefinition['key']) => {
    // Map categories to jars
    const matchingCategories = data.categories.filter(c => {
      if (c.type !== 'expense') return false;
      if (c.jarType) return c.jarType === jarKey;
      // Default heuristic
      if (jarKey === 'nec') {
        return c.id === 'food' || c.id === 'transport' || c.id === 'housing' || c.isEssential;
      }
      if (jarKey === 'ltss') return c.id === 'savings' || c.name.toLowerCase().includes('tiết kiệm');
      if (jarKey === 'educ') return c.name.toLowerCase().includes('học') || c.name.toLowerCase().includes('sách');
      if (jarKey === 'play') return c.name.toLowerCase().includes('giải trí') || c.name.toLowerCase().includes('du lịch') || c.name.toLowerCase().includes('mua sắm');
      if (jarKey === 'ffa') return c.name.toLowerCase().includes('đầu tư');
      if (jarKey === 'give') return c.name.toLowerCase().includes('quà') || c.name.toLowerCase().includes('từ thiện');
      return false;
    });

    const categoryIds = new Set(matchingCategories.map(c => c.id));
    return monthTransactions
      .filter(t => t.type === 'expense' && t.categoryId && categoryIds.has(t.categoryId))
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const handleSaveConfig = () => {
    update(d => ({
      ...d,
      sixJarsConfig: percentages
    }));
    notify?.('Đã lưu cấu hình tỷ lệ 6 chiếc hũ thành công!');
    setConfigOpen(false);
  };

  return (
    <Box sx={{ mb: 4 }}>
      {/* Head Action Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Phương pháp 6 chiếc hũ (6 Jars) & Zero-based Budgeting
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Phân bổ thu nhập vào 6 quỹ thông minh theo phương pháp quản lý tài chính kinh điển của T. Harv Eker.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <MuiMonthPicker label="Tháng" value={month} onChange={setMonth} />
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<Sliders size={14} />}
            onClick={() => setConfigOpen(true)}
          >
            Tùy chỉnh % hũ
          </Button>
        </Box>
      </Box>

      {/* Income & Zero-based summary banner */}
      <Card
        variant="outlined"
        sx={{
          p: 2.5,
          borderRadius: 3,
          mb: 3,
          bgcolor: 'action.hover',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr 1fr' },
          gap: 2,
          alignItems: 'center'
        }}
      >
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
            THU NHẬP ĐỂ PHÂN BỔ VÀO 6 HŨ
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <MuiCurrencyInput
              label="Thu nhập tháng này (₫)"
              value={customIncome}
              onChange={val => setCustomIncome(val)}
              helperText="Có thể chỉnh theo lương tháng hoặc dòng tiền thực tế"
            />
          </Box>
        </Box>

        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
            TRIẾT LÝ ZERO-BASED BUDGETING (ZBB)
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle2 size={20} color="#059669" />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {money(totalIncomeForJars)} = 100% ĐÃ CÓ NHIỆM VỤ
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Mỗi đồng tiền làm ra đều được định hướng rõ ràng.
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>
            THỰC CHI THÁNG {month}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {money(monthExpense)}{' '}
            <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>
              ({totalIncomeForJars > 0 ? Math.round((monthExpense / totalIncomeForJars) * 100) : 0}% thu nhập)
            </Typography>
          </Typography>
        </Box>
      </Card>

      {/* 6 Jars Tiles: 3 to 6 square rounded tiles */}
      <div className="tiles">
        {JARS_DATA.map(jar => {
          const Icon = jar.icon;
          const pct = percentages[jar.key] || jar.defaultPct;
          const allocatedMoney = Math.round((totalIncomeForJars * pct) / 100);
          const spentMoney = getJarSpending(jar.key);
          const spentPct = allocatedMoney > 0 ? Math.round((spentMoney / allocatedMoney) * 100) : 0;
          const remainingMoney = Math.max(0, allocatedMoney - spentMoney);

          return (
            <Card
              variant="outlined"
              className="card tile"
              key={jar.key}
              sx={{ borderRadius: 3, p: 2.5 }}
            >
              {/* Top info */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: `${jar.color}18`,
                    color: jar.color
                  }}
                >
                  <Icon size={20} />
                </Box>
                <Chip
                  label={`${pct}% Thu nhập`}
                  size="small"
                  sx={{
                    fontWeight: 800,
                    fontSize: 11,
                    bgcolor: `${jar.color}15`,
                    color: jar.color
                  }}
                />
              </Box>

              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                {jar.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5, minHeight: 32 }}>
                {jar.description}
              </Typography>

              {/* Allocated Target */}
              <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>
                {money(allocatedMoney)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                Hạn mức phân bổ tháng {month}
              </Typography>

              {/* Progress */}
              <Progress
                value={spentPct}
                color={spentPct >= 100 ? '#dc2626' : spentPct >= 80 ? '#d97706' : jar.color}
              />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, fontSize: 11, color: 'text.secondary' }}>
                <span>Đã chi: {money(spentMoney)} ({spentPct}%)</span>
                <span>Còn: {money(remainingMoney)}</span>
              </Box>

              {/* Status Note */}
              <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid var(--border-subtle)' }}>
                {spentPct > 100 ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#dc2626', fontSize: 11, fontWeight: 700 }}>
                    <AlertTriangle size={13} />
                    <span>Đã vượt hũ {money(spentMoney - allocatedMoney)}</span>
                  </Box>
                ) : (
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
                    Hũ hoạt động an toàn
                  </Typography>
                )}
              </Box>
            </Card>
          );
        })}
      </div>

      {/* Percentage Customization Dialog */}
      <Dialog open={configOpen} onClose={() => setConfigOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Tùy chỉnh tỷ lệ 6 chiếc hũ (%)
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2.5, pt: '16px !important' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Tổng tỷ lệ các hũ phải bằng 100%. Tỷ lệ mặc định chuẩn là: Thiết yếu 55%, Tiết kiệm 10%, Giáo dục 10%, Hưởng thụ 10%, Tự do 10%, Cho đi 5%.
          </Typography>

          {JARS_DATA.map(jar => (
            <Box key={jar.key}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {jar.name} ({jar.key.toUpperCase()})
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: jar.color }}>
                  {percentages[jar.key]}%
                </Typography>
              </Box>
              <Slider
                value={percentages[jar.key]}
                min={0}
                max={80}
                step={1}
                onChange={(_, val) => setPercentages({ ...percentages, [jar.key]: val as number })}
                sx={{ color: jar.color }}
              />
            </Box>
          ))}

          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: totalAllocated === 100 ? '#e9f9f2' : '#fef0ef', textAlign: 'center' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: totalAllocated === 100 ? '#059669' : '#dc2626' }}>
              Tổng tỷ lệ: {totalAllocated}% {totalAllocated === 100 ? '(Hợp lệ)' : '(Cần điều chỉnh về đúng 100%)'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfigOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            color="primary"
            disabled={totalAllocated !== 100}
            onClick={handleSaveConfig}
          >
            Lưu tỷ lệ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
