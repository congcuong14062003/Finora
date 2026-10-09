import type {FinanceData} from '../types';
import {seed} from '../mocks/data';
const key='finora:demo:v1';
export interface FinanceService{load():Promise<FinanceData>;save(data:FinanceData):Promise<void>}
export const mockFinanceService:FinanceService={async load(){try{const saved=localStorage.getItem(key);return saved?JSON.parse(saved) as FinanceData:structuredClone(seed)}catch{return structuredClone(seed)}},async save(data){localStorage.setItem(key,JSON.stringify(data))}};
// Replace this adapter with REST calls when the backend is available.
