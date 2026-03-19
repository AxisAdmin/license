import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function Layout({ children, showLogout, renderTime, serverAddr, nextVersion }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#fafafa' }}>
      <Header showLogout={showLogout} />
      <Container maxWidth="lg" sx={{ mt: 3, mb: 2, flex: 1 }}>
        {children}
      </Container>
      <Footer renderTime={renderTime} serverAddr={serverAddr} nextVersion={nextVersion} />
    </Box>
  );
}
