import { create } from 'zustand';
import type { FinanceData } from './types';
import { mockFinanceService } from './services/financeService';

export interface ToastInfo {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  severity?: 'success' | 'info' | 'warning' | 'error';
}

interface State {
  data: FinanceData | null;
  loading: boolean;
  error: string | null;
  theme: 'light' | 'dark';
  toast: ToastInfo | null;
  lastSnapshot: FinanceData | null;
  pricingOpen: boolean;
  pricingFeature: string | undefined;
  load: () => Promise<void>;
  update: (fn: (data: FinanceData) => FinanceData, toastMessage?: string) => Promise<void>;
  undo: () => Promise<void>;
  setTheme: (theme: 'light' | 'dark') => void;
  notify: (toast: string | ToastInfo) => void;
  clearToast: () => void;
  openPricing: (feature?: string) => void;
  closePricing: () => void;
}

export const useFinance = create<State>((set, get) => ({
  data: null,
  loading: true,
  error: null,
  theme: (localStorage.getItem('finora:theme') as 'light' | 'dark') || 'light',
  toast: null,
  lastSnapshot: null,
  pricingOpen: false,
  pricingFeature: undefined,

  load: async () => {
    try {
      set({ loading: true, error: null });
      const loaded = await mockFinanceService.load();
      set({ data: loaded, loading: false });
    } catch {
      set({ error: 'Không thể tải dữ liệu. Vui lòng thử lại.', loading: false });
    }
  },

  update: async (fn, toastMessage) => {
    const previous = get().data;
    if (!previous) return;
    const clonedPrev = structuredClone(previous);
    const next = fn(structuredClone(previous));
    try {
      await mockFinanceService.save(next);
      set({
        data: next,
        lastSnapshot: clonedPrev,
        toast: toastMessage
          ? {
              message: toastMessage,
              actionLabel: 'Hoàn tác',
              onAction: () => get().undo(),
              severity: 'success'
            }
          : {
              message: 'Đã lưu thay đổi',
              severity: 'success'
            }
      });
      setTimeout(() => {
        if (get().toast?.message === (toastMessage || 'Đã lưu thay đổi')) {
          set({ toast: null });
        }
      }, 5000);
    } catch {
      set({
        error: 'Không thể lưu thay đổi',
        toast: { message: 'Không thể lưu thay đổi', severity: 'error' }
      });
    }
  },

  undo: async () => {
    const snapshot = get().lastSnapshot;
    if (!snapshot) return;
    try {
      await mockFinanceService.save(snapshot);
      set({
        data: snapshot,
        lastSnapshot: null,
        toast: { message: 'Đã hoàn tác thao tác vừa rồi', severity: 'info' }
      });
    } catch {
      set({ toast: { message: 'Không thể hoàn tác', severity: 'error' } });
    }
  },

  setTheme: theme => {
    localStorage.setItem('finora:theme', theme);
    set({ theme });
  },

  notify: toast => {
    const info: ToastInfo =
      typeof toast === 'string'
        ? { message: toast, severity: 'success' }
        : toast;
    set({ toast: info });
    setTimeout(() => {
      if (get().toast?.message === info.message) {
        set({ toast: null });
      }
    }, 4500);
  },

  clearToast: () => set({ toast: null }),
  openPricing: feature => set({ pricingOpen: true, pricingFeature: feature }),
  closePricing: () => set({ pricingOpen: false, pricingFeature: undefined })
}));
