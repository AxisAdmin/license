import { getIronSession } from 'iron-session';
import { sessionOptions } from './session';

export async function requireAuth(req, res) {
  const session = await getIronSession(req, res, sessionOptions);

  // IP 화이트리스트 자동 로그인
  const forwardedFor = req.headers['x-forwarded-for'] || '';
  const remoteIp = forwardedFor.split(',')[0].trim() || req.socket?.remoteAddress || '';
  const whitelistIPs = (process.env.ADMIN_IP_WHITELIST || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (whitelistIPs.includes(remoteIp)) {
    session.isLoggedIn = true;
    session.type = 'auto';
    await session.save();
  }

  return session;
}
