import type { Account, Category, TxType } from '../types';
import { todayKey } from './finance';

export interface ParsedBankSms {
  raw: string;
  bankName: string;
  bankCode: string;
  amount: number;
  type: TxType;
  date: string;
  description: string;
  balanceAfter?: number;
  matchedAccountId: string;
  matchedCategoryId: string;
  confidence: number;
  explanation: string;
}

export interface BankSmsSample {
  bank: string;
  name: string;
  sms: string;
}

export const SAMPLE_BANK_SMS: BankSmsSample[] = [
  {
    bank: 'Vietcombank',
    name: 'VCB - Mua sắm VinMart',
    sms: 'TK 1023456789 tai VCB -250,000 VND vao 14:30 02/11/2026. ND: Qr thanh toan VinMart Daily. So du: 15,230,000 VND'
  },
  {
    bank: 'Techcombank',
    name: 'TCB - Nhận lương công ty',
    sms: 'Bien dong so du: TK 1903... tai Techcombank +18,500,000VND luc 09:15 02/11/2026. ND: Cong ty ABC tra luong T10. So du: 31,400,000VND'
  },
  {
    bank: 'MBBank',
    name: 'MB - Cà phê Highlands',
    sms: 'TK 0987654321 tai MB -85,000 VND vao 12:00 02/11/2026. ND: Highlands Coffee Landmark. So du: 4,120,000 VND'
  },
  {
    bank: 'Timo',
    name: 'Timo - Nhận tiền phòng',
    sms: 'Timo: Ban da nhan duoc 2,500,000 VND tu NGUYEN VAN A. Noi dung: Tien phong tro thang 11. So du Spend Account: 8,900,000 VND'
  },
  {
    bank: 'MoMo',
    name: 'MoMo - Trà sữa Phúc Long',
    sms: 'MoMo: Ban da thanh toan thanh cong 55.000d cho Phuc Long Coffee & Tea. So du vi: 450.000d'
  }
];

