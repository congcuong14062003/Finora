import React, { useState } from 'react';
import {
  Utensils,
  Car,
  Home,
  ShoppingBag,
  Film,
  CircleDollarSign,
  TrendingUp,
  Briefcase,
  Layers,
  ArrowRightLeft,
  Receipt,
  User
} from 'lucide-react';
import { Box } from '@mui/material';

import { lookupBankFromApi } from './bankService';

export interface BankBadgeInfo {
  code: string;
  name: string;
  bg: string;
  color: string;
  logoUrl?: string;
  fallbackUrl?: string;
}

export function getBankBadge(accountName: string = '', accountType: string = 'bank'): BankBadgeInfo {
  const lower = accountName.toLowerCase();

  // 1. Kiểm tra ví điện tử trước
  if (lower.includes('momo')) {
    return {
      code: 'MoMo',
      name: 'Ví MoMo',
      bg: '#a50064',
      color: '#ffffff',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png',
      fallbackUrl: '/logos/momo.svg'
    };
  }
  if (lower.includes('zalo') || lower.includes('zalopay')) {
    return {
      code: 'Zalo',
      name: 'ZaloPay',
      bg: '#0068ff',
      color: '#ffffff',
      logoUrl: 'https://cdn.haitrieu.com/wp-content/uploads/2022/10/Logo-ZaloPay-Square.png',
      fallbackUrl: '/logos/zalopay.svg'
    };
  }
  if (lower.includes('vnpay')) {
    return {
      code: 'VNPAY',
      name: 'VNPay',
      bg: '#005baa',
      color: '#ffffff',
      logoUrl: 'https://cdn.haitrieu.com/wp-content/uploads/2022/10/Icon-VNPAY-QR.png',
      fallbackUrl: '/logos/vnpay.svg'
    };
  }

  // 2. Tra cứu trực tiếp từ VietQR Bank API
  const apiBank = lookupBankFromApi(accountName);
  if (apiBank) {
    return {
      code: apiBank.code,
      name: apiBank.shortName,
      bg: '#20705B',
      color: '#ffffff',
      logoUrl: apiBank.logo, // Trực tiếp từ VietQR CDN https://cdn.vietqr.io/img/{CODE}.png
      fallbackUrl: `/logos/${apiBank.code.toLowerCase()}.png`
    };
  }

  // 3. Fallback cho các loại tài khoản phi ngân hàng
  if (accountType === 'credit_card' || lower.includes('credit') || lower.includes('tín dụng')) {
    return {
      code: 'CARD',
      name: 'Thẻ tín dụng',
      bg: '#b45309',
      color: '#ffffff'
    };
  }
  if (accountType === 'cash' || lower.includes('tiền mặt') || lower.includes('ví')) {
    return {
      code: 'CASH',
      name: 'Tiền mặt',
      bg: '#15966B',
      color: '#ffffff',
      logoUrl: '/logos/cash.svg'
    };
  }
  if (accountType === 'investment' || lower.includes('đầu tư') || lower.includes('chứng khoán')) {
    return {
      code: 'INV',
      name: 'Tài khoản đầu tư',
      bg: '#0f766e',
      color: '#ffffff'
    };
  }

  return {
    code: accountName ? accountName.slice(0, 3).toUpperCase() : 'ACC',
    name: accountName || 'Tài khoản',
    bg: '#475569',
    color: '#ffffff'
  };
}

