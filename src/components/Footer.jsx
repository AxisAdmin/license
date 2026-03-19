import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function Footer({ renderTime, serverAddr, nextVersion }) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <Box
      component="footer"
      sx={{ mt: 4, py: 2, borderTop: '1px solid #e0e0e0', textAlign: 'center' }}
    >
      <Typography variant="caption" color="text.secondary">
        Copyright Axissoft. All rights reserved.
        {isDev && renderTime != null && (
          <>
            <br />
            Page rendered in <strong>{renderTime}</strong> seconds. Next.js{' '}
            <strong>{nextVersion || ''}</strong> [ {serverAddr || ''} ]
          </>
        )}
      </Typography>
    </Box>
  );
}
