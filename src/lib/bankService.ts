/**
 * VietQR Bank API Integration Service
 * Lấy danh sách chính thức 76+ ngân hàng tại Việt Nam kèm logo URL chất lượng cao
 * Endpoint: https://api.vietqr.io/v2/banks
 */

export interface VietQRBank {
  id: number;
  name: string;
  code: string;
  bin: string;
  shortName: string;
  logo: string;
}

const STORAGE_KEY = 'finora:vietqr_banks_cache';

// Bộ dữ liệu chuẩn offline cho các ngân hàng phổ biến nhất
export const DEFAULT_BANKS: VietQRBank[] = [
  { id: 43, name: 'Ngân hàng TMCP Ngoại Thương Việt Nam', code: 'VCB', bin: '970436', shortName: 'Vietcombank', logo: 'https://cdn.vietqr.io/img/VCB.png' },
  { id: 44, name: 'Ngân hàng TMCP Kỹ thương Việt Nam', code: 'TCB', bin: '970407', shortName: 'Techcombank', logo: 'https://cdn.vietqr.io/img/TCB.png' },
  { id: 24, name: 'Ngân hàng TMCP Quân đội', code: 'MB', bin: '970422', shortName: 'MBBank', logo: 'https://cdn.vietqr.io/img/MB.png' },
  { id: 17, name: 'Ngân hàng TMCP Công thương Việt Nam', code: 'ICB', bin: '970415', shortName: 'VietinBank', logo: 'https://cdn.vietqr.io/img/ICB.png' },
  { id: 4, name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', code: 'BIDV', bin: '970418', shortName: 'BIDV', logo: 'https://cdn.vietqr.io/img/BIDV.png' },
  { id: 2, name: 'Ngân hàng TMCP Á Châu', code: 'ACB', bin: '970416', shortName: 'ACB', logo: 'https://cdn.vietqr.io/img/ACB.png' },
  { id: 47, name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng', code: 'VPB', bin: '970432', shortName: 'VPBank', logo: 'https://cdn.vietqr.io/img/VPB.png' },
  { id: 42, name: 'Ngân hàng TMCP Tiên Phong', code: 'TPB', bin: '970423', shortName: 'TPBank', logo: 'https://cdn.vietqr.io/img/TPB.png' },
  { id: 35, name: 'Ngân hàng TMCP Sài Gòn Thương Tín', code: 'STB', bin: '970403', shortName: 'Sacombank', logo: 'https://cdn.vietqr.io/img/STB.png' },
  { id: 14, name: 'Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh', code: 'HDB', bin: '970437', shortName: 'HDBank', logo: 'https://cdn.vietqr.io/img/HDB.png' },
  { id: 46, name: 'Ngân hàng TMCP Quốc tế Việt Nam', code: 'VIB', bin: '970441', shortName: 'VIB', logo: 'https://cdn.vietqr.io/img/VIB.png' },
  { id: 50, name: 'Ngân hàng số Timo by BanVietBank', code: 'TIMO', bin: '963388', shortName: 'Timo', logo: 'https://cdn.vietqr.io/img/TIMO.png' },
  { id: 51, name: 'Ngân hàng số Cake by VPBank', code: 'CAKE', bin: '546034', shortName: 'Cake', logo: 'https://cdn.vietqr.io/img/CAKE.png' },
  { id: 36, name: 'Ngân hàng TMCP Sài Gòn - Hà Nội', code: 'SHB', bin: '970443', shortName: 'SHB', logo: 'https://cdn.vietqr.io/img/SHB.png' },
  { id: 26, name: 'Ngân hàng TMCP Hàng Hải', code: 'MSB', bin: '970426', shortName: 'MSB', logo: 'https://cdn.vietqr.io/img/MSB.png' },
  { id: 32, name: 'Ngân hàng TMCP Phương Đông', code: 'OCB', bin: '970448', shortName: 'OCB', logo: 'https://cdn.vietqr.io/img/OCB.png' },
  { id: 22, name: 'Ngân hàng TMCP Lộc Phát Việt Nam', code: 'LPB', bin: '970449', shortName: 'LPBank', logo: 'https://cdn.vietqr.io/img/LPB.png' },
  { id: 37, name: 'Ngân hàng TMCP Đông Nam Á', code: 'SEAB', bin: '970440', shortName: 'SeABank', logo: 'https://cdn.vietqr.io/img/SEAB.png' },
  { id: 3, name: 'Ngân hàng TMCP Bắc Á', code: 'BAB', bin: '970409', shortName: 'Bac A Bank', logo: 'https://cdn.vietqr.io/img/BAB.png' },
  { id: 27, name: 'Ngân hàng TMCP Nam Á', code: 'NAB', bin: '970428', shortName: 'Nam A Bank', logo: 'https://cdn.vietqr.io/img/NAB.png' },
  { id: 29, name: 'Ngân hàng TMCP Quốc Dân', code: 'NCB', bin: '970419', shortName: 'NCB', logo: 'https://cdn.vietqr.io/img/NCB.png' },
  { id: 19, name: 'Ngân hàng TMCP Kiên Long', code: 'KLB', bin: '970452', shortName: 'KienlongBank', logo: 'https://cdn.vietqr.io/img/KLB.png' },
  { id: 38, name: 'Ngân hàng TNHH MTV Shinhan Việt Nam', code: 'SHINHAN', bin: '970424', shortName: 'Shinhan Bank', logo: 'https://cdn.vietqr.io/img/SHINHAN.png' },
  { id: 48, name: 'Ngân hàng TNHH MTV Woori Việt Nam', code: 'WOORI', bin: '970457', shortName: 'Woori Bank', logo: 'https://cdn.vietqr.io/img/WOORI.png' },
  { id: 15, name: 'Ngân hàng TNHH MTV HSBC (Việt Nam)', code: 'HSBC', bin: '458761', shortName: 'HSBC', logo: 'https://cdn.vietqr.io/img/HSBC.png' }
];

let memoryBanksCache: VietQRBank[] = DEFAULT_BANKS;

// Khởi tạo cache từ localStorage nếu có
try {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    const parsed = JSON.parse(cached);
    if (Array.isArray(parsed) && parsed.length > 0) {
      memoryBanksCache = parsed;
    }
  }
} catch {
  // Bỏ qua lỗi parse storage
}

/**
 * Tải danh sách ngân hàng cập nhật mới nhất từ API VietQR
 */
export async function fetchVietQRBanks(): Promise<VietQRBank[]> {
  try {
    const res = await fetch('https://api.vietqr.io/v2/banks', {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.code === '00' && Array.isArray(json.data)) {
      memoryBanksCache = json.data;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(json.data));
      } catch {
        // quota exceeded
      }
      return json.data;
    }
  } catch (err) {
    console.warn('[BankService] Không thể kết nối VietQR API, sử dụng dữ liệu mặc định:', err);
  }
  return memoryBanksCache;
}

/**
 * Tra cứu logo ngân hàng từ API VietQR dựa trên tên hoặc mã tài khoản
 */
export function lookupBankFromApi(query: string): VietQRBank | null {
  if (!query) return null;
  const q = query.toLowerCase().trim();

  // 1. Khớp chính xác code
  const exactCode = memoryBanksCache.find(b => b.code.toLowerCase() === q);
  if (exactCode) return exactCode;

  // 2. Khớp shortName
  const matchShortName = memoryBanksCache.find(b => b.shortName.toLowerCase() === q);
  if (matchShortName) return matchShortName;

  // 3. Khớp từ khóa phổ biến trong tên
  const partial = memoryBanksCache.find(b => {
    const nameLower = b.name.toLowerCase();
    const shortLower = b.shortName.toLowerCase();
    const codeLower = b.code.toLowerCase();
    return q.includes(codeLower) || q.includes(shortLower) || nameLower.includes(q);
  });

  return partial || null;
}
