import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Download,
  RotateCcw,
  UserRound,
  Palette,
  Tags,
  Crown,
  Sparkles
} from 'lucide-react';
import {
  Box,
  Button,
  Card,
  Typography,
  Switch,
  Chip,
  Paper,
  Divider
} from '@mui/material';

import { useFinance } from '../../store';
import { seed } from '../../mocks/data';
import { downloadCsv } from '../../lib/finance';
import { Confirm, PageHead } from '../../components/ui';
import { MuiTextField, MuiSelect } from '../../components/mui/MuiInputs';
import { isProUser } from '../../lib/subscription';

export default function Settings() {
  const data = useFinance(s => s.data)!;
  const update = useFinance(s => s.update);
  const notify = useFinance(s => s.notify);
  const { theme, setTheme, openPricing } = useFinance();

  const [name, setName] = useState(data.user.name);
  const [email, setEmail] = useState(data.user.email);
  const [day, setDay] = useState(data.user.financialMonthStart);
  const [alerts, setAlerts] = useState(localStorage.getItem('finora:alerts') !== 'off');
  const [resetOpen, setResetOpen] = useState(false);

  const isPro = isProUser(data);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email)) return;
    update(
      d => ({
        ...d,
        user: { ...d.user, name: name.trim(), email, financialMonthStart: day }
      }),
      'Đã lưu thông tin cài đặt'
    );
  };

  const toggleProDevMode = async () => {
    const nextPlan = isPro ? 'free' : 'pro';
    await update(d => ({
      ...d,
      user: {
        ...d.user,
        plan: nextPlan,
        proExpiresAt: nextPlan === 'pro' ? '2099-12-31' : undefined
      }
    }));
    notify(
      nextPlan === 'pro'
        ? '👑 Đã bật chế độ Finora Pro (Dev Mode)'
        : 'Đã chuyển về gói Cơ bản (Free)'
    );
  };

  return (
    <>
      <PageHead
        eyebrow="CÁ NHÂN HÓA"
        title="Cài đặt"
        subtitle="Tùy chỉnh trải nghiệm quản lý tài chính và chế độ đăng ký gói cước."
      />

      <div className="rowcharts">
        {/* Personal Info */}
        <Card variant="outlined" className="card pad" sx={{ borderRadius: 3 }}>
          <div className="section-head">
            <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
              <UserRound size={18} /> Thông tin cá nhân
            </Typography>
          </div>
          <Box component="form" onSubmit={save} sx={{ display: 'grid', gap: 2, mt: 1 }}>
            <MuiTextField
              label="Họ và tên"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
            <MuiTextField
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <MuiSelect
                label="Tiền tệ"
                value="VND"
                disabled
                onChange={() => {}}
                options={[{ value: 'VND', label: 'Việt Nam đồng (₫)' }]}
              />
              <MuiSelect
                label="Ngày bắt đầu tháng tài chính"
                value={String(day)}
                onChange={val => setDay(Number(val))}
                options={Array.from({ length: 28 }, (_, i) => ({
                  value: String(i + 1),
                  label: `Ngày ${i + 1}`
                }))}
              />
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Ngày bắt đầu tháng tài chính được dùng để tính toán chu kỳ Ngân sách và Báo cáo dòng tiền.
            </Typography>
            <Button type="submit" variant="contained" color="primary" sx={{ width: 'fit-content', mt: 1 }}>
              Lưu thay đổi
            </Button>
          </Box>
        </Card>

        {/* Plan / Subscription / Dev Mode */}
        <Card variant="outlined" className="card pad" sx={{ borderRadius: 3 }}>
          <div className="section-head">
            <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Crown size={18} color="#f59e0b" /> Gói cước & Đăng ký
            </Typography>
          </div>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: isPro ? 'rgba(245, 158, 11, 0.08)' : 'action.hover', mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {isPro ? 'Finora Pro 👑' : 'Gói Cơ Bản (Free)'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {isPro
                    ? 'Bạn đang có toàn bộ đặc quyền không giới hạn'
                    : 'Tối đa 2 tài khoản, 3 ngân sách, 5 lượt AI/ngày'}
                </Typography>
              </Box>
              <Chip
                label={isPro ? 'ĐANG KÍCH HOẠT' : 'MIỄN PHÍ'}
                color={isPro ? 'warning' : 'default'}
                size="small"
                sx={{ fontWeight: 800, fontSize: 10 }}
              />
            </Box>

            {!isPro ? (
              <Button
                variant="contained"
                size="small"
                color="primary"
                startIcon={<Sparkles size={15} />}
                onClick={() => openPricing('Nâng cấp Finora Pro')}
                sx={{ mt: 1 }}
              >
                Nâng cấp lên Pro ngay
              </Button>
            ) : (
              <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600, display: 'block', mt: 0.5 }}>
                ✨ Hiệu lực đến: {data.user.proExpiresAt || 'Vô thời hạn'}
              </Typography>
            )}
          </Paper>

          {/* Dev Mode Switch */}
          <Box sx={{ p: 1.5, borderRadius: 2, border: '1px dashed', borderColor: 'divider', mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Dev Mode: Chuyển đổi nhanh Free ↔ Pro
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Phục vụ kiểm thử giao diện và quyền lợi ngay lập tức
                </Typography>
              </Box>
              <Switch checked={isPro} onChange={toggleProDevMode} color="warning" />
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Appearance & Notifications */}
          <div className="section-head">
            <Typography variant="subtitle1" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Palette size={16} /> Giao diện & thông báo
            </Typography>
          </div>
          <Box sx={{ display: 'grid', gap: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Giao diện tối (Dark Mode)</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Tối ưu cho mắt khi làm việc buổi tối
                </Typography>
              </Box>
              <Switch
                checked={theme === 'dark'}
                onChange={e => setTheme(e.target.checked ? 'dark' : 'light')}
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Thông báo trong ứng dụng</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Nhắc nhở hạn ngân sách và thanh toán định kỳ
                </Typography>
              </Box>
              <Switch
                checked={alerts}
                onChange={e => {
                  setAlerts(e.target.checked);
                  localStorage.setItem('finora:alerts', e.target.checked ? 'on' : 'off');
                }}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Data & Backup */}
          <div className="section-head">
            <Typography variant="subtitle1" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tags size={16} /> Quản lý dữ liệu
            </Typography>
          </div>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Link to="/categories" style={{ textDecoration: 'none' }}>
              <Button variant="outlined" color="inherit" size="small">
                Quản lý danh mục
              </Button>
            </Link>
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              startIcon={<Download size={14} />}
              onClick={() =>
                downloadCsv('finora-du-lieu.csv', [
                  ['ID', 'Tên', 'Số tiền', 'Loại', 'Ngày'],
                  ...data.transactions.map(t => [t.id, t.name, t.amount, t.type, t.date])
                ])
              }
            >
              Xuất giao dịch CSV
            </Button>
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<RotateCcw size={14} />}
              onClick={() => setResetOpen(true)}
            >
              Khôi phục dữ liệu mẫu
            </Button>
          </Box>
        </Card>
      </div>

      <Confirm
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => update(() => structuredClone(seed))}
        title="Khôi phục dữ liệu mẫu ban đầu"
        message="Mọi thay đổi trên thiết bị này sẽ được thay thế bằng bộ dữ liệu mẫu ban đầu của Finora."
      />
    </>
  );
}
