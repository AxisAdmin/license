export const sessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: 'sessAxissoft',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7200, // 2 hours
  },
};
