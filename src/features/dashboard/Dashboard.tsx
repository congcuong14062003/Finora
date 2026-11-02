import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { differenceInCalendarDays, format, parseISO, subDays } from 'date-fns';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  Plus,
  ArrowRight,
  CalendarDays,
  Lightbulb
} from 'lucide-react';
import { Box, Button } from '@mui/material';

import { useFinance } from '../../store';
import {
  balance,
  budgetSpent,
  dateLabel,
  goalSaved,
  inRange,
  money,
  netWorthAt,
  rangeFor,
  monthKey,
  shortMoney,
  totals,
  type RangeKey
} from '../../lib/finance';
import { PageHead, Progress, Empty } from '../../components/ui';
import { MagicQuickBar } from '../../components/MagicQuickBar';
import { SafeToSpendCard } from '../../components/SafeToSpendCard';
import { RiskAlertsCard } from '../../components/RiskAlertsCard';
import { FinancialFreedomCard } from '../../components/FinancialFreedomCard';
import { MuiDatePicker, MuiSelect } from '../../components/mui/MuiInputs';
import { BankLogoBadge, CategoryAvatarBadge } from '../../lib/brandBadges';
import type { Transaction } from '../../types';

const rangeNames: { key: RangeKey; label: string }[] = [
  { key: 'week', label: 'Tuần này' },
  { key: 'month', label: 'Tháng này' },
  { key: '3months', label: '3 tháng' },
  { key: '6months', label: '6 tháng' },
  { key: 'year', label: 'Năm nay' },
  { key: 'custom', label: 'Tùy chỉnh' }
];

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid var(--border-subtle)',
  backgroundColor: 'var(--bg-surface)',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-primary)'
};

