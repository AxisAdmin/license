import NextLink from 'next/link';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useAppRouter } from '@/hooks/useAppRouter';

export default function Header({ showLogout }) {
  const { logout } = useAppRouter();

  return (
    <AppBar position="static" color="default" elevation={1} sx={{ backgroundColor: '#fff' }}>
      <Container maxWidth="lg" disableGutters>
        <Toolbar variant="dense" sx={{ minHeight: 52, px: 3 }}>
          <Box sx={{ flexGrow: 1 }}>
            <NextLink href="/auth" passHref legacyBehavior>
              <a style={{ display: 'inline-block' }}>
                <img src="/images/logo.jpg" alt="logo" style={{ height: 46, verticalAlign: 'middle', marginBottom: 2 }} />
              </a>
            </NextLink>
          </Box>
          {showLogout && (
            <Button
              size="small"
              variant="outlined"
              onClick={logout}
              sx={{ color: '#555', borderColor: '#ccc' }}
            >
              로그아웃
            </Button>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}