export function BankLogoBadge({
  accountName,
  accountType,
  size = 'large'
}: {
  accountName?: string;
  accountType?: string;
  size?: 'small' | 'medium' | 'large';
}) {
  const badge = getBankBadge(accountName || '', accountType);
  const [currentSrc, setCurrentSrc] = useState(badge.logoUrl);
  const [failed, setFailed] = useState(!badge.logoUrl);

  const dim = size === 'large' ? 60 : size === 'medium' ? 40 : 26;
  const radius = size === 'large' ? 3 : size === 'medium' ? 2 : 1.25;

  const handleError = () => {
    if (currentSrc === badge.logoUrl && badge.fallbackUrl) {
      setCurrentSrc(badge.fallbackUrl);
    } else {
      setFailed(true);
    }
  };

  if (currentSrc && !failed) {
    return (
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: dim,
          height: dim,
          minWidth: dim,
          minHeight: dim,
          maxWidth: dim,
          maxHeight: dim,
          borderRadius: radius,
          bgcolor: '#ffffff',
          border: '1px solid var(--border-subtle)',
          p: 0,
          overflow: 'hidden',
          flexShrink: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
        title={badge.name}
      >
        <img
          src={currentSrc}
          alt={badge.name}
          onError={handleError}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            padding: 0,
            margin: 0
          }}
        />
      </Box>
    );
  }

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: dim,
        height: dim,
        minWidth: dim,
        minHeight: dim,
        maxWidth: dim,
        maxHeight: dim,
        bgcolor: badge.bg,
        color: badge.color,
        fontWeight: 800,
        fontSize: size === 'large' ? 16 : size === 'medium' ? 12 : 9.5,
        letterSpacing: '0.02em',
        borderRadius: radius,
        border: '1px solid var(--border-subtle)',
        lineHeight: 1,
        p: 0,
        flexShrink: 0
      }}
      title={badge.name}
    >
      {badge.code}
    </Box>
  );
}

export interface DebtBadgeInfo {
  name: string;
  logoUrl?: string;
  fallbackUrl?: string;
  icon?: React.ReactNode;
  bg?: string;
  color?: string;
}

export function getDebtBadge(debtName: string = '', lenderName: string = ''): DebtBadgeInfo {
  const text = `${debtName} ${lenderName}`.toLowerCase();

  if (text.includes('fe credit') || text.includes('fecredit')) {
    return {
      name: 'FE Credit',
      logoUrl: 'https://fecredit.com.vn/wp-content/themes/fecredit/images/logo.png',
      fallbackUrl: '/logos/fecredit.svg'
    };
  }
  if (text.includes('home credit') || text.includes('homecredit')) {
    return {
      name: 'Home Credit',
      logoUrl: 'https://homecredit.vn/static/images/logo.svg',
      fallbackUrl: '/logos/homecredit.svg'
    };
  }
  if (text.includes('momo')) {
    return {
      name: 'MoMo',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png',
      fallbackUrl: '/logos/momo.svg'
    };
  }
  if (text.includes('zalo') || text.includes('zalopay')) {
    return {
      name: 'ZaloPay',
      logoUrl: 'https://cdn.haitrieu.com/wp-content/uploads/2022/10/Logo-ZaloPay-Square.png',
      fallbackUrl: '/logos/zalopay.svg'
    };
  }
  if (text.includes('vnpay')) {
    return {
      name: 'VNPay',
      logoUrl: 'https://cdn.haitrieu.com/wp-content/uploads/2022/10/Icon-VNPAY-QR.png',
      fallbackUrl: '/logos/vnpay.svg'
    };
  }

  // Tra cứu tổ chức ngân hàng cho vay / thẻ tín dụng từ API VietQR
  const apiBank = lookupBankFromApi(text);
  if (apiBank) {
    return {
      name: apiBank.shortName,
      logoUrl: apiBank.logo,
      fallbackUrl: `/logos/${apiBank.code.toLowerCase()}.png`
    };
  }

  if (text.includes('trả góp') || text.includes('tín dụng')) {
    return { name: 'Tín dụng trả góp', icon: <Receipt size={16} />, bg: 'rgba(180, 83, 9, 0.1)', color: '#b45309' };
  }

  return { name: debtName || 'Khoản nợ', icon: <User size={16} />, bg: 'var(--bg-subtle)', color: 'var(--text-secondary)' };
}

