import { createTheme, type ThemeOptions } from '@mui/material/styles';

export function getFinoraTheme(mode: 'light' | 'dark') {
  const isDark = mode === 'dark';

  const themeOptions: ThemeOptions = {
    palette: {
      mode,
      primary: {
        main: isDark ? '#10b981' : '#059669', // Emerald
        light: '#34d399',
        dark: '#047857',
        contrastText: '#ffffff'
      },
      secondary: {
        main: '#0f172a', // Deep Slate
        light: '#334155',
        dark: '#020617',
        contrastText: '#ffffff'
      },
      success: {
        main: '#10b981',
        contrastText: '#ffffff'
      },
      error: {
        main: '#ef4444',
        contrastText: '#ffffff'
      },
      warning: {
        main: '#f59e0b',
        contrastText: '#ffffff'
      },
      info: {
        main: '#3b82f6',
        contrastText: '#ffffff'
      },
      background: {
        default: isDark ? '#080c14' : '#f8fafc',
        paper: isDark ? '#0f172a' : '#ffffff'
      },
      text: {
        primary: isDark ? '#f8fafc' : '#0f172a',
        secondary: isDark ? '#94a3b8' : '#64748b'
      },
      divider: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(226, 232, 240, 0.8)'
    },
    shape: {
      borderRadius: 10
    },
    typography: {
      fontFamily: [
        'Plus Jakarta Sans',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        'sans-serif'
      ].join(','),
      h1: { fontWeight: 800, letterSpacing: '-0.03em' },
      h2: { fontWeight: 800, letterSpacing: '-0.03em' },
      h3: { fontWeight: 800, letterSpacing: '-0.025em' },
      h4: { fontWeight: 800, letterSpacing: '-0.02em' },
      h5: { fontWeight: 800, letterSpacing: '-0.02em' },
      h6: { fontWeight: 700, letterSpacing: '-0.015em' },
      subtitle1: { fontWeight: 600, letterSpacing: '-0.01em' },
      subtitle2: { fontWeight: 600, letterSpacing: '-0.01em' },
      body1: { fontSize: 14, letterSpacing: '-0.005em' },
      body2: { fontSize: 13, letterSpacing: '-0.005em' },
      button: {
        textTransform: 'none',
        fontWeight: 650,
        letterSpacing: '-0.01em'
      }
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: 'none',
            fontWeight: 650,
            fontSize: 13,
            boxShadow: 'none',
            padding: '7px 14px',
            transition: 'all 0.15s ease',
            '&:hover': {
              boxShadow: 'none'
            }
          },
          contained: {
            background: isDark
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            color: '#ffffff',
            '&:hover': {
              filter: 'brightness(1.08)'
            }
          },
          outlined: {
            borderColor: isDark ? '#1e293b' : '#e2e8f0',
            '&:hover': {
              borderColor: isDark ? '#334155' : '#cbd5e1',
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
            }
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none'
          },
          rounded: {
            borderRadius: 14
          },
          outlined: {
            borderColor: isDark ? '#1e293b' : '#e2e8f0'
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: 14,
            borderColor: isDark ? '#1e293b' : '#e2e8f0',
            boxShadow: 'none'
          }
        }
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            backgroundImage: 'none',
            border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.25)'
          }
        }
      },
      MuiTextField: {
        defaultProps: {
          size: 'small',
          variant: 'outlined'
        }
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            fontSize: 13.5,
            '& fieldset': {
              borderColor: isDark ? '#1e293b' : '#e2e8f0'
            },
            '&:hover fieldset': {
              borderColor: isDark ? '#334155' : '#cbd5e1'
            },
            '&.Mui-focused fieldset': {
              borderColor: isDark ? '#10b981' : '#059669',
              borderWidth: 1.5
            }
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 650,
            fontSize: 11.5
          },
          outlined: {
            borderColor: isDark ? '#1e293b' : '#e2e8f0'
          }
        }
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#0b1120' : '#f8fafc',
            '& .MuiTableCell-head': {
              fontSize: 11.5,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: isDark ? '#94a3b8' : '#64748b',
              borderBottom: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
              padding: '12px 16px'
            }
          }
        }
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            fontSize: 13,
            borderBottom: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9',
            padding: '12px 16px'
          }
        }
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            borderColor: isDark ? '#1e293b' : '#e2e8f0',
            textTransform: 'none',
            fontSize: 12.5,
            fontWeight: 650
          }
        }
      }
    }
  };

  return createTheme(themeOptions);
}
