import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Paper
} from '@mui/material';
import {
  Plus,
  RefreshCw,
  Trash2,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';

import { useFinance } from '../../store';
import {
  calculateInvestmentSummary,
  MARKET_PRICES
} from '../../lib/riskAndInsightEngine';
import { money, todayKey, uid } from '../../lib/finance';
import { PageHead, Confirm } from '../../components/ui';
import { MuiTextField, MuiCurrencyInput, MuiSelect } from '../../components/mui/MuiInputs';
import { AssetLogoBadge } from '../../lib/brandBadges';
import { isProUser } from '../../lib/subscription';
import type { InvestmentAsset } from '../../types';

export default function Assets() {
  const { data, update, notify, openPricing } = useFinance();
  const [openModal, setOpenModal] = useState(false);
  const [deleting, setDeleting] = useState<InvestmentAsset | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [form, setForm] = useState({
    symbol: 'FPT',
    name: 'Cổ phiếu FPT',
    assetClass: 'stock' as InvestmentAsset['assetClass'],
    quantity: '100',
    totalCostBasis: '12000000',
    currentUnitPrice: '138000',
    annualYieldRate: ''
  });

  if (!data) return null;

  const isPro = isProUser(data);
  const investments = data.investments || [];
  const summary = calculateInvestmentSummary(investments);

  // 1-Click Market Price Refresh
  const handleRefreshMarketPrices = async () => {
    setRefreshing(true);
    await update(d => {
      const updated = (d.investments || []).map(inv => {
        const symbolKey = inv.symbol.toUpperCase();
        const marketPrice = MARKET_PRICES[symbolKey] || inv.currentUnitPrice;
        return {
          ...inv,
          currentUnitPrice: marketPrice,
          updatedAt: todayKey()
        };
      });
      return { ...d, investments: updated };
    }, 'Đã cập nhật bảng giá thị trường mới nhất (1-Click)!');
    setRefreshing(false);
  };

  const handleSaveAsset = async () => {
    if (!form.symbol.trim() || Number(form.quantity) <= 0 || Number(form.totalCostBasis) <= 0) {
      notify('Vui lòng điền đầy đủ mã, số lượng và tổng vốn');
      return;
    }

    if (!isPro && investments.length >= 2) {
      setOpenModal(false);
      openPricing('Gói Free hỗ trợ theo dõi tối đa 2 mã đầu tư. Nâng cấp Pro để quản lý không giới hạn!');
      return;
    }

    const unitPrice =
      Number(form.currentUnitPrice) > 0
        ? Number(form.currentUnitPrice)
        : Math.round(Number(form.totalCostBasis) / Number(form.quantity));

    const newAsset: InvestmentAsset = {
      id: uid(),
      symbol: form.symbol.trim().toUpperCase(),
      name: form.name.trim() || form.symbol.trim().toUpperCase(),
      assetClass: form.assetClass,
      quantity: Number(form.quantity),
      totalCostBasis: Number(form.totalCostBasis),
      currentUnitPrice: unitPrice,
      annualYieldRate: form.annualYieldRate ? Number(form.annualYieldRate) : undefined,
      updatedAt: todayKey()
    };

    await update(d => ({
      ...d,
      investments: [...(d.investments || []), newAsset]
    }), `Đã thêm tài sản đầu tư: ${newAsset.symbol}`);

    setOpenModal(false);
    setForm({
      symbol: '',
      name: '',
      assetClass: 'stock',
      quantity: '100',
      totalCostBasis: '10000000',
      currentUnitPrice: '',
      annualYieldRate: ''
    });
  };

  const handleDeleteAsset = async () => {
    if (!deleting) return;
    await update(d => ({
      ...d,
      investments: (d.investments || []).filter(i => i.id !== deleting.id)
    }), `Đã xóa tài sản: ${deleting.symbol}`);
    setDeleting(null);
  };

  return (
    <>
      <PageHead
        eyebrow="TÀI SẢN & ĐẦU TƯ"
        title="Danh mục Đầu tư Thông minh"
        subtitle="Quản lý đa lớp tài sản (Cổ phiếu, Vàng, Crypto, Tiết kiệm), tự động cập nhật thị trường & thống kê Lãi/Lỗ (PnL)."
        actions={
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
              onClick={handleRefreshMarketPrices}
              sx={{ fontWeight: 700, borderColor: 'primary.main', color: 'primary.main' }}
            >
              Cập nhật giá thị trường 1-Click
            </Button>
            <Button
              variant="contained"
              size="small"
              color="primary"
              startIcon={<Plus size={14} />}
              onClick={() => setOpenModal(true)}
              sx={{ fontWeight: 700 }}
            >
              Thêm mã tài sản
            </Button>
          </Box>
        }
      />

      {/* Overview Metric Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        <Card variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: 'var(--bg-surface)' }}>
          <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>
            TỔNG GIÁ TRỊ HIỆN TẠI
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5, fontVariantNumeric: 'tabular-nums' }}>
            {money(summary.totalCurrentValue)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Cập nhật thẳng vào Tài sản ròng (Net Worth)
          </Typography>
        </Card>

        <Card variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: 'var(--bg-surface)' }}>
          <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>
            TỔNG VỐN ĐẦU TƯ
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5, fontVariantNumeric: 'tabular-nums' }}>
            {money(summary.totalCostBasis)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {investments.length} tài sản đang nắm giữ
          </Typography>
        </Card>

        <Card variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: 'var(--bg-surface)' }}>
          <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>
            TỔNG LÃI / LỖ (PNL)
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 900,
                color: summary.totalPnL >= 0 ? '#10b981' : '#ef4444',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {summary.totalPnL >= 0 ? `+${money(summary.totalPnL)}` : money(summary.totalPnL)}
            </Typography>
            <Chip
              icon={summary.totalPnL >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              label={`${summary.totalPnLPercent.toFixed(1)}%`}
              size="small"
              color={summary.totalPnL >= 0 ? 'success' : 'error'}
              sx={{ height: 22, fontWeight: 800, fontSize: 11 }}
            />
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Lợi nhuận toàn danh mục
          </Typography>
        </Card>
      </Box>

      {/* Asset Allocation Chart & Details */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 2fr' }, gap: 2.5, mb: 3 }}>
        {/* Allocation Donut */}
        <Card variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: 'var(--bg-surface)' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <PieChartIcon size={18} /> Cơ cấu phân bổ tài sản
          </Typography>
          {summary.allocationByClass.length > 0 ? (
            <>
              <Box sx={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.allocationByClass}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {summary.allocationByClass.map(entry => (
                        <Cell key={entry.assetClass} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(val: any) => money(Number(val || 0))} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{ display: 'grid', gap: 1, mt: 1 }}>
                {summary.allocationByClass.map(entry => (
                  <Box key={entry.assetClass} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: entry.color }} />
                      <span style={{ fontWeight: 600 }}>{entry.label}</span>
                    </Box>
                    <span style={{ fontWeight: 700 }}>
                      {money(entry.value)} ({summary.totalCurrentValue > 0 ? Math.round((entry.value / summary.totalCurrentValue) * 100) : 0}%)
                    </span>
                  </Box>
                ))}
              </Box>
            </>
          ) : (
            <Typography variant="body2" sx={{ color: 'var(--text-muted)', py: 4, textAlign: 'center' }}>
              Chưa có tài sản đầu tư nào
            </Typography>
          )}
        </Card>

        {/* Assets List */}
        <Card variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: 'var(--bg-surface)' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
            Danh sách mã tài sản ({investments.length})
          </Typography>

          <Box sx={{ display: 'grid', gap: 1.5 }}>
            {summary.assetsWithPnL.map(asset => (
              <Paper
                key={asset.id}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 1.5,
                  bgcolor: 'var(--bg-subtle)',
                  borderColor: 'var(--border-subtle)'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <AssetLogoBadge
                    symbol={asset.symbol}
                    assetClass={asset.assetClass}
                    name={asset.name}
                    size="large"
                  />
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: 14 }}>
                        {asset.symbol}
                      </Typography>
                      <Chip label={asset.assetClass.toUpperCase()} size="small" sx={{ height: 18, fontSize: 9.5, fontWeight: 700 }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {asset.name} • SL: <strong>{asset.quantity}</strong>
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
                    {money(asset.currentValue)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    Vốn: {money(asset.totalCostBasis)} (Giá: {money(asset.currentUnitPrice)})
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Chip
                    icon={asset.pnl >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    label={`${asset.pnl >= 0 ? '+' : ''}${money(asset.pnl)} (${asset.pnlPercent.toFixed(1)}%)`}
                    size="small"
                    color={asset.pnl >= 0 ? 'success' : 'error'}
                    sx={{ fontWeight: 800, fontSize: 11, height: 24 }}
                  />
                  <IconButton size="small" onClick={() => setDeleting(asset)} color="default">
                    <Trash2 size={14} />
                  </IconButton>
                </Box>
              </Paper>
            ))}

            {investments.length === 0 && (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'var(--text-muted)', mb: 2 }}>
                  Bạn chưa có tài sản đầu tư nào. Nhập câu lệnh ở trang chủ hoặc bấm thêm mã dưới đây.
                </Typography>
                <Button variant="contained" size="small" onClick={() => setOpenModal(true)} startIcon={<Plus size={14} />}>
                  Thêm tài sản đầu tư đầu tiên
                </Button>
              </Box>
            )}
          </Box>
        </Card>
      </Box>

      {/* Add Asset Dialog */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>Thêm tài sản đầu tư mới</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '14px !important' }}>
          <MuiSelect
            label="Loại tài sản"
            value={form.assetClass}
            onChange={val => setForm({ ...form, assetClass: val as InvestmentAsset['assetClass'] })}
            options={[
              { value: 'stock', label: 'Chứng khoán / Quỹ ETF' },
              { value: 'gold', label: 'Vàng SJC / 9999' },
              { value: 'crypto', label: 'Tài sản số (Crypto)' },
              { value: 'savings', label: 'Tiết kiệm gửi góp' },
              { value: 'real_estate', label: 'Bất động sản' }
            ]}
          />
          <MuiTextField
            label="Mã tài sản (Symbol)"
            placeholder="VD: FPT, SJC, BTC, HPG..."
            value={form.symbol}
            onChange={e => {
              const sym = e.target.value.toUpperCase();
              const marketPrice = MARKET_PRICES[sym];
              setForm({
                ...form,
                symbol: sym,
                name: form.name || sym,
                currentUnitPrice: marketPrice ? String(marketPrice) : form.currentUnitPrice
              });
            }}
            required
          />
          <MuiTextField
            label="Tên đầy đủ"
            placeholder="VD: Cổ phiếu FPT, Vàng miếng SJC"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
          <MuiTextField
            label="Số lượng (Cổ phiếu, chỉ/lượng, coin)"
            type="number"
            value={form.quantity}
            onChange={e => setForm({ ...form, quantity: e.target.value })}
            required
          />
          <MuiCurrencyInput
            label="Tổng vốn gốc đã mua (₫)"
            value={form.totalCostBasis}
            onChange={val => setForm({ ...form, totalCostBasis: val })}
          />
          <MuiCurrencyInput
            label="Giá thị trường đơn vị hiện tại (₫)"
            value={form.currentUnitPrice}
            onChange={val => setForm({ ...form, currentUnitPrice: val })}
          />
          {(form.assetClass === 'savings' || form.assetClass === 'real_estate') && (
            <MuiTextField
              label="Lãi suất tích lũy hàng năm (%/năm)"
              type="number"
              value={form.annualYieldRate}
              onChange={e => setForm({ ...form, annualYieldRate: e.target.value })}
              placeholder="VD: 6.5"
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenModal(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleSaveAsset}>
            Lưu vào danh mục
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      {deleting && (
        <Confirm
          open={!!deleting}
          title="Xác nhận xóa tài sản"
          message={`Bạn có chắc chắn muốn xóa mã "${deleting.symbol}" khỏi danh mục đầu tư?`}
          onConfirm={handleDeleteAsset}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
