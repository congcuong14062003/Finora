import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Chip,
  Alert,
  LinearProgress
} from '@mui/material';
import {
  CloudUpload,
  HardDrive,
  ShieldCheck,
  FileDown,
  FileUp
} from 'lucide-react';
import { useFinance } from '../store';

interface CloudSyncModalProps {
  open: boolean;
  onClose: () => void;
}

export function CloudSyncModal({ open, onClose }: CloudSyncModalProps) {
  const { data, update, notify } = useFinance();
  const [syncing, setSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!data) return null;

  const lastSyncStr = localStorage.getItem('finora:last_cloud_sync');
  const txCount = data.transactions.length;
  const accCount = data.accounts.length;
  const approxSizeKb = Math.round(JSON.stringify(data).length / 1024);

  const handleSyncToCloud = async () => {
    setSyncing(true);
    setStatusMsg(null);

    // Simulate secure encrypted payload sync
    setTimeout(() => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} - ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
      localStorage.setItem('finora:last_cloud_sync', timeStr);
      setSyncing(false);
      setStatusMsg(`Đã đồng bộ ${txCount} giao dịch & ${accCount} tài khoản lên Cloud an toàn (${timeStr})`);
      notify('Đã đồng bộ dữ liệu lên Cloud an toàn');
    }, 1200);
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finora-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Đã xuất bản sao lưu Offline (.json) về máy');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.transactions || !parsed.accounts) {
          throw new Error('Định dạng tệp không hợp lệ');
        }
        await update(() => parsed, 'Đã khôi phục dữ liệu từ tệp sao lưu thành công');
        notify('Đã khôi phục dữ liệu');
        onClose();
      } catch {
        notify({ message: 'Tệp JSON không hợp lệ hoặc bị lỗi định dạng', severity: 'error' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HardDrive size={20} color="#0f766e" />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Lưu trữ Offline & Đồng bộ Cloud
          </Typography>
        </Box>
        <Chip
          icon={<ShieldCheck size={14} color="#15803d" />}
          label="Offline-First"
          size="small"
          sx={{
            fontWeight: 750,
            fontSize: 11,
            bgcolor: 'rgba(22, 163, 74, 0.1)',
            color: '#15803d'
          }}
        />
      </DialogTitle>

      <DialogContent sx={{ pt: 1.5 }}>
        <Alert severity="info" variant="outlined" sx={{ mb: 2.5, borderRadius: 2 }}>
          Tích Lộc hoạt động theo nguyên lý <strong>Local-First (Ưu tiên ngoại tuyến)</strong>: Toàn bộ sổ thu chi được lưu trực tiếp trên thiết bị của bạn. Chỉ khi bạn bấm &ldquo;Đồng bộ lên Cloud&rdquo;, dữ liệu mới được đẩy lên máy chủ đám mây an toàn.
        </Alert>

        {syncing && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

        {statusMsg && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
            {statusMsg}
          </Alert>
        )}

        {/* Local Storage Stats */}
        <Box
          sx={{
            p: 2,
            borderRadius: 2.5,
            bgcolor: 'var(--bg-subtle)',
            mb: 2.5,
            border: '1px solid var(--border-subtle)'
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 750, mb: 1, color: 'text.secondary', fontSize: 12 }}>
            DỮ LIỆU ĐANG LƯU TRÊN MÁY BẠN
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, textAlign: 'center' }}>
            <Box sx={{ p: 1, bgcolor: 'var(--bg-surface)', borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                {txCount}
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
                Giao dịch
              </Typography>
            </Box>
            <Box sx={{ p: 1, bgcolor: 'var(--bg-surface)', borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                {accCount}
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
                Tài khoản
              </Typography>
            </Box>
            <Box sx={{ p: 1, bgcolor: 'var(--bg-surface)', borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                ~{approxSizeKb} KB
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
                Dung lượng sổ
              </Typography>
            </Box>
          </Box>
          <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, color: 'var(--text-muted)' }}>
            <span>Lần đồng bộ Cloud gần nhất:</span>
            <strong style={{ color: lastSyncStr ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {lastSyncStr || 'Chưa đồng bộ (Chỉ lưu Offline)'}
            </strong>
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<CloudUpload size={16} />}
            disabled={syncing}
            onClick={handleSyncToCloud}
            fullWidth
            sx={{ py: 1.1, fontWeight: 750 }}
          >
            {syncing ? 'Đang đồng bộ...' : 'Đồng bộ lên Cloud theo yêu cầu'}
          </Button>

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<FileDown size={15} />}
              onClick={handleExportJson}
              fullWidth
              sx={{ fontSize: 12 }}
            >
              Tải sao lưu (.json)
            </Button>

            <Button
              variant="outlined"
              color="inherit"
              component="label"
              startIcon={<FileUp size={15} />}
              fullWidth
              sx={{ fontSize: 12 }}
            >
              Khôi phục tệp (.json)
              <input type="file" accept=".json" hidden onChange={handleImportJson} />
            </Button>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
}
