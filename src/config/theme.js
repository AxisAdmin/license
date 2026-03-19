import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#ff4400' },
    secondary: { main: '#bdbdbd' },
  },
  typography: {
    fontSize: 13,
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', minWidth: 64 },
        sizeSmall: { padding: '3px 10px' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: '#f5f5f5',
          fontWeight: 'bold',
          fontSize: 13,
        },
        body: { fontSize: 13 },
      },
    },
  },
});

export default theme;
