import React, { useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import { Layout } from './components/Layout';
import Dashboard from './features/dashboard/Dashboard';
import Transactions from './features/transactions/Transactions';
import Accounts from './features/accounts/Accounts';
import Categories from './features/categories/Categories';
import Budgets from './features/budgets/Budgets';
import Savings from './features/savings/Savings';
import Debts from './features/debts/Debts';
import Reports from './features/reports/Reports';
import Recurring from './features/recurring/Recurring';
import Settings from './features/settings/Settings';
import Assets from './features/assets/Assets';
import Auth from './features/auth/Auth';
import { useFinance } from './store';
import { registerFinanceTools } from './lib/webmcp';
import { getFinoraTheme } from './theme/muiTheme';
import { fetchVietQRBanks } from './lib/bankService';
import './styles.css';

function Loading() {
  return (
    <div className="app" style={{ display: 'flex', minHeight: '100vh' }}>
      <div className="sidebar" />
      <div className="main" style={{ width: '100%' }}>
        <div className="topbar" />
        <main className="content">
          <div className="skeleton" style={{ height: 32, width: 260, marginBottom: 26 }} />
          <div className="grid-stats">
            {Array.from({length: 4}, (_, i) => (
              <div className="card stat" key={i}>
                <div className="skeleton" style={{ height: 17, width: '48%' }} />
                <div className="skeleton" style={{ height: 29, width: '78%', marginTop: 23 }} />
              </div>
            ))}
          </div>
          <div className="rowcharts">
            <div className="card pad"><div className="skeleton" style={{ height: 240 }} /></div>
            <div className="card pad"><div className="skeleton" style={{ height: 240 }} /></div>
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  const { load, loading, error, theme } = useFinance();

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    void fetchVietQRBanks();
    return registerFinanceTools();
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const muiTheme = useMemo(() => getFinoraTheme(theme), [theme]);

  if (loading) return <Loading />;
  if (error) {
    return (
      <div className="app" style={{ padding: 40 }}>
        <div className="card pad">
          {error}
          <button className="btn" onClick={load}>Thử lại</button>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider theme={muiTheme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            <Route path="auth/:mode" element={<Auth />} />
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="assets" element={<Assets />} />
              <Route path="categories" element={<Categories />} />
              <Route path="budgets" element={<Budgets />} />
              <Route path="savings" element={<Savings />} />
              <Route path="debts" element={<Debts />} />
              <Route path="reports" element={<Reports />} />
              <Route path="recurring" element={<Recurring />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
