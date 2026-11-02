import React, { useMemo } from 'react';
import {
  TextField,
  type TextFieldProps,
  FormControl,
  InputLabel,
  Select,
  type SelectProps,
  MenuItem,
  InputAdornment,
  Box,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  FormHelperText
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { type Dayjs } from 'dayjs';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react';

export function MuiTextField(props: TextFieldProps) {
  return (
    <TextField
      fullWidth
      size="small"
      variant="outlined"
      {...props}
    />
  );
}

interface MuiCurrencyInputProps extends Omit<TextFieldProps, 'onChange'> {
  value: string | number;
  onChange: (value: string) => void;
  showDenominations?: boolean;
}

export function MuiCurrencyInput({
  value,
  onChange,
  showDenominations = true,
  label = 'Số tiền',
  ...rest
}: MuiCurrencyInputProps) {
  const strVal = String(value ?? '');
  const numericVal = parseInt(strVal.replace(/\D/g, ''), 10) || 0;

  // Smart VND Denomination Suggestions
  const suggestions = useMemo(() => {
    if (!showDenominations || numericVal <= 0) return [];

    // If user typed small digits like 35, suggest 35.000, 350.000, 3.500.000
    if (numericVal < 1000) {
      return [
        numericVal * 1000,
        numericVal * 10000,
        numericVal * 100000
      ];
    } else if (numericVal < 10000) {
      return [
        numericVal * 1000,
        numericVal * 10000
      ];
    }
    return [];
  }, [numericVal, showDenominations]);

  return (
    <Box sx={{ width: '100%' }}>
      <TextField
        fullWidth
        size="small"
        label={label}
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                ₫
              </InputAdornment>
            )
          }
        }}
        {...rest}
      />
      {suggestions.length > 0 && (
        <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box component="span" sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>
            Gợi ý nhanh:
          </Box>
          {suggestions.map(s => (
            <Chip
              key={s}
              label={`${new Intl.NumberFormat('vi-VN').format(s)} ₫`}
              size="small"
              clickable
              color="primary"
              variant="outlined"
              onClick={() => onChange(String(s))}
              sx={{ fontSize: 11, height: 22 }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

interface MuiSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;
  subtitle?: string;
}

interface MuiSelectProps extends Omit<SelectProps, 'onChange'> {
  label: string;
  options: MuiSelectOption[];
  value: string;
  onChange: (val: string) => void;
  error?: boolean;
  helperText?: string;
}

export function MuiSelect({
  label,
  options,
  value,
  onChange,
  error,
  helperText,
  ...rest
}: MuiSelectProps) {
  const labelId = `select-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <FormControl fullWidth size="small" error={error}>
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select
        labelId={labelId}
        label={label}
        value={value}
        onChange={e => onChange(String(e.target.value))}
        {...rest}
      >
        {options.map(opt => (
          <MenuItem key={opt.value} value={opt.value}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              {opt.icon}
              <Box sx={{ flex: 1 }}>
                <Box component="span" sx={{ fontWeight: 500, fontSize: 13 }}>
                  {opt.label}
                </Box>
                {opt.subtitle && (
                  <Box component="div" sx={{ fontSize: 11, color: 'text.secondary' }}>
                    {opt.subtitle}
                  </Box>
                )}
              </Box>
            </Box>
          </MenuItem>
        ))}
      </Select>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
}

interface MuiDatePickerProps {
  label: string;
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
}

export function MuiDatePicker({
  label,
  value,
  onChange,
  error,
  helperText,
  disabled
}: MuiDatePickerProps) {
  const dayjsValue = value ? dayjs(value) : null;

  return (
    <DatePicker
      label={label}
      value={dayjsValue}
      disabled={disabled}
      onChange={(newValue: Dayjs | null) => {
        if (newValue && newValue.isValid()) {
          onChange(newValue.format('YYYY-MM-DD'));
        }
      }}
      format="DD/MM/YYYY"
      slotProps={{
        textField: {
          fullWidth: true,
          size: 'small',
          error,
          helperText
        }
      }}
    />
  );
}

interface MuiMonthPickerProps {
  label: string;
  value: string; // YYYY-MM
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function MuiMonthPicker({
  label,
  value,
  onChange,
  disabled
}: MuiMonthPickerProps) {
  const dayjsValue = value ? dayjs(value + '-01') : null;

  return (
    <DatePicker
      views={['year', 'month']}
      label={label}
      value={dayjsValue}
      disabled={disabled}
      onChange={(newValue: Dayjs | null) => {
        if (newValue && newValue.isValid()) {
          onChange(newValue.format('YYYY-MM'));
        }
      }}
      format="MM/YYYY"
      slotProps={{
        textField: {
          size: 'small',
          sx: { minWidth: 140 }
        }
      }}
    />
  );
}

export function MuiTransactionTypeToggle({
  value,
  onChange,
  includeTransfer = true
}: {
  value: 'income' | 'expense' | 'transfer';
  onChange: (type: 'income' | 'expense' | 'transfer') => void;
  includeTransfer?: boolean;
}) {
  return (
    <ToggleButtonGroup
      exclusive
      fullWidth
      size="small"
      value={value}
      onChange={(_, next) => {
        if (next) onChange(next);
      }}
      sx={{
        '& .MuiToggleButton-root': {
          fontWeight: 600,
          textTransform: 'none',
          py: 0.8
        }
      }}
    >
      <ToggleButton
        value="expense"
        sx={{
          '&.Mui-selected': {
            bgcolor: 'error.main',
            color: '#fff',
            '&:hover': { bgcolor: 'error.dark' }
          }
        }}
      >
        <ArrowUpRight size={16} style={{ marginRight: 6 }} /> Chi tiêu
      </ToggleButton>
      <ToggleButton
        value="income"
        sx={{
          '&.Mui-selected': {
            bgcolor: 'success.main',
            color: '#fff',
            '&:hover': { bgcolor: 'success.dark' }
          }
        }}
      >
        <ArrowDownLeft size={16} style={{ marginRight: 6 }} /> Thu nhập
      </ToggleButton>
      {includeTransfer && (
        <ToggleButton
          value="transfer"
          sx={{
            '&.Mui-selected': {
              bgcolor: 'primary.main',
              color: '#fff',
              '&:hover': { bgcolor: 'primary.dark' }
            }
          }}
        >
          <ArrowLeftRight size={16} style={{ marginRight: 6 }} /> Chuyển khoản
        </ToggleButton>
      )}
    </ToggleButtonGroup>
  );
}
