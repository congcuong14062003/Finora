import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  CircleDollarSign,
  ChartNoAxesCombined,
  Target,
  HandCoins,
  CalendarClock,
  Settings,
  Sun,
  Moon,
  Bell,
  Menu,
  X,
  Plus,
  ChartPie,
  Search,
  Crown,
  Flame,
  CheckCircle
} from 'lucide-react';
import {
  Button,
  Chip,
  Snackbar,
  Alert,
  Tooltip,
  Box,
  IconButton
} from '@mui/material';
import { useFinance } from '../store';
import { isProUser } from '../lib/subscription';
import { updateStreak, autoExecuteRecurring } from '../lib/habit';
import { todayKey, uid } from '../lib/finance';
import { PricingDialog } from './PricingDialog';

const nav = [
  ['/', 'Tổng quan', LayoutDashboard],
  ['/transactions', 'Giao dịch', ArrowLeftRight],
  ['/accounts', 'Tài khoản', Wallet],
  ['/categories', 'Danh mục', CircleDollarSign],
  ['/budgets', 'Ngân sách', ChartPie],
  ['/savings', 'Tiết kiệm', Target],
  ['/debts', 'Khoản nợ', HandCoins],
  ['/reports', 'Báo cáo', ChartNoAxesCombined],
  ['/recurring', 'Định kỳ', CalendarClock],
  ['/settings', 'Cài đặt', Settings]
] as const;

