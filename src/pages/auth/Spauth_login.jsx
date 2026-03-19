import { useState, useRef } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Layout from '@/components/Layout';
import { useAppRouter } from '@/hooks/useAppRouter';

export default function Login({ renderTime, serverAddr, nextVersion }) {
  const { toList } = useAppRouter();
  const passwordRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(false);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordRef.current.value }),
      });
      const data = await res.json();

      if (data.ok) {
        toList();
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('[login] fetch failed:', err.message);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout renderTime={renderTime} serverAddr={serverAddr} nextVersion={nextVersion}>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <Paper elevation={2} sx={{ p: 4, width: 340 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 'bold' }}>
            로그인
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              로그인 정보가 다릅니다.
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <TextField
              inputRef={passwordRef}
              type="password"
              name="password"
              label="비밀번호"
              size="small"
              fullWidth
              autoComplete="current-password"
              sx={{ mb: 2 }}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {loading ? '로그인 중...' : '로그인'}
            </Button>
          </form>
        </Paper>
      </Box>
    </Layout>
  );
}

export async function getServerSideProps({ req, res }) {
  const { requireAuth } = await import('@/config/auth');
  const session = await requireAuth(req, res);

  if (session.isLoggedIn) {
    return { redirect: { destination: '/auth', permanent: false } };
  }

  const startTime = Date.now();
  const renderTime = ((Date.now() - startTime) / 1000).toFixed(4);
  const serverAddr = req.socket?.localAddress || '';
  const nextVersion = require('next/package.json').version;
  return { props: { renderTime, serverAddr, nextVersion } };
}
