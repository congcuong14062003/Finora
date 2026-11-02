import type { Category, Account, TxType } from '../types';
import { todayKey } from './finance';
import { MARKET_PRICES } from './riskAndInsightEngine';

export type CommandIntent =
  | 'transaction'
  | 'investment'
  | 'credit_installment'
  | 'split_bill'
  | 'reconcile'
  | 'business_bundle';

export interface ParsedCommand {
  raw: string;
  intent: CommandIntent;
  confidence: number;
  explanation: string;
  badgeLabel: string;
  badgeColor: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'secondary';

  // 1. Standard Transaction
  transaction?: {
    name: string;
    amount: number;
    type: TxType;
    categoryId: string;
    accountId: string;
    date: string;
  };

  // 2. Investment Asset
  investment?: {
    symbol: string;
    name: string;
    assetClass: 'stock' | 'gold' | 'crypto';
    quantity: number;
    totalCostBasis: number;
    currentUnitPrice: number;
    accountId: string;
  };

  // 3. Credit Installment
  creditInstallment?: {
    item: string;
    totalAmount: number;
    installments: number; // months
    monthlyAmount: number;
    accountId: string;
  };

  // 4. Split Bill
  splitBill?: {
    name: string;
    totalAmount: number;
    peopleCount: number;
    personalShare: number;
    othersShare: number;
    accountId: string;
    categoryId: string;
  };

  // 5. Reconcile
  reconcile?: {
    accountId: string;
    accountName: string;
    actualBalance: number;
  };

  // 6. Business Bundle
  businessBundle?: {
    revenue: number;
    cost: number;
    costRatio: number;
    revenueCategoryId: string;
    costCategoryId: string;
    accountId: string;
  };
}

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

const incomeKeywords = [
  'lương', 'thưởng', 'thu nhập', 'tiền về', 'nhận tiền', 'được trả', 'lãi', 'hoa hồng', 'bán'
];

/**
 * Helper to extract monetary amount from Vietnamese string
 */
export function extractAmount(text: string): { amount: number; matchedStr: string } {
  const lower = text.toLowerCase();
  // 1. Try matching number with explicit currency unit first
  const unitRegex = /(\d+(?:[.,]\d+)?)\s*(k|nghìn|ngàn|tr|triệu|củ|lít|m|tỷ|vnd|đ|₫)(?:\s|$|[.,;])/i;
  let match = lower.match(unitRegex);

  // 2. Fallback to generic number
  if (!match) {
    const amountRegex = /(\d+(?:[.,]\d+)?)\s*(k|nghìn|ngàn|tr|triệu|củ|lít|m|tỷ|vnd|đ|₫)?(?:\s|$)/i;
    match = lower.match(amountRegex);
  }

  if (!match) return { amount: 0, matchedStr: '' };

  const matchedStr = match[0].trim();
  const numPart = match[1].replace(',', '.');
  const unit = (match[2] || '').toLowerCase();
  const baseNum = parseFloat(numPart);

  let amount = 0;
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
      if (numPart.includes('.') && !numPart.includes('.5') && !numPart.includes('.25')) {
        amount = parseInt(match[1].replace(/[.,]/g, ''), 10);
      } else if (baseNum < 1000 && !unit) {
        amount = Math.round(baseNum * 1000);
      } else {
        amount = Math.round(baseNum);
      }
    }
  }

  return { amount, matchedStr };
}

/**
 * Match account from text or fallback to default
 */
export function matchAccount(text: string, accounts: Account[], defaultAccountId?: string): string {
  const lower = text.toLowerCase();
  for (const acc of accounts) {
    const accName = acc.name.toLowerCase();
    if (lower.includes(accName)) return acc.id;
  }
  if (lower.includes('vcb') || lower.includes('vietcombank')) {
    const acc = accounts.find(a => a.name.toLowerCase().includes('vcb') || a.name.toLowerCase().includes('vietcombank'));
    if (acc) return acc.id;
  }
  if (lower.includes('tcb') || lower.includes('techcombank')) {
    const acc = accounts.find(a => a.name.toLowerCase().includes('tcb') || a.name.toLowerCase().includes('techcombank'));
    if (acc) return acc.id;
  }
  if (lower.includes('mb') || lower.includes('mbbank')) {
    const acc = accounts.find(a => a.name.toLowerCase().includes('mb'));
    if (acc) return acc.id;
  }
  if (lower.includes('momo')) {
    const acc = accounts.find(a => a.name.toLowerCase().includes('momo') || a.type === 'ewallet');
    if (acc) return acc.id;
  }
  if (lower.includes('credit') || lower.includes('thẻ tín dụng') || lower.includes('quẹt thẻ')) {
    const credit = accounts.find(a => a.type === 'credit_card');
    if (credit) return credit.id;
  }
  if (lower.includes('ví') || lower.includes('zalopay')) {
    const w = accounts.find(a => a.type === 'ewallet');
    if (w) return w.id;
  }
  if (lower.includes('bank') || lower.includes('ngân hàng') || lower.includes('chuyển khoản')) {
    const b = accounts.find(a => a.type === 'bank');
    if (b) return b.id;
  }
  if (lower.includes('tiền mặt') || lower.includes('cash')) {
    const c = accounts.find(a => a.type === 'cash');
    if (c) return c.id;
  }
  return defaultAccountId || accounts[0]?.id || 'bank';
}

