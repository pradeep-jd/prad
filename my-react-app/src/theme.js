import { createTheme } from '@mui/material/styles';

export const getTheme = (mode) => {
  return createTheme({
    palette: {
      mode,
      ...(mode === 'light'
        ? {
            primary: {
              main: '#4f46e5',
            },
            secondary: {
              main: '#64748b',
            },
            background: {
              default: '#f3f4f6',
              paper: '#ffffff',
            },
            text: {
              primary: '#1f2937',
              secondary: '#6b7280',
            },
            divider: '#e5e7eb',
          }
        : {
            primary: {
              main: '#6366f1',
            },
            secondary: {
              main: '#94a3b8',
            },
            background: {
              default: '#0f172a',
              paper: '#1e293b',
            },
            text: {
              primary: '#f1f5f9',
              secondary: '#cbd5e1',
            },
            divider: '#334155',
          }),
    },
    typography: {
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
          },
        },
      },
    },
  });
};
