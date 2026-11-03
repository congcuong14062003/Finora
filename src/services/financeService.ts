import type {FinanceData} from '../types';
import {seed} from '../mocks/data';
import {todayKey} from '../lib/finance';

const key='finora:demo:v1';

export interface FinanceService{
  load():Promise<FinanceData>;
  save(data:FinanceData):Promise<void>;
}

function migrateData(saved: any): FinanceData {
  const merged: FinanceData = {
    ...seed,
    ...saved,
    user: {
      ...seed.user,
      ...(saved.user || {}),
      plan: saved.user?.plan || 'free',
      streakCount: typeof saved.user?.streakCount === 'number' ? saved.user.streakCount : 1,
      lastCheckInDate: saved.user?.lastCheckInDate || todayKey(),
      defaultAccountId: saved.user?.defaultAccountId || (saved.accounts?.[0]?.id || 'wallet'),
      nlpUsageToday: saved.user?.nlpUsageToday || { date: todayKey(), count: 0 }
    },
    quickTemplates: Array.isArray(saved.quickTemplates) && saved.quickTemplates.length > 0 
      ? saved.quickTemplates 
      : seed.quickTemplates,
    recurring: (saved.recurring || seed.recurring).map((r: any) => ({
      ...r,
      autoExecute: typeof r.autoExecute === 'boolean' ? r.autoExecute : false
    }))
  };

  // Ensure reconcile categories exist
  const hasReconcileExp = merged.categories.some(c => c.id === 'reconcile-expense');
  if (!hasReconcileExp) {
    merged.categories.push({
      id: 'reconcile-expense',
      name: 'Điều chỉnh số dư / Quên ghi',
      type: 'expense',
      icon: 'Shapes',
      color: '#64748b',
      hidden: false
    });
  }
  const hasReconcileInc = merged.categories.some(c => c.id === 'reconcile-income');
  if (!hasReconcileInc) {
    merged.categories.push({
      id: 'reconcile-income',
      name: 'Điều chỉnh số dư / Quên ghi',
      type: 'income',
      icon: 'CircleDollarSign',
      color: '#10b981',
      hidden: false
    });
  }

  return merged;
}

export const mockFinanceService:FinanceService={
  async load(){
    try{
      const raw=localStorage.getItem(key);
      if(!raw) return structuredClone(seed);
      const parsed = JSON.parse(raw);
      return migrateData(parsed);
    }catch{
      return structuredClone(seed);
    }
  },
  async save(data){
    localStorage.setItem(key,JSON.stringify(data));
  }
};
