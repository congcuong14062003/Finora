import { useMemo, useState } from 'react';
import {
  format,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subDays
} from 'date-fns';
import { Download, TrendingUp, TrendingDown, ChartNoAxesCombined } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Box, Button, Paper } from '@mui/material';

import { useFinance } from '../../store';
import {
  downloadCsv,
  inRange,
  money,
  netWorth,
  netWorthAt,
  shortMoney,
  totals
} from '../../lib/finance';
import { Empty, PageHead } from '../../components/ui';
import { canUsePeriodInReport, isProUser } from '../../lib/subscription';
import { MuiSelect, MuiDatePicker } from '../../components/mui/MuiInputs';

type Period = 'week' | 'month' | 'quarter' | 'year' | 'custom';

export default function Reports() {
  const data = useFinance(s => s.data)!;
  const openPricing = useFinance(s => s.openPricing);

  const [period, setPeriod] = useState<Period>('month');
  const [from, setFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [account, setAccount] = useState('all');
  const [category, setCategory] = useState('all');

  const isPro = isProUser(data);

  const handlePeriodChange = (newPeriod: Period) => {
    if (!canUsePeriodInReport(data, newPeriod)) {
      openPricing('Xem báo cáo đa kỳ (Tuần/Quý/Năm/Tùy chỉnh) là đặc quyền Tích Lộc Pro');
      return;
    }
    setPeriod(newPeriod);
  };

  const handleExportCsv = () => {
    if (!isPro) {
      openPricing('Xuất dữ liệu báo cáo chuyên sâu CSV/Excel là tính năng Tích Lộc Pro');
      return;
    }
    downloadCsv('tichloc-bao-cao.csv', csv);
  };

  const bounds = useMemo(() => {
    const now = new Date();
    if (period === 'custom') return { from, to };
    const financialDay = data.user.financialMonthStart || 1;
    const financialStart = new Date(
      now.getFullYear(),
      now.getMonth() - (now.getDate() < financialDay ? 1 : 0),
      financialDay
    );
    const start =
      period === 'week'
        ? startOfWeek(now, { weekStartsOn: 1 })
        : period === 'month'
        ? financialStart
        : period === 'quarter'
        ? startOfQuarter(now)
        : startOfYear(now);
    return { from: format(start, 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
  }, [period, from, to, data.user.financialMonthStart]);

  const filtered = data.transactions.filter(
    t =>
      inRange(t, bounds.from, bounds.to) &&
      (account === 'all' || t.accountId === account || t.toAccountId === account) &&
      (category === 'all' || t.categoryId === category)
  );

  const result = totals(filtered);
  const difference = result.income - result.expense;
  const duration = Math.max(
    1,
    Math.ceil((new Date(bounds.to).getTime() - new Date(bounds.from).getTime()) / 86400000) + 1
  );
  const priorFrom = format(subDays(new Date(bounds.from), duration), 'yyyy-MM-dd');
  const priorTo = format(subDays(new Date(bounds.from), 1), 'yyyy-MM-dd');
  const previous = totals(
    data.transactions.filter(
      t =>
        inRange(t, priorFrom, priorTo) &&
        (account === 'all' || t.accountId === account || t.toAccountId === account) &&
        (category === 'all' || t.categoryId === category)
    )
  );
  const expenseChange = previous.expense
    ? Math.round(((result.expense - previous.expense) / previous.expense) * 100)
    : 0;

  const categories = data.categories
    .filter(c => c.type === 'expense')
    .map(c => ({
      name: c.name,
      value: filtered
        .filter(t => t.type === 'expense' && t.status === 'completed' && t.categoryId === c.id)
        .reduce((n, t) => n + t.amount, 0),
      color: c.color
    }))
    .filter(c => c.value > 0)
    .sort((a, b) => b.value - a.value);

  const trend = useMemo(() => {
    const map = new Map<string, { date: string; income: number; expense: number }>();
    for (const t of filtered) {
      if (t.type === 'transfer' || t.status !== 'completed') continue;
      const key = period === 'week' || period === 'month' ? t.date.slice(5, 10) : t.date.slice(0, 7);
      const row = map.get(key) || { date: key, income: 0, expense: 0 };
      row[t.type] += t.amount;
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered, period]);

  const worthDates = [
    ...new Set([
      bounds.from,
      ...filtered.filter(t => t.status === 'completed').map(t => t.date),
      bounds.to
    ])
  ].sort();
  const worthTrend = worthDates.map(date => ({ date, net: netWorthAt(data, date) }));

  const csv = [
    ['Khoảng thời gian', bounds.from, bounds.to],
    ['Thu nhập', result.income],
    ['Chi tiêu', result.expense],
    ['Chênh lệch', difference],
    [],
    ['Danh mục', 'Số tiền'],
    ...categories.map(c => [c.name, c.value])
  ];

  return (
    <>
      <PageHead
        eyebrow="PHÂN TÍCH TÀI CHÍNH"
        title="Báo cáo"
        subtitle="Báo cáo phân tích chuyên sâu các chỉ số dòng tiền và tài sản ròng."
        actions={
          <Button
            variant="contained"
            color="primary"
            startIcon={<Download size={14} />}
            onClick={handleExportCsv}
          >
            Xuất báo cáo CSV {!isPro && '(Pro)'}
          </Button>
        }
      />

      {/* Filter Bar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 2
          }}
        >
          <MuiSelect
            label="Kỳ báo cáo"
            value={period}
            onChange={val => handlePeriodChange(val as Period)}
            options={[
              { value: 'month', label: 'Tháng này' },
              { value: 'week', label: 'Tuần này (Pro)' },
              { value: 'quarter', label: 'Quý này (Pro)' },
              { value: 'year', label: 'Năm nay (Pro)' },
              { value: 'custom', label: 'Tùy chỉnh khoảng ngày (Pro)' }
            ]}
          />

          <MuiSelect
            label="Lọc tài khoản"
            value={account}
            onChange={val => setAccount(val)}
            options={[
              { value: 'all', label: 'Mọi tài khoản' },
              ...data.accounts.map(a => ({ value: a.id, label: a.name }))
            ]}
          />

          <MuiSelect
            label="Lọc danh mục"
            value={category}
            onChange={val => setCategory(val)}
            options={[
              { value: 'all', label: 'Mọi danh mục' },
              ...data.categories.map(c => ({ value: c.id, label: c.name }))
            ]}
          />
        </Box>

        {period === 'custom' && (
          <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
            <Box sx={{ minWidth: 160 }}>
              <MuiDatePicker label="Từ ngày" value={from} onChange={val => setFrom(val)} />
            </Box>
            <Box sx={{ minWidth: 160 }}>
              <MuiDatePicker label="Đến ngày" value={to} onChange={val => setTo(val)} />
            </Box>
          </Box>
        )}
      </Paper>

      {/* Stats Summary */}
      <div className="grid-stats">
        <div className="card stat">
          <div className="stat-top">
            <span className="stat-label">Tổng thu nhập</span>
            <span className="stat-icon" style={{ color: '#15966B', background: 'transparent' }}>
              <TrendingUp />
            </span>
          </div>
          <div className="stat-value positive">{money(result.income)}</div>
          <div className="stat-meta">Kỳ trước: {money(previous.income)}</div>
        </div>
        <div className="card stat">
          <div className="stat-top">
            <span className="stat-label">Tổng chi tiêu</span>
            <span className="stat-icon" style={{ color: '#D65B58', background: 'transparent' }}>
              <TrendingDown />
            </span>
          </div>
          <div className="stat-value negative">{money(result.expense)}</div>
          <div className="stat-meta">
            {expenseChange >= 0 ? '+' : ''}
            {expenseChange}% so với kỳ trước
          </div>
        </div>
        <div className="card stat">
          <div className="stat-top">
            <span className="stat-label">Chênh lệch thu chi</span>
            <span className="stat-icon" style={{ color: '#4E7BC5', background: 'transparent' }}>
              <ChartNoAxesCombined />
            </span>
          </div>
          <div className="stat-value">{money(difference)}</div>
          <div className="stat-meta">
            Tỷ lệ tiết kiệm: {result.income ? Math.round((difference / result.income) * 100) : 0}%
          </div>
        </div>
        <div className="card stat">
          <span className="stat-label">Tài sản ròng hiện tại</span>
          <div className="stat-value">{money(netWorth(data))}</div>
          <div className="stat-meta">Tất cả tài khoản và dư nợ</div>
        </div>
      </div>

      {/* Charts */}
      <div className="rowcharts">
        <div className="card pad">
          <div className="section-head">
            <div>
              <h3>Xu hướng thu chi</h3>
              <small>
                Từ {bounds.from} đến {bounds.to}
              </small>
            </div>
          </div>
          <div className="chart-box">
            {trend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ left: -15 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={shortMoney} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={v => money(Number(v))} cursor={false} />
                  <Bar dataKey="income" name="Thu nhập" fill="#15966B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Chi tiêu" fill="#D65B58" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty />
            )}
          </div>
        </div>

        <div className="card pad">
          <div className="section-head">
            <h3>Danh mục chi tiêu</h3>
            <small>{categories.length ? categories[0].name + ' chiếm tỷ trọng lớn nhất' : ''}</small>
          </div>
          {categories.length ? (
            categories.map(c => (
              <div className="progress-row" key={c.name}>
                <div className="top">
                  <strong>{c.name}</strong>
                  <span>{money(c.value)}</span>
                </div>
                <div className="progress">
                  <span style={{ width: `${(c.value / (result.expense || 1)) * 100}%`, background: c.color }} />
                </div>
              </div>
            ))
          ) : (
            <Empty />
          )}
        </div>
      </div>

      <div className="card pad" style={{ marginTop: 15 }}>
        <div className="section-head">
          <div>
            <h3>Biến động tài sản ròng</h3>
            <small>Số dư tài khoản cộng các khoản cần thu, trừ các khoản cần trả</small>
          </div>
        </div>
        <div className="chart-box" style={{ height: 230 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={worthTrend} margin={{ left: -14, right: 15 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={shortMoney} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={v => money(Number(v))} />
              <Line
                type="monotone"
                dataKey="net"
                name="Tài sản ròng"
                stroke="#20705B"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