export function DebtLogoBadge({
  debtName,
  lenderName,
  size = 'large'
}: {
  debtName?: string;
  lenderName?: string;
  size?: 'small' | 'medium' | 'large';
}) {
  const badge = getDebtBadge(debtName || '', lenderName || '');
  const [currentSrc, setCurrentSrc] = useState(badge.logoUrl);
  const [failed, setFailed] = useState(!badge.logoUrl);

  const dim = size === 'large' ? 60 : size === 'medium' ? 40 : 26;
  const radius = size === 'large' ? 3 : size === 'medium' ? 2 : 1.25;

  const handleError = () => {
    if (currentSrc === badge.logoUrl && badge.fallbackUrl) {
      setCurrentSrc(badge.fallbackUrl);
    } else {
      setFailed(true);
    }
  };

  if (currentSrc && !failed) {
    return (
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: dim,
          height: dim,
          minWidth: dim,
          minHeight: dim,
          maxWidth: dim,
          maxHeight: dim,
          borderRadius: radius,
          bgcolor: '#ffffff',
          border: '1px solid var(--border-subtle)',
          p: 0,
          overflow: 'hidden',
          flexShrink: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
        title={badge.name}
      >
        <img
          src={currentSrc}
          alt={badge.name}
          onError={handleError}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', padding: 0, margin: 0 }}
        />
      </Box>
    );
  }

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: dim,
        height: dim,
        minWidth: dim,
        minHeight: dim,
        maxWidth: dim,
        maxHeight: dim,
        borderRadius: radius,
        bgcolor: badge.bg || 'var(--bg-subtle)',
        color: badge.color || 'var(--text-secondary)',
        border: '1px solid var(--border-subtle)',
        p: 0,
        flexShrink: 0
      }}
      title={badge.name}
    >
      {badge.icon || <User size={size === 'large' ? 28 : size === 'medium' ? 20 : 14} />}
    </Box>
  );
}

export interface AssetBadgeInfo {
  name: string;
  logoUrl?: string;
  fallbackUrl?: string;
  icon?: React.ReactNode;
}

export function getAssetBadge(symbol: string = '', assetClass: string = '', name: string = ''): AssetBadgeInfo {
  const sym = symbol.toUpperCase().trim();
  const text = `${sym} ${name}`.toLowerCase();

  // Tiền mã hóa (Crypto) - Lấy từ Crypto Icons CDN chuẩn toàn cầu
  const cryptoSymbols = ['BTC', 'ETH', 'USDT', 'SOL', 'BNB', 'ADA', 'XRP', 'DOGE', 'DOT', 'AVAX', 'MATIC', 'TRX', 'LINK'];
  if (cryptoSymbols.includes(sym) || assetClass === 'crypto') {
    const coinKey = sym.toLowerCase();
    return {
      name: sym,
      logoUrl: `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${coinKey}.png`,
      fallbackUrl: `/logos/${coinKey}.png`
    };
  }

  if (assetClass === 'gold' || text.includes('vàng') || text.includes('sjc') || sym.includes('GOLD')) {
    return { name: 'Vàng SJC', logoUrl: '/logos/sjc.svg' };
  }

  // Tra cứu mã cổ phiếu ngân hàng qua API VietQR
  const apiBank = lookupBankFromApi(sym);
  if (apiBank) {
    return {
      name: apiBank.shortName,
      logoUrl: apiBank.logo,
      fallbackUrl: `/logos/${apiBank.code.toLowerCase()}.png`
    };
  }

  return { name: symbol, icon: <TrendingUp size={16} /> };
}

export function AssetLogoBadge({
  symbol,
  assetClass,
  name,
  size = 'large'
}: {
  symbol?: string;
  assetClass?: string;
  name?: string;
  size?: 'small' | 'medium' | 'large';
}) {
  const badge = getAssetBadge(symbol || '', assetClass || '', name || '');
  const [currentSrc, setCurrentSrc] = useState(badge.logoUrl);
  const [failed, setFailed] = useState(!badge.logoUrl);

  const dim = size === 'large' ? 60 : size === 'medium' ? 40 : 26;
  const radius = size === 'large' ? 3 : size === 'medium' ? 2 : 1.25;

  const handleError = () => {
    if (currentSrc === badge.logoUrl && badge.fallbackUrl) {
      setCurrentSrc(badge.fallbackUrl);
    } else {
      setFailed(true);
    }
  };

  if (currentSrc && !failed) {
    return (
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: dim,
          height: dim,
          minWidth: dim,
          minHeight: dim,
          maxWidth: dim,
          maxHeight: dim,
          borderRadius: radius,
          bgcolor: '#ffffff',
          border: '1px solid var(--border-subtle)',
          p: 0,
          overflow: 'hidden',
          flexShrink: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
        title={badge.name}
      >
        <img
          src={currentSrc}
          alt={badge.name}
          onError={handleError}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', padding: 0, margin: 0 }}
        />
      </Box>
    );
  }

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: dim,
        height: dim,
        minWidth: dim,
        minHeight: dim,
        maxWidth: dim,
        maxHeight: dim,
        borderRadius: radius,
        bgcolor: 'var(--bg-subtle)',
        color: 'primary.main',
        border: '1px solid var(--border-subtle)',
        p: 0,
        flexShrink: 0
      }}
      title={badge.name}
    >
      {badge.icon || <TrendingUp size={size === 'large' ? 28 : size === 'medium' ? 20 : 14} />}
    </Box>
  );
}

