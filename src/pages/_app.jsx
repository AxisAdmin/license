import Head from 'next/head';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '@/config/theme';
import favicon from '@/assets/images/favicon.ico';

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Head>
        <link rel="icon" href={favicon.src} />
      </Head>
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
