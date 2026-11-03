import { createTheme, type ThemeOptions } from '@mui/material/styles';
import type {} from '@mui/x-date-pickers/themeAugmentation';

export function getFinoraTheme(mode: 'light' | 'dark') {
  const isDark = mode === 'dark';

  const themeOptions: ThemeOptions = {
    palette: {
      mode,
      primary: {
        main: isDark ? '#27866A' : '#20705B',
        light: isDark ? '#349E7F' : '#27866A',
        dark: '#123D35',
        contrastText: '#ffffff'
      },
      secondary: {
        main: isDark ? '#A4B2A8' : '#68756F',
        light: isDark ? '#EDF4EF' : '#A4AEA8',
        dark: isDark ? '#6C7D72' : '#34413D',
        contrastText: '#ffffff'
      },
      success: {
        main: '#15966B',
        light: '#22c55e',
        contrastText: '#ffffff'
      },
      error: {
        main: '#D65B58',
        contrastText: '#ffffff'
      },
      warning: {
        main: '#D99A36',
        contrastText: '#ffffff'
      },
      info: {
        main: '#4E7BC5',
        contrastText: '#ffffff'
      },
      background: {
        default: isDark ? '#0A110E' : '#EDF2EF',
        paper: isDark ? '#16231D' : '#FFFFFF'
      },
      text: {
        primary: isDark ? '#EEF5F0' : '#17211F',
        secondary: isDark ? '#A3B5AB' : '#68756F'
      },
      divider: isDark ? '#24352C' : '#D0DDD5'
    },
    shape: {
      borderRadius: 8
    },
    typography: {
      fontFamily: [
        'Be Vietnam Pro',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        'sans-serif'
      ].join(','),
      h1: { fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.25 },
      h2: { fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.28 },
      h3: { fontWeight: 650, letterSpacing: '-0.02em', lineHeight: 1.3 },
      h4: { fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.32 },
      h5: { fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.35 },
      h6: { fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.35 },
      subtitle1: { fontWeight: 500, letterSpacing: '-0.005em' },
      subtitle2: { fontWeight: 500, letterSpacing: '-0.005em' },
      body1: { fontSize: 14, fontWeight: 400, lineHeight: 1.5 },
      body2: { fontSize: 13, fontWeight: 400, lineHeight: 1.48 },
      button: {
        textTransform: 'none',
        fontWeight: 500,
        letterSpacing: '-0.005em'
      }
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: 'none',
            fontWeight: 500,
            fontSize: 13,
            boxShadow: 'none',
            padding: '7px 15px',
            transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
            '&:hover': {
              boxShadow: 'none'
            }
          },
          contained: {
            backgroundColor: isDark ? '#27866A' : '#20705B',
            color: '#ffffff',
            '&:hover': {
              backgroundColor: isDark ? '#20705B' : '#185548'
            }
          },
          outlined: {
            borderColor: isDark ? '#2D3A32' : '#DCE3DE',
            color: isDark ? '#EDF4EF' : '#17211F',
            '&:hover': {
              borderColor: isDark ? '#3F5146' : '#BDC7C1',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'
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
            borderRadius: 12
          },
          outlined: {
            borderColor: isDark ? '#24352C' : '#D0DDD5'
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: isDark ? '#16231D' : '#FFFFFF',
            borderRadius: 12,
            borderColor: isDark ? '#24352C' : '#D0DDD5',
            boxShadow: isDark ? '0 1px 3px rgba(0, 0, 0, 0.25)' : '0 1px 3px rgba(18, 61, 53, 0.04)'
          }
        }
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            backgroundImage: 'none',
            backgroundColor: isDark ? '#16231D' : '#FFFFFF',
            border: isDark ? '1px solid #24352C' : '1px solid #D0DDD5',
            boxShadow: isDark ? '0 20px 48px rgba(0, 0, 0, 0.5)' : '0 20px 48px rgba(23, 33, 31, 0.08)'
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
            backgroundColor: isDark ? '#16231D' : '#FFFFFF',
            fontSize: 13.5,
            '& fieldset': {
              borderColor: isDark ? '#24352C' : '#D0DDD5'
            },
            '&:hover fieldset': {
              borderColor: isDark ? '#3A5244' : '#A8BCB0'
            },
            '&.Mui-focused fieldset': {
              borderColor: isDark ? '#27866A' : '#20705B',
              borderWidth: 1.5
            }
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 500,
            fontSize: 11.5
          },
          outlined: {
            borderColor: isDark ? '#24352C' : '#D0DDD5'
          }
        }
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            color: isDark ? '#EEF5F0' : '#17211F',
            fontWeight: 800
          }
        }
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            color: isDark ? '#EEF5F0' : '#17211F'
          }
        }
      },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#16231D' : '#FFFFFF',
            borderTop: isDark ? '1px solid #24352C' : '1px solid #D0DDD5'
          }
        }
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#16231D' : '#FFFFFF',
            color: isDark ? '#EEF5F0' : '#17211F',
            borderRadius: 12,
            border: isDark ? '1px solid #24352C' : '1px solid #D0DDD5',
            boxShadow: isDark ? '0 12px 32px rgba(0,0,0,0.45)' : '0 12px 32px rgba(23,33,31,0.08)'
          }
        }
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            color: isDark ? '#EEF5F0' : '#17211F',
            fontSize: 13,
            '&:hover': {
              backgroundColor: isDark ? '#1E2E26' : '#F6F9F7'
            },
            '&.Mui-selected': {
              backgroundColor: isDark ? '#26382F' : '#E3EBE6',
              '&:hover': {
                backgroundColor: isDark ? '#2D4438' : '#D0DDD5'
              }
            }
          }
        }
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#16231D' : '#FFFFFF',
            color: isDark ? '#EEF5F0' : '#17211F',
            borderRadius: 12,
            border: isDark ? '1px solid #24352C' : '1px solid #D0DDD5',
            boxShadow: isDark ? '0 12px 32px rgba(0,0,0,0.45)' : '0 12px 32px rgba(23,33,31,0.08)'
          }
        }
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#16231D' : '#FFFFFF',
            color: isDark ? '#EEF5F0' : '#17211F',
            borderLeft: isDark ? '1px solid #24352C' : '1px solid #D0DDD5'
          }
        }
      },
      MuiSelect: {
        styleOverrides: {
          icon: {
            color: isDark ? '#A3B5AB' : '#68756F'
          }
        }
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: isDark ? '#A3B5AB' : '#68756F',
            '&.Mui-focused': {
              color: isDark ? '#27866A' : '#20705B'
            }
          }
        }
      },
      MuiDateCalendar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#16231D' : '#FFFFFF',
            color: isDark ? '#EEF5F0' : '#17211F'
          }
        }
      },
      MuiPickersCalendarHeader: {
        styleOverrides: {
          label: {
            color: isDark ? '#EEF5F0' : '#17211F',
            fontWeight: 700
          },
          switchViewIcon: {
            color: isDark ? '#A3B5AB' : '#68756F'
          }
        }
      },
      MuiDayCalendar: {
        styleOverrides: {
          weekDayLabel: {
            color: isDark ? '#72857A' : '#7A8981',
            fontWeight: 600
          }
        }
      },
      MuiPickerDay: {
        styleOverrides: {
          root: {
            color: isDark ? '#EEF5F0' : '#17211F',
            '&:hover': {
              backgroundColor: isDark ? '#1E2E26' : '#F6F9F7'
            },
            '&.Mui-selected': {
              backgroundColor: isDark ? '#27866A' : '#20705B',
              color: '#ffffff',
              '&:hover': {
                backgroundColor: isDark ? '#20705B' : '#185548'
              }
            }
          }
        }
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#131D18' : '#F8FAF8',
            '& .MuiTableCell-head': {
              color: isDark ? '#A4B2A8' : '#68756F',
              fontWeight: 600,
              fontSize: 11.5,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              borderBottom: isDark ? '1px solid #24352C' : '1px solid #D0DDD5',
              padding: '10px 16px'
            }
          }
        }
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: isDark ? '#24352C' : '#D0DDD5',
            padding: '12px 16px',
            fontSize: 13,
            color: isDark ? '#EEF5F0' : '#17211F'
          }
        }
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 40
          },
          indicator: {
            backgroundColor: isDark ? '#27866A' : '#20705B',
            height: 2.5,
            borderRadius: '2px 2px 0 0'
          }
        }
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 40,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 500,
            textTransform: 'none',
            color: isDark ? '#A4B2A8' : '#68756F',
            '&.Mui-selected': {
              color: isDark ? '#EDF4EF' : '#20705B',
              fontWeight: 600
            }
          }
        }
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: isDark ? '#202C25' : '#17211F',
            color: isDark ? '#EDF4EF' : '#FFFFFF',
            fontSize: 11.5,
            fontWeight: 500,
            borderRadius: 6,
            padding: '6px 10px'
          }
        }
      }
    }
  };

  return createTheme(themeOptions);
}