export interface CategoryBadgeInfo {
  icon: React.ReactElement;
  bg: string;
  color: string;
  name: string;
}

export function getCategoryBadge(categoryId: string = '', categoryName: string = ''): CategoryBadgeInfo {
  const id = categoryId.toLowerCase();
  const name = categoryName.toLowerCase();

  if (id.includes('food') || name.includes('ăn') || name.includes('uống') || name.includes('cafe')) {
    return {
      icon: <Utensils size={15} />,
      bg: 'rgba(249, 115, 22, 0.12)',
      color: '#ea580c',
      name: 'Ăn uống'
    };
  }
  if (id.includes('transport') || name.includes('xe') || name.includes('xăng') || name.includes('grab')) {
    return {
      icon: <Car size={15} />,
      bg: 'rgba(14, 165, 233, 0.12)',
      color: '#0284c7',
      name: 'Di chuyển'
    };
  }
  if (id.includes('house') || name.includes('nhà') || name.includes('điện') || name.includes('nước')) {
    return {
      icon: <Home size={15} />,
      bg: 'rgba(15, 118, 110, 0.12)',
      color: '#0f766e',
      name: 'Nhà cửa'
    };
  }
  if (id.includes('shopping') || name.includes('mua sắm') || name.includes('quần áo')) {
    return {
      icon: <ShoppingBag size={15} />,
      bg: 'rgba(236, 72, 153, 0.12)',
      color: '#db2777',
      name: 'Mua sắm'
    };
  }
  if (id.includes('entertainment') || name.includes('giải trí') || name.includes('phim') || name.includes('game')) {
    return {
      icon: <Film size={15} />,
      bg: 'rgba(245, 158, 11, 0.12)',
      color: '#b45309',
      name: 'Giải trí'
    };
  }
  if (id.includes('salary') || name.includes('lương') || name.includes('thưởng') || name.includes('thu nhập')) {
    return {
      icon: <CircleDollarSign size={15} />,
      bg: 'rgba(21, 150, 107, 0.14)',
      color: '#15966B',
      name: 'Thu nhập'
    };
  }
  if (id.includes('invest') || name.includes('đầu tư') || name.includes('cổ phiếu') || name.includes('vàng')) {
    return {
      icon: <TrendingUp size={15} />,
      bg: 'rgba(13, 148, 136, 0.12)',
      color: '#0f766e',
      name: 'Đầu tư'
    };
  }
  if (id.includes('business') || name.includes('kinh doanh') || name.includes('bán lẻ')) {
    return {
      icon: <Briefcase size={15} />,
      bg: 'rgba(37, 99, 235, 0.12)',
      color: '#1d4ed8',
      name: 'Kinh doanh'
    };
  }

  return {
    icon: <Layers size={15} />,
    bg: 'rgba(100, 116, 139, 0.12)',
    color: '#475569',
    name: categoryName || 'Danh mục'
  };
}

export function CategoryAvatarBadge({ categoryId, categoryName, txType }: { categoryId?: string; categoryName?: string; txType?: string }) {
  if (txType === 'transfer') {
    return (
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(37, 99, 235, 0.12)',
          color: '#2563eb',
          flexShrink: 0
        }}
        title="Chuyển khoản nội bộ"
      >
        <ArrowRightLeft size={15} />
      </Box>
    );
  }

  const badge = getCategoryBadge(categoryId, categoryName);

  return (
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: badge.bg,
        color: badge.color,
        flexShrink: 0
      }}
      title={categoryName || badge.name}
    >
      {badge.icon}
    </Box>
  );
}
