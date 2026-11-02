import React, { useState } from 'react';
import {
  Plus,
  Pencil,
  EyeOff,
  Eye,
  Utensils,
  Car,
  House,
  ShoppingBag,
  Clapperboard,
  HeartPulse,
  BookOpen,
  Receipt,
  Plane,
  Shapes,
  CircleDollarSign
} from 'lucide-react';
import {
  Box,
  Button,
  Card,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';

import { useFinance } from '../../store';
import { uid, money } from '../../lib/finance';
import { PageHead } from '../../components/ui';
import { MuiTextField, MuiSelect } from '../../components/mui/MuiInputs';
import type { Category } from '../../types';

const icons = {
  Utensils,
  Car,
  House,
  ShoppingBag,
  Clapperboard,
  HeartPulse,
  BookOpen,
  Receipt,
  Plane,
  Shapes,
  CircleDollarSign
};

const iconLabels = {
  Utensils: 'Ăn uống',
  Car: 'Di chuyển',
  House: 'Nhà ở',
  ShoppingBag: 'Mua sắm',
  Clapperboard: 'Giải trí',
  HeartPulse: 'Sức khỏe',
  BookOpen: 'Học tập',
  Receipt: 'Hóa đơn',
  Plane: 'Du lịch',
  Shapes: 'Khác',
  CircleDollarSign: 'Thu nhập'
};

const blank = {
  name: '',
  type: 'expense' as Category['type'],
  icon: 'Shapes',
  color: '#10b981'
};

export default function Categories() {
  const data = useFinance(s => s.data)!;
  const update = useFinance(s => s.update);

  const [edit, setEdit] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [tab, setTab] = useState<'expense' | 'income'>('expense');

  const start = (c?: Category) => {
    setEdit(c || null);
    setForm(c ? { name: c.name, type: c.type, icon: c.icon, color: c.color } : { ...blank, type: tab });
    setOpen(true);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    update(d => ({
      ...d,
      categories: edit
        ? d.categories.map(c => (c.id === edit.id ? { ...c, ...form } : c))
        : [...d.categories, { ...form, id: uid(), hidden: false }]
    }));
    setOpen(false);
  };

  return (
    <>
      <PageHead
        eyebrow="PHÂN LOẠI DÒNG TIỀN"
        title="Danh mục"
        subtitle="Danh mục đã sử dụng được lưu trữ đầy đủ để lịch sử tài chính luôn chính xác."
        actions={
          <Button
            variant="contained"
            color="primary"
            startIcon={<Plus size={14} />}
            onClick={() => start()}
          >
            Thêm danh mục
          </Button>
        }
      />

      {/* Tabs */}
      <Box sx={{ mb: 2.5 }}>
        <ToggleButtonGroup
          exclusive
          value={tab}
          onChange={(_, next) => {
            if (next) setTab(next);
          }}
          size="small"
        >
          <ToggleButton value="expense" sx={{ px: 2.5, fontWeight: 700 }}>
            Chi tiêu ({data.categories.filter(c => c.type === 'expense').length})
          </ToggleButton>
          <ToggleButton value="income" sx={{ px: 2.5, fontWeight: 700 }}>
            Thu nhập ({data.categories.filter(c => c.type === 'income').length})
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Categories Tiles */}
      <div className="tiles">
        {data.categories
          .filter(c => c.type === tab)
          .map(c => {
            const used = data.transactions.filter(t => t.categoryId === c.id);
            const Icon = icons[c.icon as keyof typeof icons] || Shapes;
            return (
              <Card
                variant="outlined"
                className="card tile"
                key={c.id}
                sx={{
                  borderRadius: 3,
                  p: 2.5,
                  opacity: c.hidden ? 0.6 : 1
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: c.color + '20',
                      color: c.color
                    }}
                  >
                    <Icon size={18} />
                  </Box>
                  <Chip
                    label={c.hidden ? 'Đã ẩn' : 'Đang dùng'}
                    size="small"
                    color={c.hidden ? 'warning' : 'default'}
                    variant="outlined"
                    sx={{ height: 22, fontSize: 11, fontWeight: 700 }}
                  />
                </Box>

                <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.25 }}>
                  {c.name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
                  {used.length} giao dịch · {money(used.reduce((n, t) => n + t.amount, 0))}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mt: 'auto', alignItems: 'center' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    startIcon={<Pencil size={14} />}
                    onClick={() => start(c)}
                  >
                    Sửa
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    color="inherit"
                    startIcon={c.hidden ? <Eye size={14} /> : <EyeOff size={14} />}
                    onClick={() =>
                      update(d => ({
                        ...d,
                        categories: d.categories.map(x =>
                          x.id === c.id ? { ...x, hidden: !x.hidden } : x
                        )
                      }))
                    }
                  >
                    {c.hidden ? 'Hiện' : 'Ẩn'}
                  </Button>
                </Box>
              </Card>
            );
          })}
      </div>

      {/* Add / Edit Category Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {edit ? 'Sửa danh mục' : 'Thêm danh mục mới'}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2, pt: '16px !important' }}>
          <MuiTextField
            label="Tên danh mục"
            placeholder="VD: Tiền điện nước, Quà tặng, v.v."
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
            autoFocus
          />
          <MuiSelect
            label="Loại danh mục"
            value={form.type}
            disabled={!!edit && data.transactions.some(t => t.categoryId === edit.id)}
            onChange={val => setForm({ ...form, type: val as Category['type'] })}
            options={[
              { value: 'expense', label: 'Chi tiêu' },
              { value: 'income', label: 'Thu nhập' }
            ]}
          />
          <MuiSelect
            label="Biểu tượng đại diện"
            value={form.icon}
            onChange={val => setForm({ ...form, icon: val })}
            options={Object.entries(iconLabels).map(([k, v]) => ({ value: k, label: v }))}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
              Màu biểu tượng:
            </Typography>
            <Box
              component="input"
              type="color"
              value={form.color}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm({ ...form, color: e.target.value })
              }
              sx={{
                width: 44,
                height: 36,
                border: 'none',
                borderRadius: 2,
                cursor: 'pointer',
                p: 0
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Hủy</Button>
          <Button variant="contained" color="primary" onClick={save}>
            Lưu danh mục
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
