import type { Category, Account, TxType } from '../types';
import { todayKey } from './finance';

export interface ParsedTransaction {
  raw: string;
  name: string;
  amount: number;
  type: TxType;
  categoryId: string;
  accountId: string;
  date: string;
  confidence: number;
  explanation: string;
}

// Map Vietnamese keywords to expense categories
const categoryKeywords: Record<string, string[]> = {
  food: [
    'ăn', 'uống', 'cafe', 'cà phê', 'trưa', 'tối', 'sáng', 'bánh', 'cơm', 'phở',
    'bún', 'trà', 'nhậu', 'siêu thị', 'lẩu', 'chè', 'đồ ăn', 'nước', 'pizza', 'fastfood'
  ],
  transport: [
    'xăng', 'đổ xăng', 'xe', 'grab', 'be', 'taxi', 'vé', 'gửi xe', 'bảo dưỡng',
    'rửa xe', 'gửi oto', 'bus', 'xe bus', 'vé xe'
  ],
  housing: [
    'nhà', 'phòng', 'thuê', 'tiền nhà', 'tiền phòng', 'nội thất', 'sửa nhà', 'sửa khóa'
  ],
  shopping: [
    'mua', 'áo', 'quần', 'giày', 'dép', 'shopee', 'lazada', 'tiki', 'đồ', 'mua sắm',
    'mỹ phẩm', 'son', 'đồng hồ', 'tai nghe'
  ],
  entertainment: [
    'phim', 'cinema', 'game', 'net', 'du lịch', 'chơi', 'netflix', 'spotify',
    'hát', 'karaoke', 'billiard', 'bida'
  ],
  health: [
    'thuốc', 'khám', 'bệnh', 'bác sĩ', 'gym', 'nha khoa', 'răng', 'tiêm', 'vitamin'
  ],
  education: [
    'học', 'sách', 'khóa học', 'tiếng anh', 'học phí', 'khóa', 'lớp'
  ],
  bills: [
    'điện', 'tiền điện', 'nước', 'tiền nước', 'mạng', 'wifi', 'hóa đơn', 'cước', 'điện thoại'
  ],
  travel: [
    'vé máy bay', 'khách sạn', 'tour', 'homestay', 'resort', 'đi chơi'
  ],
  salary: [
    'lương', 'tiền lương', 'thu nhập'
  ],
  bonus: [
    'thưởng', 'bonus'
  ],
  freelance: [
    'làm thêm', 'freelance', 'dự án ngoài', 'bán hàng', 'tiền về'
  ]
};

// Map keywords for income detection
const incomeKeywords = [
  'lương', 'thưởng', 'thu nhập', 'tiền về', 'nhận tiền', 'được trả', 'lãi', 'hoa hồng', 'bán'
];

/**
 * Parse natural Vietnamese string into structured transaction
 * Examples:
 * - "ăn trưa 45k" -> name: "Ăn trưa", amount: 45000, type: "expense", categoryId: "food"
 * - "đổ xăng 70k ví momo" -> name: "Đổ xăng", amount: 70000, accountId: "wallet"
 * - "lương tháng 25tr bank" -> name: "Lương tháng", amount: 25000000, type: "income"
 */