export function parseBankSms(
  text: string,
  accounts: Account[],
  categories: Category[],
  defaultAccountId?: string
): ParsedBankSms | null {
  if (!text || !text.trim()) return null;

  const raw = text.trim();
  const lower = raw.toLowerCase();

  // 1. Detect Bank / Provider
  let bankCode = 'bank';
  let bankName = 'Ngân hàng';

  if (lower.includes('vietcombank') || lower.includes('vcb')) {
    bankCode = 'VCB';
    bankName = 'Vietcombank';
  } else if (lower.includes('techcombank') || lower.includes('tcb')) {
    bankCode = 'TCB';
    bankName = 'Techcombank';
  } else if (lower.includes('mbbank') || lower.includes('mb bank') || lower.includes('tai mb')) {
    bankCode = 'MB';
    bankName = 'MBBank';
  } else if (lower.includes('timo')) {
    bankCode = 'TIMO';
    bankName = 'Timo Digital Bank';
  } else if (lower.includes('momo')) {
    bankCode = 'MOMO';
    bankName = 'Ví MoMo';
  } else if (lower.includes('zalopay')) {
    bankCode = 'ZALOPAY';
    bankName = 'Ví ZaloPay';
  } else if (lower.includes('acb')) {
    bankCode = 'ACB';
    bankName = 'Ngân hàng ACB';
  } else if (lower.includes('bidv')) {
    bankCode = 'BIDV';
    bankName = 'Ngân hàng BIDV';
  } else if (lower.includes('vpbank') || lower.includes('vpb')) {
    bankCode = 'VPB';
    bankName = 'VPBank';
  }

  // 2. Detect Amount and Type (+ or -)
  let type: TxType = 'expense';
  let amount = 0;

  // Patterns for +/- amount, e.g. -250,000 VND, +18,500,000VND, thanh toan 55.000d, nhan duoc 2,500,000
  const plusMatch = raw.match(/\+\s*([\d.,]+)\s*(?:vnd|d|đ)?/i);
  const minusMatch = raw.match(/-\s*([\d.,]+)\s*(?:vnd|d|đ)?/i);

  if (plusMatch) {
    type = 'income';
    const numStr = plusMatch[1].replace(/[.,]/g, '');
    amount = parseInt(numStr, 10);
  } else if (minusMatch) {
    type = 'expense';
    const numStr = minusMatch[1].replace(/[.,]/g, '');
    amount = parseInt(numStr, 10);
  } else if (lower.includes('nhan duoc') || lower.includes('nhận được') || lower.includes('cong tien') || lower.includes('cộng tiền')) {
    type = 'income';
    const match = raw.match(/([\d.,]+)\s*(?:vnd|d|đ)/i);
    if (match) {
      amount = parseInt(match[1].replace(/[.,]/g, ''), 10);
    }
  } else if (lower.includes('thanh toan') || lower.includes('thanh toán') || lower.includes('tru tien') || lower.includes('trừ tiền') || lower.includes('gd:')) {
    type = 'expense';
    const match = raw.match(/([\d.,]+)\s*(?:vnd|d|đ)/i);
    if (match) {
      amount = parseInt(match[1].replace(/[.,]/g, ''), 10);
    }
  }

  if (amount <= 0) return null;

  // 3. Extract Balance After Transaction (Số dư)
  let balanceAfter: number | undefined;
  const balanceMatch = raw.match(/so du(?:\s*vi|\s*spend account)?:\s*([\d.,]+)/i) ||
    raw.match(/số dư(?:\s*ví)?:\s*([\d.,]+)/i);
  if (balanceMatch) {
    balanceAfter = parseInt(balanceMatch[1].replace(/[.,]/g, ''), 10);
  }

  // 4. Extract Description / Content
  let description = '';
  const ndMatch = raw.match(/(?:nd|noi dung|nội dung|ly do|lý do):\s*([^.]+)/i);
  if (ndMatch) {
    description = ndMatch[1].trim();
  } else if (lower.includes('cho ') && (lower.includes('thanh toan') || lower.includes('thanh toán'))) {
    const choMatch = raw.match(/cho\s+([^.]+)/i);
    if (choMatch) description = choMatch[1].trim();
  }

  if (!description) {
    description = type === 'income' ? `Nhận tiền qua ${bankName}` : `Thanh toán qua ${bankName}`;
  }

  // 5. Match with user's registered Account
  let matchedAccountId = defaultAccountId || accounts[0]?.id || '';
  const bankAcc = accounts.find(a => {
    const aName = a.name.toLowerCase();
    if (bankCode === 'VCB' && (aName.includes('vcb') || aName.includes('vietcombank'))) return true;
    if (bankCode === 'TCB' && (aName.includes('tcb') || aName.includes('techcombank'))) return true;
    if (bankCode === 'MB' && (aName.includes('mb') || aName.includes('quân đội'))) return true;
    if (bankCode === 'TIMO' && aName.includes('timo')) return true;
    if (bankCode === 'MOMO' && aName.includes('momo')) return true;
    if (bankCode === 'ZALOPAY' && aName.includes('zalopay')) return true;
    if (bankCode === 'ACB' && aName.includes('acb')) return true;
    if (bankCode === 'BIDV' && aName.includes('bidv')) return true;
    if (bankCode === 'VPB' && (aName.includes('vpb') || aName.includes('vpbank'))) return true;
    return false;
  });

  if (bankAcc) {
    matchedAccountId = bankAcc.id;
  }

  // 6. Match Category based on Description
  const availableCategories = categories.filter(c => c.type === type && !c.hidden);
  let matchedCategoryId = availableCategories[0]?.id || '';
  const descLower = description.toLowerCase();

  for (const cat of availableCategories) {
    const cName = cat.name.toLowerCase();
    if (descLower.includes(cName)) {
      matchedCategoryId = cat.id;
      break;
    }
  }

  // Common heuristic categories
  if (type === 'income') {
    if (descLower.includes('luong') || descLower.includes('lương')) {
      const salaryCat = categories.find(c => c.type === 'income' && (c.name.toLowerCase().includes('lương') || c.id === 'salary'));
      if (salaryCat) matchedCategoryId = salaryCat.id;
    }
  } else {
    if (descLower.includes('vinmart') || descLower.includes('coffee') || descLower.includes('cafe') || descLower.includes('tea') || descLower.includes('ăn') || descLower.includes('an uong')) {
      const foodCat = categories.find(c => c.type === 'expense' && (c.name.toLowerCase().includes('ăn') || c.id === 'food'));
      if (foodCat) matchedCategoryId = foodCat.id;
    }
  }

  const matchedAccount = accounts.find(a => a.id === matchedAccountId);
  const matchedCategory = categories.find(c => c.id === matchedCategoryId);

  return {
    raw,
    bankName,
    bankCode,
    amount,
    type,
    date: todayKey(),
    description,
    balanceAfter,
    matchedAccountId,
    matchedCategoryId,
    confidence: 0.95,
    explanation: `Bắt được giao dịch ${type === 'income' ? 'CỘNG' : 'TRỪ'} ${new Intl.NumberFormat('vi-VN').format(amount)} ₫ từ tin nhắn ${bankName}. Gán vào [${matchedAccount?.name || 'Tài khoản'}] · [${matchedCategory?.name || 'Danh mục'}]`
  };
}
