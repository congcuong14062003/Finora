import React, { useState } from 'react';
import { IconButton, Menu, MenuItem, ListItemIcon, Typography } from '@mui/material';
import { MoreVertical } from 'lucide-react';

export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  color?: 'error' | 'inherit' | 'primary';
  disabled?: boolean;
}

export function ItemActionMenu({
  items,
  size = 'small',
  ariaLabel = 'Tùy chọn'
}: {
  items: ActionMenuItem[];
  size?: 'small' | 'medium';
  ariaLabel?: string;
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleClose = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton
        size={size}
        onClick={handleClick}
        aria-label={ariaLabel}
        sx={{
          color: 'var(--text-secondary)',
          '&:hover': {
            bgcolor: 'var(--bg-subtle)',
            color: 'var(--text-primary)'
          }
        }}
      >
        <MoreVertical size={16} />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => handleClose()}
        onClick={e => e.stopPropagation()}
        slotProps={{
          paper: {
            sx: {
              minWidth: 160,
              borderRadius: 2,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              border: '1px solid var(--border-subtle)',
              bgcolor: 'var(--bg-surface)'
            }
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {items.map((item, idx) => (
          <MenuItem
            key={idx}
            disabled={item.disabled}
            onClick={e => {
              handleClose(e);
              item.onClick();
            }}
            sx={{
              fontSize: 13,
              fontWeight: 500,
              py: 1,
              px: 1.5,
              color: item.color === 'error' ? 'error.main' : 'var(--text-primary)',
              '&:hover': {
                bgcolor: item.color === 'error' ? 'rgba(214, 91, 88, 0.08)' : 'var(--bg-subtle)'
              }
            }}
          >
            {item.icon && (
              <ListItemIcon
                sx={{
                  minWidth: 28,
                  color: item.color === 'error' ? 'error.main' : 'inherit'
                }}
              >
                {item.icon}
              </ListItemIcon>
            )}
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: item.color === 'error' ? 600 : 500,
                color: 'inherit'
              }}
            >
              {item.label}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