/**
 * 2.1. Multi-Intent Parser for 5 Core Intents + Business Bundles
 */
export function parseVietnameseCommand(
  input: string,
  categories: Category[],
  accounts: Account[],
  defaultAccountId?: string
): ParsedCommand | null {
  if (!input || !input.trim()) return null;

  const raw = input.trim();
  const lower = raw.toLowerCase();

  // INTENT 1: Cân bằng số dư nhanh (Reconcile)
  // Ví dụ: "số dư ví tiền mặt còn 350k", "số dư bank còn 40tr", "cân bằng số dư ví 500k"
  if (lower.includes('số dư') || lower.includes('cân bằng') || lower.includes('ví còn') || lower.includes('bank còn')) {
    const { amount } = extractAmount(lower);
    if (amount > 0) {
      const targetAccId = matchAccount(lower, accounts, defaultAccountId);
      const acc = accounts.find(a => a.id === targetAccId);
      const accName = acc?.name || 'Tài khoản';

      return {
        raw,
        intent: 'reconcile',
        confidence: 0.95,
        badgeLabel: 'Cân bằng số dư',
        badgeColor: 'info',
        explanation: `Điều chỉnh số dư "${accName}" thành ${new Intl.NumberFormat('vi-VN').format(amount)} ₫`,
        reconcile: {
          accountId: targetAccId,
          accountName: accName,
          actualBalance: amount
        }
      };
    }
  }

  // INTENT 2: Chia tiền nhóm (Split Bill)
  // Ví dụ: "ăn lẩu 1200k chia 4 người", "ăn uống 600k chia 3", "uống trà sữa 160k chia 4 bạn"
  const splitRegex = /chia\s+(\d+)\s*(người|bạn|ng)?/i;
  const splitMatch = lower.match(splitRegex);
  if (splitMatch) {
    const peopleCount = parseInt(splitMatch[1], 10);
    const { amount } = extractAmount(lower);

    if (peopleCount > 1 && amount > 0) {
      const personalShare = Math.round(amount / peopleCount);
      const othersShare = amount - personalShare;
      const targetAccountId = matchAccount(lower, accounts, defaultAccountId);

      // Clean name
      let cleanName = raw
        .replace(splitMatch[0], '')
        .replace(/(\d+(?:[.,]\d+)?)\s*(k|nghìn|ngàn|tr|triệu|củ|lít|m|tỷ|vnd|đ|₫)?/i, '')
        .trim();
      cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      if (!cleanName || cleanName.length < 2) cleanName = 'Chia tiền nhóm';

      return {
        raw,
        intent: 'split_bill',
        confidence: 0.95,
        badgeLabel: 'Chia tiền nhóm',
        badgeColor: 'secondary',
        explanation: `Tổng chi ${new Intl.NumberFormat('vi-VN').format(amount)} ₫ (${peopleCount} người). Cá nhân chi: ${new Intl.NumberFormat('vi-VN').format(personalShare)} ₫, đẩy ${new Intl.NumberFormat('vi-VN').format(othersShare)} ₫ vào Sổ nợ (Cho vay).`,
        splitBill: {
          name: cleanName,
          totalAmount: amount,
          peopleCount,
          personalShare,
          othersShare,
          accountId: targetAccountId,
          categoryId: 'food'
        }
      };
    }
  }

  // INTENT 3: Thẻ tín dụng / Trả góp (Credit Card / Installments)
  // Ví dụ: "quẹt thẻ VCB mua tủ lạnh 12tr trả góp 6 tháng", "mua iphone 24tr góp 12 tháng"
  const installmentRegex = /(?:trả\s*góp|góp)\s*(\d+)\s*tháng/i;
  const installMatch = lower.match(installmentRegex);
  const isCreditCardKeyword = lower.includes('quẹt thẻ') || lower.includes('thẻ tín dụng') || lower.includes('trả góp') || lower.includes('góp');

  if (installMatch || (isCreditCardKeyword && lower.includes('mua'))) {
    const installments = installMatch ? parseInt(installMatch[1], 10) : 6;
    const { amount } = extractAmount(lower);

    if (amount > 0) {
      const targetAccId = matchAccount(lower, accounts, defaultAccountId);
      const acc = accounts.find(a => a.id === targetAccId) || accounts.find(a => a.type === 'credit_card') || accounts[0];
      const monthlyAmt = Math.round(amount / installments);

      let cleanName = raw
        .replace(/(?:trả\s*góp|góp)\s*\d+\s*tháng/i, '')
        .replace(/(?:quẹt\s*thẻ|thẻ\s*tín\s*dụng|quẹt)/i, '')
        .replace(/(?:vcb|vietcombank|tcb|techcombank|mb|mbbank|vib|bidv|acb|vpbank|momo)/i, '')
        .replace(/(?:mua\s*sắm|mua)/i, '')
        .replace(/(\d+(?:[.,]\d+)?)\s*(k|nghìn|ngàn|tr|triệu|củ|lít|m|tỷ|vnd|đ|₫)?/i, '')
        .trim();
      cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      if (!cleanName || cleanName.length < 2) cleanName = 'Tủ lạnh';

      const accLabel = acc ? acc.name : 'Thẻ tín dụng';

      return {
        raw,
        intent: 'credit_installment',
        confidence: 0.94,
        badgeLabel: 'Thẻ tín dụng / Trả góp',
        badgeColor: 'warning',
        explanation: `Quẹt thẻ ${accLabel} mua "${cleanName}" ${new Intl.NumberFormat('vi-VN').format(amount)} ₫ trả góp ${installments} tháng (${new Intl.NumberFormat('vi-VN').format(monthlyAmt)} ₫/tháng)`,
        creditInstallment: {
          item: cleanName,
          totalAmount: amount,
          installments,
          monthlyAmount: monthlyAmt,
          accountId: acc ? acc.id : defaultAccountId || accounts[0]?.id || 'bank'
        }
      };
    }
  }

  // INTENT 4: Đầu tư (Mã + Vốn: Chứng khoán, Vàng, Coin)
  // Ví dụ: "mua 100 cổ FPT giá 130tr", "mua 2 chỉ vàng SJC 17tr", "mua 0.02 BTC 45tr", "mua 500 cp HPG 14tr"
  const isInvestmentKeyword =
    lower.includes('cổ') ||
    lower.includes('cổ phiếu') ||
    lower.includes('cp') ||
    lower.includes('vàng') ||
    lower.includes('sjc') ||
    lower.includes('btc') ||
    lower.includes('eth') ||
    lower.includes('crypto') ||
    lower.includes('coin');

  if (isInvestmentKeyword && lower.includes('mua')) {
    const { amount: totalCost } = extractAmount(lower);

    // Extract quantity e.g. "100 cổ", "2 chỉ", "0.02 btc", "500 cp"
    const qtyRegex = /(?:mua\s*)?(\d+(?:[.,]\d+)?)\s*(?:cổ\s*phiếu|cổ|cp|chỉ|lượng|cây|btc|eth|sol|usdt)?/i;
    const qtyMatch = lower.match(qtyRegex);
    let quantity = 1;
    if (qtyMatch && qtyMatch[1]) {
      const parsedQty = parseFloat(qtyMatch[1].replace(',', '.'));
      if (!isNaN(parsedQty) && parsedQty > 0) {
        quantity = parsedQty;
      }
    }

    // Determine asset class & symbol
    let symbol = 'FPT';
    let assetClass: 'stock' | 'gold' | 'crypto' = 'stock';
    let assetName = 'Cổ phiếu FPT';

    if (lower.includes('sjc') || lower.includes('vàng') || lower.includes('9999')) {
      assetClass = 'gold';
      symbol = lower.includes('sjc') ? 'SJC' : 'Nhẫn 9999';
      assetName = `Vàng ${symbol}`;
    } else if (lower.includes('btc') || lower.includes('bitcoin')) {
      assetClass = 'crypto';
      symbol = 'BTC';
      assetName = 'Bitcoin (BTC)';
    } else if (lower.includes('eth') || lower.includes('ethereum')) {
      assetClass = 'crypto';
      symbol = 'ETH';
      assetName = 'Ethereum (ETH)';
    } else if (lower.includes('sol')) {
      assetClass = 'crypto';
      symbol = 'SOL';
      assetName = 'Solana (SOL)';
    } else {
      // Stock symbol extraction (e.g. FPT, VCB, HPG, SSI, MWG)
      const stockMatch = raw.match(/\b([A-Z]{3,4})\b/);
      if (stockMatch) {
        symbol = stockMatch[1].toUpperCase();
      } else {
        const potential = ['fpt', 'vcb', 'hpg', 'e1vfvn30', 'mwg', 'vhm', 'vic', 'msn', 'tcb'];
        for (const s of potential) {
          if (lower.includes(s)) {
            symbol = s.toUpperCase();
            break;
          }
        }
      }
      assetName = `Cổ phiếu ${symbol}`;
    }

    const currentPrice = MARKET_PRICES[symbol] || (totalCost > 0 ? Math.round(totalCost / quantity) : 100000);
    const costBasis = totalCost > 0 ? totalCost : Math.round(quantity * currentPrice);

    return {
      raw,
      intent: 'investment',
      confidence: 0.94,
      badgeLabel: 'Đầu tư tài sản',
      badgeColor: 'success',
      explanation: `Thêm vào danh mục đầu tư: ${quantity} ${symbol} (${assetName}), tổng vốn: ${new Intl.NumberFormat('vi-VN').format(costBasis)} ₫`,
      investment: {
        symbol,
        name: assetName,
        assetClass,
        quantity,
        totalCostBasis: costBasis,
        currentUnitPrice: currentPrice,
        accountId: defaultAccountId || accounts[0]?.id || 'bank'
      }
    };
  }

  // INTENT 5: Gói dòng tiền kinh doanh (Business Bundle)
  // Ví dụ: "doanh thu bán hàng 10tr", "doanh thu shop 5tr", "tiền bán hàng 8tr"
  if (lower.includes('doanh thu') || (lower.includes('bán hàng') && lower.includes('tiền'))) {
    const { amount: revenue } = extractAmount(lower);
    if (revenue > 0) {
      const costRatio = 0.6; // 60% standard cost ratio
      const cost = Math.round(revenue * costRatio);
      const targetAccountId = matchAccount(lower, accounts, defaultAccountId);

      return {
        raw,
        intent: 'business_bundle',
        confidence: 0.93,
        badgeLabel: 'Dòng tiền kinh doanh',
        badgeColor: 'primary',
        explanation: `Doanh thu bán hàng: +${new Intl.NumberFormat('vi-VN').format(revenue)} ₫ (Tự động trích ${costRatio * 100}% giá vốn: -${new Intl.NumberFormat('vi-VN').format(cost)} ₫)`,
        businessBundle: {
          revenue,
          cost,
          costRatio,
          revenueCategoryId: 'freelance',
          costCategoryId: 'bills',
          accountId: targetAccountId
        }
      };
    }
  }

  // INTENT 6: Standard Transaction (Thu nhập / Chi tiêu thông thường)
  const tx = parseVietnameseTransaction(input, categories, accounts, defaultAccountId);
  if (tx) {
    return {
      raw,
      intent: 'transaction',
      confidence: tx.confidence,
      badgeLabel: tx.type === 'income' ? 'Thu nhập' : 'Chi tiêu',
      badgeColor: tx.type === 'income' ? 'success' : 'primary',
      explanation: tx.explanation,
      transaction: {
        name: tx.name,
        amount: tx.amount,
        type: tx.type,
        categoryId: tx.categoryId,
        accountId: tx.accountId,
        date: tx.date
      }
    };
  }

  return null;
}

/**
 * Parse standard Vietnamese transaction (backward compatible)
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

  const { amount, matchedStr } = extractAmount(lower);
  if (amount <= 0) return null;

  // Determine Type
  let type: TxType = 'expense';
  for (const kw of incomeKeywords) {
    if (lower.includes(kw)) {
      type = 'income';
      break;
    }
  }

  // Match Account
  const accountId = matchAccount(lower, accounts, defaultAccountId);

  // Match Category
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

  // Clean Name
  let cleanName = raw;
  if (matchedStr) {
    cleanName = cleanName.replace(new RegExp(matchedStr, 'i'), '');
  }
  cleanName = cleanName
    .replace(/\b(ví\s+momo|momo|zalopay|bank|ngân\s+hàng|tiền\s+mặt|cash|ví)\b/gi, '')
    .trim();

  if (!cleanName || cleanName.length < 2) {
    const cat = categories.find(c => c.id === matchedCategoryId);
    cleanName = cat?.name || (type === 'income' ? 'Khoản thu' : 'Khoản chi');
  }

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
