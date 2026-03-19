import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/config/session';
import { parseForm, getField, readJsonBody } from '@/utils/form';
import { saveLicenseInfo, deleteLicenseInfo } from '@/services/licenseService';

export const config = { api: { bodyParser: false } };

/** 라이선스 등록/수정 */
async function handleSave(req, res) {
  const { fields, files } = await parseForm(req);
  const f = (key) => getField(fields, key);

  const mode        = f('mode');
  const licenseCode = f('license_code');

  // 폼 데이터 객체 생성
  const formFields = {};
  for (const key of Object.keys(fields)) {
    formFields[key] = f(key);
  }

  try {
    const result = await saveLicenseInfo(mode, licenseCode, formFields, files);
    return res.status(200).json({
      ...result,
      curpage:   f('curpage')   || '0',
      searchid:  f('searchid')  || '',
      searchtxt: f('searchtxt') || '',
    });
  } catch (err) {
    return res.status(200).json({ ok: false, message: err.message });
  }
}

/** 라이선스 삭제 */
async function handleDelete(req, res) {
  const body = await readJsonBody(req);
  if (body.action !== 'delete' || !body.license_code) {
    return res.status(400).json({ ok: false });
  }

  const result = await deleteLicenseInfo(body.license_code);
  return res.status(200).json(result);
}

export default async function handler(req, res) {
  // 인증 확인
  const session = await getIronSession(req, res, sessionOptions);
  if (!session.isLoggedIn) {
    return res.status(401).json({ ok: false, message: '로그인이 필요합니다.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false });
  }

  const contentType = req.headers['content-type'] || '';

  if (contentType.includes('multipart/form-data')) {
    return handleSave(req, res);
  }

  if (contentType.includes('application/json')) {
    return handleDelete(req, res);
  }

  return res.status(400).json({ ok: false });
}