export function Layout() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [notis, setNotis] = useState(false);
  const {
    data,
    theme,
    setTheme,
    toast,
    clearToast,
    update,
    notify,
    pricingOpen,
    pricingFeature,
    openPricing,
    closePricing
  } = useFinance();
  const loc = useLocation();
  const navigate = useNavigate();

  const title = nav.find(n => n[0] === loc.pathname)?.[1] || 'Finora';
  const isPro = data ? isProUser(data) : false;

  // Auto-Execute Recurring Transactions on Startup
  useEffect(() => {
    if (!data) return;
    const { updatedRecurring, newTransactions, executedCount } = autoExecuteRecurring(data);
    if (executedCount > 0) {
      void update(d => ({
        ...d,
        transactions: [...newTransactions, ...d.transactions],
        recurring: updatedRecurring
      }));
      notify(`🤖 Đã tự động ghi nhận ${executedCount} giao dịch định kỳ đến hạn hôm nay!`);
    }
  }, [data?.recurring?.length]);

  // Handle 0đ check-in to preserve streak
  const handleZeroSpendCheckIn = async () => {
    if (!data) return;
    const today = todayKey();
    if (data.user.lastCheckInDate === today) {
      notify('Hôm nay bạn đã duy trì chuỗi ghi chép rồi! 🔥');
      return;
    }

    const streakResult = updateStreak(data.user, today);
    const checkInTx = {
      id: uid(),
      name: 'Check-in 0đ (Không tiêu gì)',
      amount: 0,
      type: 'expense' as const,
      categoryId: 'food',
      accountId: data.user.defaultAccountId || data.accounts[0]?.id || 'wallet',
      date: today,
      method: 'Check-in 0đ',
      note: 'Giữ chuỗi ngày không phát sinh chi tiêu',
      status: 'completed' as const
    };

    await update(d => ({
      ...d,
      transactions: [checkInTx, ...d.transactions],
      user: {
        ...d.user,
        streakCount: streakResult.streakCount,
        lastCheckInDate: streakResult.lastCheckInDate
      }
    }));

    notify(`🔥 Chúc mừng! Bạn đã giữ chuỗi ngày thành công: ${streakResult.streakCount} ngày liên tiếp.`);
  };

  const streak = data?.user.streakCount || 1;
  const isCheckedInToday = data?.user.lastCheckInDate === todayKey();

  return (
    <div className={theme}>
      <div className="app">
        <div className={`mobile-overlay ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />

        {/* Sidebar */}
        <aside className={`sidebar ${open ? 'open' : ''}`}>
          <div className="brand">
            <span className="brandmark">F</span>
            <span>finora</span>
            {isPro && (
              <Chip
                label="PRO"
                size="small"
                sx={{
                  ml: 0.5,
                  height: 18,
                  fontSize: 9.5,
                  fontWeight: 800,
                  bgcolor: 'rgba(245, 158, 11, 0.15)',
                  color: '#f59e0b',
                  border: '1px solid rgba(245, 158, 11, 0.3)'
                }}
              />
            )}
            <button
              className="iconbtn mobile-toggle"
              style={{ marginLeft: 'auto' }}
              onClick={() => setOpen(false)}
              aria-label="Đóng menu"
            >
              <X size={16} />
            </button>
          </div>

          {!isPro && (
            <Box sx={{ px: 1, mb: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                size="small"
                startIcon={<Crown size={14} color="#f59e0b" />}
                onClick={() => openPricing('Mở khóa gói cước Finora Pro')}
                sx={{
                  color: 'text.primary',
                  borderColor: 'rgba(245, 158, 11, 0.4)',
                  fontSize: 12,
                  fontWeight: 700,
                  py: 0.7,
                  '&:hover': {
                    borderColor: '#f59e0b',
                    bgcolor: 'rgba(245, 158, 11, 0.05)'
                  }
                }}
              >
                Nâng cấp Pro 👑
              </Button>
            </Box>
          )}

          <div className="navlabel">Không gian của bạn</div>
          <nav aria-label="Điều hướng chính">
            {nav.slice(0, 4).map(([url, label, Icon]) => (
              <NavLink
                key={url}
                to={url}
                end={url === '/'}
                className={({ isActive }) => `navlink ${isActive ? 'active' : ''}`}
                onClick={() => setOpen(false)}
              >
                <Icon />
                {label}
              </NavLink>
            ))}
            <div className="navlabel">Kế hoạch tài chính</div>
            {nav.slice(4, 9).map(([url, label, Icon]) => (
              <NavLink
                key={url}
                to={url}
                className={({ isActive }) => `navlink ${isActive ? 'active' : ''}`}
                onClick={() => setOpen(false)}
              >
                <Icon />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="sidebottom">
            <NavLink
              to="/settings"
              className={({ isActive }) => `navlink ${isActive ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <Settings />
              Cài đặt
            </NavLink>
            <div className="profile">
              <div className="avatar">
                {isPro ? '👑' : 'MA'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {data?.user.name}
                  {isPro && <Crown size={12} color="#f59e0b" />}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                  {isPro ? 'Gói Pro Cao Cấp' : 'Gói Cơ Bản (Free)'}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="main">
          <header className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                className="iconbtn mobile-toggle"
                aria-label="Mở menu"
                onClick={() => setOpen(true)}
              >
                <Menu size={16} />
              </button>
              <div>
                <div className="crumb">Finora / Sổ tài chính</div>
                <h1>{title}</h1>
              </div>
            </div>

            <div className="topactions">
              {/* Daily Streak Badge */}
              <Tooltip title={isCheckedInToday ? 'Hôm nay bạn đã ghi chép!' : 'Chưa ghi chép hôm nay'}>
                <Chip
                  icon={<Flame size={14} style={{ color: '#ef4444' }} />}
                  label={`${streak} ngày liên tiếp`}
                  size="small"
                  sx={{
                    fontWeight: 750,
                    fontSize: 11.5,
                    bgcolor: 'rgba(239, 68, 68, 0.08)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    height: 28,
                    cursor: 'default'
                  }}
                />
              </Tooltip>

              {/* 0đ Check-in Button */}
              <Button
                variant="outlined"
                size="small"
                onClick={handleZeroSpendCheckIn}
                startIcon={<CheckCircle size={13} />}
                sx={{
                  display: { xs: 'none', sm: 'inline-flex' },
                  fontSize: 11.5,
                  fontWeight: 650,
                  height: 28,
                  borderColor: 'var(--border-subtle)',
                  color: 'text.secondary',
                  '&:hover': {
                    borderColor: 'primary.main',
                    color: 'primary.main'
                  }
                }}
              >
                Hôm nay 0đ
              </Button>

              {/* Fast search pill */}
              <Box
                component="form"
                onSubmit={e => {
                  e.preventDefault();
                  navigate('/transactions?search=' + encodeURIComponent(query));
                }}
                sx={{
                  display: { xs: 'none', md: 'flex' },
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 0.4,
                  borderRadius: 1.5,
                  bgcolor: 'action.hover',
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Search size={13} style={{ color: 'var(--text-muted)' }} />
                <Box
                  component="input"
                  value={query}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                  placeholder="Tìm giao dịch..."
                  sx={{
                    border: 'none',
                    outline: 'none',
                    bgcolor: 'transparent',
                    fontSize: 12,
                    width: 130,
                    color: 'inherit',
                    fontFamily: 'inherit'
                  }}
                />
              </Box>

              {/* Theme toggle */}
              <IconButton
                size="small"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                sx={{ color: 'text.primary', border: '1px solid var(--border-subtle)', width: 32, height: 32 }}
                aria-label="Đổi giao diện"
              >
                {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
              </IconButton>

              {/* Notifications */}
              <div style={{ position: 'relative' }}>
                <IconButton
                  size="small"
                  onClick={() => setNotis(!notis)}
                  sx={{ color: 'text.primary', border: '1px solid var(--border-subtle)', width: 32, height: 32 }}
                  aria-label="Thông báo"
                >
                  <Bell size={15} />
                </IconButton>
                {notis && (
                  <div className="card pad" style={{ position: 'absolute', right: 0, top: 43, width: 280, zIndex: 40, boxShadow: '0 12px 36px rgba(0,0,0,0.15)' }}>
                    <div className="section-head">
                      <h3>Thông báo</h3>
                    </div>
                    {data?.notifications.map(n => (
                      <div className="mini-row" key={n.id} style={{ padding: '8px 0', fontSize: 12 }}>
                        <span>{n.title}</span>
                        {!n.read && <span className="dot" style={{ background: '#10b981' }} />}
                      </div>
                    ))}
                    <Button
                      fullWidth
                      size="small"
                      variant="outlined"
                      sx={{ mt: 1 }}
                      onClick={() => {
                        update(d => ({
                          ...d,
                          notifications: d.notifications.map(n => ({ ...n, read: true }))
                        }));
                        setNotis(false);
                      }}
                    >
                      Đánh dấu đã đọc
                    </Button>
                  </div>
                )}
              </div>

              {/* Add transaction quick button */}
              <Button
                variant="contained"
                size="small"
                color="primary"
                startIcon={<Plus size={14} />}
                onClick={() => navigate('/transactions?add=1')}
                sx={{ display: { xs: 'none', sm: 'inline-flex' }, height: 32, px: 1.5 }}
              >
                Giao dịch
              </Button>
            </div>
          </header>

          <main className="content">
            <Outlet />
          </main>
        </div>

        {/* Global Snackbar with Undo */}
        <Snackbar
          open={!!toast}
          autoHideDuration={5000}
          onClose={clearToast}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          {toast ? (
            <Alert
              onClose={clearToast}
              severity={toast.severity || 'success'}
              variant="filled"
              action={
                toast.actionLabel && toast.onAction ? (
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => {
                      toast.onAction?.();
                      clearToast();
                    }}
                    sx={{ fontWeight: 800, textDecoration: 'underline' }}
                  >
                    {toast.actionLabel}
                  </Button>
                ) : undefined
              }
              sx={{ width: '100%', borderRadius: 2, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}
            >
              {toast.message}
            </Alert>
          ) : undefined}
        </Snackbar>

        {/* Paywall / Pricing Dialog */}
        <PricingDialog
          open={pricingOpen}
          onClose={closePricing}
          initialFeatureHighlight={pricingFeature}
        />
      </div>
    </div>
  );
}