export default function Dashboard() {
  const data = useFinance(s => s.data)!;
  const openPricing = useFinance(s => s.openPricing);
  const [range, setRange] = useState<RangeKey>('month');
  const [custom, setCustom] = useState(rangeFor('month'));

  const bounds = rangeFor(range, custom, data.user.financialMonthStart);
  const filtered = useMemo(
    () => data.transactions.filter(t => inRange(t, bounds.from, bounds.to)),
    [data.transactions, bounds.from, bounds.to]
  );

  const { income, expense } = totals(filtered);
  const days = Math.max(
    1,
    differenceInCalendarDays(parseISO(bounds.to), parseISO(bounds.from)) + 1
  );
  const priorTo = format(subDays(parseISO(bounds.from), 1), 'yyyy-MM-dd');
  const priorFrom = format(subDays(parseISO(bounds.from), days), 'yyyy-MM-dd');
  const previous = totals(data.transactions.filter(t => inRange(t, priorFrom, priorTo)));

  const totalBalance = data.accounts.reduce(
    (n, a) => n + balance(a, data.transactions.filter(t => t.date <= bounds.to)),
    0
  );
  const previousBalance = data.accounts.reduce(
    (n, a) => n + balance(a, data.transactions.filter(t => t.date <= priorTo)),
    0
  );

  const savedAt = (to: string) =>
    data.goals.reduce(
      (n, g) =>
        n + g.contributions.filter(c => c.date <= to).reduce((sum, c) => sum + c.amount, 0),
      0
    );
  const saved = savedAt(bounds.to);
  const previousSaved = savedAt(priorTo);

  const rate = income ? Math.round(((income - expense) / income) * 100) : 0;
  const previousRate = previous.income
    ? Math.round(((previous.income - previous.expense) / previous.income) * 100)
    : 0;

  const pct = (now: number, before: number) =>
    before ? `${now >= before ? '+' : ''}${Math.round(((now - before) / Math.abs(before)) * 100)}%` : '—';

  const series = useMemo(() => {
    const dayMap = new Map<string, { date: string; income: number; expense: number }>();
    for (const t of filtered) {
      if (t.type === 'transfer' || t.status !== 'completed') continue;
      const key = range === 'week' || range === 'month' ? t.date.slice(5, 10) : t.date.slice(0, 7);
      const row = dayMap.get(key) || { date: key, income: 0, expense: 0 };
      row[t.type] += t.amount;
      dayMap.set(key, row);
    }
    return [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered, range]);

  const category = useMemo(() => {
    const map = new Map<string, number>();
    filtered
      .filter(t => t.type === 'expense' && t.status === 'completed')
      .forEach(t => map.set(t.categoryId || 'other', (map.get(t.categoryId || 'other') || 0) + t.amount));
    return [...map]
      .map(([id, value]) => ({
        name: data.categories.find(c => c.id === id)?.name || 'Khác',
        value,
        color: data.categories.find(c => c.id === id)?.color || '#94a3b8'
      }))
      .sort((a, b) => b.value - a.value);
  }, [filtered, data.categories]);

  const monthSeries = useMemo(() => {
    const months = new Map<string, { date: string; income: number; expense: number; net: number }>();
    let running = data.accounts.reduce((n, a) => n + a.openingBalance, 0);
    for (const t of [...data.transactions].sort((a, b) => a.date.localeCompare(b.date))) {
      if (t.status !== 'completed' || t.type === 'transfer') continue;
      const key = t.date.slice(0, 7);
      const row = months.get(key) || { date: key, income: 0, expense: 0, net: running };
      row[t.type] += t.amount;
      running += t.type === 'income' ? t.amount : -t.amount;
      row.net = netWorthAt(data, key + '-31');
      months.set(key, row);
    }
    return [...months.values()].filter(
      x => x.date >= bounds.from.slice(0, 7) && x.date <= bounds.to.slice(0, 7)
    );
  }, [data, bounds.from, bounds.to]);

  const recent = [...filtered].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const warn = data.budgets.filter(b => budgetSpent(b, data.transactions) / b.limit >= 0.8);

  const cards = [
    { label: 'Tổng số dư', value: totalBalance, note: 'Tất cả tài khoản', delta: pct(totalBalance, previousBalance) },
    { label: 'Thu nhập', value: income, note: 'Trong khoảng đã chọn', delta: pct(income, previous.income), isIncome: true },
    { label: 'Chi tiêu', value: expense, note: 'Trong khoảng đã chọn', delta: pct(expense, previous.expense), isExpense: true },
    { label: 'Tài sản ròng', value: netWorthAt(data, bounds.to), note: 'Số dư ± dư nợ', delta: pct(netWorthAt(data, bounds.to), netWorthAt(data, priorTo)) },
    { label: 'Dành cho mục tiêu', value: saved, note: 'Tổng tiền đóng góp', delta: pct(saved, previousSaved) },
    { label: 'Tỷ lệ tiết kiệm', value: rate, note: 'Thu nhập trừ chi tiêu', percent: true, delta: pct(rate, previousRate) }
  ];

  return (
    <>
      <PageHead
        eyebrow="TỔNG QUAN TÀI CHÍNH"
        title={`Chào, ${data.user.name}`}
        subtitle="Một góc nhìn rõ ràng, chính xác về dòng tiền và kế hoạch tài chính của bạn."
        actions={
          <>
            <Box sx={{ width: 140 }}>
              <MuiSelect
                label="Khoảng thời gian"
                value={range}
                onChange={val => setRange(val as RangeKey)}
                options={rangeNames.map(x => ({ value: x.key, label: x.label }))}
              />
            </Box>
            <Link to="/transactions?add=1" style={{ textDecoration: 'none' }}>
              <Button variant="contained" color="primary" startIcon={<Plus size={15} />}>
                Giao dịch mới
              </Button>
            </Link>
          </>
        }
      />

      {/* Habit Loop: Magic Quick-Bar */}
      <MagicQuickBar onOpenPricing={openPricing} />

      {/* Executive Bento Grid: Safe-To-Spend & Financial Freedom side-by-side */}
      <div className="dashboard-bento">
        <SafeToSpendCard />
        <FinancialFreedomCard />
      </div>

      {/* Risk Alert Engine & Smart Budget Rebalancer */}
      <RiskAlertsCard />

      {range === 'custom' && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
          <Box sx={{ minWidth: 170 }}>
            <MuiDatePicker
              label="Từ ngày"
              value={custom.from}
              onChange={val => setCustom({ ...custom, from: val })}
            />
          </Box>
          <Box sx={{ minWidth: 170 }}>
            <MuiDatePicker
              label="Đến ngày"
              value={custom.to}
              onChange={val => setCustom({ ...custom, to: val })}
            />
          </Box>
        </Box>
      )}

      {/* Grid of Key Financial Stats (Anti-Slop: Type, not tiles) */}
      <div className="grid-stats">
        {cards.map(({ label, value, note, percent, delta, isIncome, isExpense }) => (
          <div className="card stat" key={label}>
            <div className="stat-top">
              <span className="stat-label">{label}</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: delta.startsWith('+') ? 'var(--accent-income)' : delta.startsWith('-') ? 'var(--accent-expense)' : 'var(--text-muted)'
                }}
              >
                {delta}
              </span>
            </div>
            <div
              className={`stat-value ${
                isIncome ? 'positive' : isExpense ? 'negative' : ''
              }`}
            >
              {percent ? value + '%' : money(value)}
            </div>
            <div className="stat-meta">{note}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="rowcharts">
        <section className="card pad">
          <div className="section-head">
            <div>
              <h3>Thu nhập & chi tiêu</h3>
              <small>Diễn biến theo ngày trong kỳ đã chọn</small>
            </div>
            <div className="legend">
              <span>
                <i className="dot" style={{ background: '#15966B' }} />
                Thu nhập
              </span>
              <span>
                <i className="dot" style={{ background: '#D65B58' }} />
                Chi tiêu
              </span>
            </div>
          </div>
          <div className="chart-box">
            {series.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 7, bottom: 0, left: -18 }}>
                  <defs>
                    <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#15966B" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#15966B" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border-subtle)" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={shortMoney} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={v => money(Number(v))} contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="income" name="Thu nhập" stroke="#15966B" strokeWidth={2} fill="url(#gIncome)" />
                  <Area type="monotone" dataKey="expense" name="Chi tiêu" stroke="#D65B58" strokeWidth={2} fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty />
            )}
          </div>
        </section>

        <section className="card pad">
          <div className="section-head">
            <div>
              <h3>Chi tiêu theo danh mục</h3>
              <small>Tỷ trọng chi tiêu trong kỳ</small>
            </div>
          </div>
          {category.length ? (
            <>
              <div className="chart-box" style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={category} dataKey="value" innerRadius={58} outerRadius={78} paddingAngle={2}>
                      {category.map(c => (
                        <Cell key={c.name} fill={c.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={v => money(Number(v))} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mini-list" style={{ marginTop: 8 }}>
                {category.slice(0, 3).map(c => (
                  <div className="mini-row" key={c.name}>
                    <span className="mini-name">
                      <i className="dot" style={{ background: c.color }} />
                      {c.name}
                    </span>
                    <span className="mini-amount">{money(c.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty />
          )}
        </section>
      </div>

      {/* Recent & Budgets Row */}
      <div className="rowbottom">
        <section className="card pad">
          <div className="section-head">
            <h3>Giao dịch gần đây</h3>
            <Link to="/transactions" className="positive" style={{ fontSize: 11.5, fontWeight: 700 }}>
              Xem tất cả <ArrowRight size={12} style={{ display: 'inline' }} />
            </Link>
          </div>
          <div className="mini-list">
            {recent.length ? (
              recent.map((t: Transaction) => (
                <div className="mini-row" key={t.id}>
                  <div className="mini-left">
                    <CategoryAvatarBadge
                      categoryId={t.categoryId}
                      categoryName={data.categories.find(c => c.id === t.categoryId)?.name}
                      txType={t.type}
                    />
                    <div>
                      <div className="mini-name">{t.name}</div>
                      <div className="mini-sub" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <BankLogoBadge accountName={data.accounts.find(a => a.id === t.accountId)?.name} accountType={data.accounts.find(a => a.id === t.accountId)?.type} size="small" />
                        <span>{data.categories.find(c => c.id === t.categoryId)?.name || 'Chuyển khoản'} · {dateLabel(t.date)}</span>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`mini-amount ${
                      t.type === 'income' ? 'positive' : t.type === 'expense' ? 'negative' : ''
                    }`}
                  >
                    {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}
                    {money(t.amount)}
                  </div>
                </div>
              ))
            ) : (
              <Empty />
            )}
          </div>
        </section>

        <section className="card pad">
          <div className="section-head">
            <h3>Ngân sách tháng này</h3>
            <Link to="/budgets" className="positive" style={{ fontSize: 11.5, fontWeight: 700 }}>
              Chi tiết <ArrowRight size={12} style={{ display: 'inline' }} />
            </Link>
          </div>
          {data.budgets
            .filter(b => b.month === monthKey(new Date()))
            .map(b => {
              const spent = budgetSpent(b, data.transactions);
              const pctSpent = (spent / b.limit) * 100;
              return (
                <div className="progress-row" key={b.id}>
                  <div className="top">
                    <strong>{b.name}</strong>
                    <span className={pctSpent >= 100 ? 'negative' : pctSpent >= 80 ? 'warning' : ''}>
                      {Math.round(pctSpent)}% · {shortMoney(spent)} / {shortMoney(b.limit)}
                    </span>
                  </div>
                  <Progress
                    value={pctSpent}
                    color={pctSpent >= 100 ? '#ef4444' : pctSpent >= 80 ? '#f59e0b' : '#10b981'}
                  />
                </div>
              );
            })}
        </section>
      </div>

      {/* Cashflow Bar Chart & Insights */}
      <div className="rowbottom">
        <section className="card pad">
          <div className="section-head">
            <h3>Dòng tiền từng tháng</h3>
            <small>Thu nhập và chi tiêu thực tế</small>
          </div>
          <div className="chart-box" style={{ height: 210 }}>
            {monthSeries.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthSeries} margin={{ left: -18 }}>
                  <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={shortMoney} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={v => money(Number(v))} contentStyle={tooltipStyle} cursor={false} />
                  <Bar name="Thu nhập" dataKey="income" fill="#15966B" radius={[3, 3, 0, 0]} />
                  <Bar name="Chi tiêu" dataKey="expense" fill="#D65B58" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty />
            )}
          </div>
        </section>

        <section className="card pad">
          <div className="section-head">
            <h3>Kế hoạch & nhắc nhở</h3>
            <Lightbulb size={16} color="#f59e0b" />
          </div>
          <div className="mini-list">
            <div className="mini-row">
              <span className="mini-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Lightbulb size={13} style={{ color: 'var(--accent-warning)', flexShrink: 0 }} />
                <span>{category.length ? `Chi lớn nhất: ${category[0].name} (${money(category[0].value)})` : 'Chưa có chi tiêu trong kỳ đã chọn'}</span>
              </span>
            </div>
            {warn.slice(0, 2).map(b => (
              <div className="mini-row" key={b.id}>
                <span className="mini-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--accent-warning)', display: 'inline-flex' }}>!</span>
                  <span>{b.name} đã dùng {Math.round((budgetSpent(b, data.transactions) / b.limit) * 100)}%</span>
                </span>
              </div>
            ))}
            {data.goals.slice(0, 2).map(g => (
              <div className="mini-row" key={g.id}>
                <span className="mini-name">{g.name}</span>
                <span className="mini-amount">{Math.round((goalSaved(g) / g.target) * 100)}%</span>
              </div>
            ))}
            {data.recurring
              .filter(r => r.active)
              .slice(0, 2)
              .map(r => (
                <div className="mini-row" key={r.id}>
                  <span className="mini-left">
                    <CalendarDays size={14} style={{ color: 'var(--accent-transfer)' }} />
                    <span className="mini-name">{r.name}</span>
                  </span>
                  <span className="mini-sub">{dateLabel(r.nextDate)}</span>
                </div>
              ))}
          </div>
        </section>
      </div>

      {/* Net Worth Chart */}
      <div className="card pad">
        <div className="section-head">
          <h3>Tài sản ròng theo thời gian</h3>
          <small>Dựa trên số dư đầu kỳ và giao dịch đã hoàn tất</small>
        </div>
        <div className="chart-box" style={{ height: 210 }}>
          {monthSeries.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthSeries} margin={{ left: -14, right: 15 }}>
                <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={shortMoney} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={v => money(Number(v))} contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="net"
                  name="Giá trị tài khoản"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </div>
      </div>
    </>
  );
}
