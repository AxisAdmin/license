import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/config/session';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getIronSession(req, res, sessionOptions);
  const password = req.body?.password || '';
  const hash = crypto.createHash('sha256').update(password).digest('hex');

  if (hash === process.env.ADMIN_PASSWORD_HASH) {
    session.isLoggedIn = true;
    session.type = 'manual';
    await session.save();
    return res.status(200).json({ ok: true });
  }

  return res.status(200).json({ ok: false });
}
