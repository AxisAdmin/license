import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/config/session';

export default async function handler(req, res) {
  const session = await getIronSession(req, res, sessionOptions);
  session.destroy();
  return res.status(200).json({ ok: true });
}
