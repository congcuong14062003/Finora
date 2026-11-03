import type { ReactNode } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
  Box,
  Typography,
  LinearProgress
} from '@mui/material';
import { X, Inbox } from 'lucide-react';

export function Modal({
  title,
  open,
  onClose,
  children,
  footer,
  maxWidth = 'sm'
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg';
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={maxWidth}
      slotProps={{
        paper: {
          sx: {
            p: 1,
            borderRadius: 3,
            overflow: 'hidden'
          }
        }
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 18,
          fontWeight: 700
        }}
      >
        <span>{title}</span>
        <IconButton
          aria-label="Đóng"
          onClick={onClose}
          size="small"
          sx={{ color: 'text.secondary' }}
        >
          <X size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 2.5 }}>
        {children}
      </DialogContent>
      {footer && (
        <DialogActions sx={{ p: 2, gap: 1 }}>
          {footer}
        </DialogActions>
      )}
    </Dialog>
  );
}

export function Progress({
  value,
  color = '#10b981'
}: {
  value: number;
  color?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <Box sx={{ width: '100%', my: 0.5 }}>
      <LinearProgress
        variant="determinate"
        value={clamped}
        sx={{
          height: 8,
          borderRadius: 4,
          bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': {
            bgcolor: color,
            borderRadius: 4
          }
        }}
      />
    </Box>
  );
}

export function Empty({
  text = 'Chưa có dữ liệu cho lựa chọn này'
}: {
  text?: string;
}) {
  return (
    <Box
      sx={{
        py: 5,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        color: 'text.secondary'
      }}
    >
      <Inbox size={32} strokeWidth={1.5} />
      <Typography variant="body2" sx={{ fontWeight: 500, fontSize: 13 }}>
        {text}
      </Typography>
    </Box>
  );
}

export function PageHead({
  eyebrow,
  title,
  subtitle,
  actions
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 2,
        mb: 3
      }}
    >
      <Box>
        {eyebrow && (
          <Typography
            variant="overline"
            sx={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1.2,
              color: 'primary.main',
              display: 'block',
              lineHeight: 1
            }}
          >
            {eyebrow}
          </Typography>
        )}
        <Typography
          variant="h5"
          component="h2"
          sx={{
            fontWeight: 800,
            letterSpacing: -0.5,
            mt: 0.5,
            color: 'text.primary'
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', mt: 0.25, fontSize: 13 }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {actions}
        </Box>
      )}
    </Box>
  );
}

export function Confirm({
  open,
  onClose,
  onConfirm,
  title = 'Xác nhận xóa',
  message
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, fontSize: 17 }}>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} color="inherit" variant="text">
          Hủy
        </Button>
        <Button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          color="error"
          variant="contained"
        >
          Xác nhận
        </Button>
      </DialogActions>
    </Dialog>
  );
}