export function parseVietnameseTransaction(
  input: string,
  categories: Category[],
  accounts: Account[],
  defaultAccountId?: string
): ParsedTransaction | null {
  if (!input || !input.trim()) return null;

  const raw = input.trim();
  const lower = raw.toLowerCase();

  // 1. Amount Extraction
  // Matches: 45k, 45.000, 45,000, 45000, 1.5tr, 1,5 củ, 250k, 50k, 25tr, 2 triệu, etc.
  const amountRegex = /(\d+(?:[.,]\d+)?)\s*(k|nghìn|ngàn|tr|triệu|củ|lít|m|tỷ|vnd|đ|₫)?(?:\s|$)/i;
  const match = lower.match(amountRegex);

  let amount = 0;
  let amountMatchStr = '';

  if (match) {
    amountMatchStr = match[0].trim();
    const numPart = match[1].replace(',', '.');
    const unit = (match[2] || '').toLowerCase();
    const baseNum = parseFloat(numPart);

    if (!isNaN(baseNum)) {
      if (unit === 'k' || unit === 'nghìn' || unit === 'ngàn') {
        amount = Math.round(baseNum * 1000);
      } else if (unit === 'tr' || unit === 'triệu' || unit === 'củ' || unit === 'm') {
        amount = Math.round(baseNum * 1000000);
      } else if (unit === 'lít') {
        amount = Math.round(baseNum * 100000);
      } else if (unit === 'tỷ') {
        amount = Math.round(baseNum * 1000000000);
      } else {
        // Plain number or format like 35.000
        if (numPart.includes('.') && !numPart.includes('.5') && !numPart.includes('.25')) {
          // If typed as 35.000 or 150.000
          amount = parseInt(match[1].replace(/[.,]/g, ''), 10);
        } else if (baseNum < 1000 && !unit) {
          // In Vietnam, people frequently write "ăn trưa 45" meaning 45k
          amount = Math.round(baseNum * 1000);
        } else {
          amount = Math.round(baseNum);
        }
      }
    }
  }

  if (amount <= 0) {
    return null;
  }

  // 2. Determine Type (income vs expense)
  let type: TxType = 'expense';
  for (const kw of incomeKeywords) {
    if (lower.includes(kw)) {
      type = 'income';
      break;
    }
  }

  // 3. Match Account
  let accountId = defaultAccountId || accounts[0]?.id || 'bank';
  for (const acc of accounts) {
    const accName = acc.name.toLowerCase();
    if (lower.includes(accName)) {
      accountId = acc.id;
      break;
    }
    if (acc.type === 'ewallet' && (lower.includes('momo') || lower.includes('ví') || lower.includes('zalopay'))) {
      accountId = acc.id;
      break;
    }
    if (acc.type === 'bank' && (lower.includes('bank') || lower.includes('ngân hàng') || lower.includes('vcb') || lower.includes('techcombank') || lower.includes('chuyển khoản'))) {
      accountId = acc.id;
      break;
    }
    if (acc.type === 'cash' && (lower.includes('tiền mặt') || lower.includes('cash'))) {
      accountId = acc.id;
      break;
    }
  }

  // 4. Match Category
  const availableCategories = categories.filter(c => c.type === type && !c.hidden);
  let matchedCategoryId = availableCategories[0]?.id || 'food';
  let bestScore = 0;

  for (const cat of availableCategories) {
    const catName = cat.name.toLowerCase();
    if (lower.includes(catName)) {
      matchedCategoryId = cat.id;
      bestScore = 10;
      break;
    }

    const keywords = categoryKeywords[cat.id] || [];
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        if (kw.length > bestScore) {
          bestScore = kw.length;
          matchedCategoryId = cat.id;
        }
      }
    }
  }

  // 5. Clean Name
  // Remove amount match and account words from raw string to form clean title
  let cleanName = raw;
  if (amountMatchStr) {
    cleanName = cleanName.replace(new RegExp(amountMatchStr, 'i'), '');
  }
  // Strip account keywords from name
  cleanName = cleanName
    .replace(/\b(ví\s+momo|momo|zalopay|bank|ngân\s+hàng|tiền\s+mặt|cash|ví)\b/gi, '')
    .trim();

  // If name became empty, fallback to category name
  if (!cleanName || cleanName.length < 2) {
    const cat = categories.find(c => c.id === matchedCategoryId);
    cleanName = cat?.name || (type === 'income' ? 'Khoản thu' : 'Khoản chi');
  }

  // Capitalize first letter
  cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

  const matchedCat = categories.find(c => c.id === matchedCategoryId);
  const matchedAcc = accounts.find(a => a.id === accountId);

  return {
    raw,
    name: cleanName,
    amount,
    type,
    categoryId: matchedCategoryId,
    accountId,
    date: todayKey(),
    confidence: bestScore > 0 ? 0.95 : 0.8,
    explanation: `${type === 'income' ? 'Thu nhập' : 'Chi tiêu'} "${cleanName}" ${new Intl.NumberFormat('vi-VN').format(amount)} ₫ vào [${matchedCat?.name || ''}], tài khoản [${matchedAcc?.name || ''}]`
  };
}

