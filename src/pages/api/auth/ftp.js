import { Client } from 'basic-ftp';
import { getField } from '@/utils/form';
import path from 'path';

// ── FTP 연결 ──────────────────────────────────────────────────────
async function getFtpClient() {
  const client = new Client();
  await client.access({
    host:     process.env.FTP_SERVER,
    port:     parseInt(process.env.FTP_PORT || '21'),
    user:     process.env.FTP_USER,
    password: process.env.FTP_PASS,
    secure:   false,
  });
  return client;
}

// ── FTP 업로드 ────────────────────────────────────────────────────
export async function ftpUpload(localPath, fileKey, ext) {
  const client = await getFtpClient();
  try {
    const ftpPath = process.env.FTP_PATH || 'web/images';
    const list = await client.list(ftpPath);
    const existingNames = list.map((f) => f.name);

    let finalName = `${fileKey}200${ext}`;
    for (let i = 200; i < 999999; i++) {
      const candidate = `${fileKey}${i}${ext}`;
      if (!existingNames.includes(candidate)) {
        finalName = candidate;
        break;
      }
    }

    try {
      await client.uploadFrom(localPath, `${ftpPath}/${finalName}`);
    } catch {
      // 동시 업로드 충돌 시 타임스탬프+랜덤 접미사로 재시도
      const suffix = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      finalName = `${fileKey}_${suffix}${ext}`;
      await client.uploadFrom(localPath, `${ftpPath}/${finalName}`);
    }
    return finalName;
  } finally {
    client.close();
  }
}

// ── FTP 삭제 ──────────────────────────────────────────────────────
export async function ftpDelete(fileName) {
  if (!fileName) return;
  const client = await getFtpClient();
  try {
    const ftpPath = process.env.FTP_PATH || 'web/images';
    await client.remove(`${ftpPath}/${fileName}`);
  } catch {
    // 삭제 실패 무시
  } finally {
    client.close();
  }
}

// ── 파일 업로드 일괄 처리 ─────────────────────────────────────────
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif'];

/**
 * 파일 업로드 일괄 처리
 * @param {object}   fields          - 폼 필드 데이터
 * @param {object}   files           - 업로드된 파일 객체 (formidable이 파싱한 files)
 * @param {object}   [options]
 * @param {string[]} [options.allowedExtensions] - 허용 확장자 (기본: jpg, jpeg, png, gif)
 * @param {string}   [options.oldFieldPrefix]    - 기존 파일명 필드 접두어 (기본: 'old_')
 */
export async function processUploads(fields, files, options = {}) {
  const {
    allowedExtensions = ALLOWED_EXTENSIONS,
    oldFieldPrefix = 'old_',
  } = options;
  const uploadData = {};

  for (const key of Object.keys(files)) {
    const file = files[key];
    if (file) {
      const fileObj = Array.isArray(file) ? file[0] : file;
      if (fileObj && fileObj.size > 0) {
        const ext = path.extname(fileObj.originalFilename || '').toLowerCase();
        if (!allowedExtensions.includes(ext)) {
          throw new Error(`${key}: 허용되지 않는 파일 형식입니다. (${allowedExtensions.map(e => e.replace('.', '')).join(', ')}만 가능)`);
        }
        uploadData[key] = await ftpUpload(fileObj.filepath, key, ext);

        const oldName = getField(fields, `${oldFieldPrefix}${key}`);
        if (oldName) await ftpDelete(oldName);
      }
    }
  }

  return uploadData;
}

// ── API 핸들러: 파일 다운로드 ─────────────────────────────────────
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/config/session';

export default async function handler(req, res) {
  const session = await getIronSession(req, res, sessionOptions);
  if (!session.isLoggedIn) return res.redirect(302, '/auth/Spauth_login');

  const { file } = req.query;
  if (!file) return res.status(400).send('No file specified');

  const filename = file.split('/').pop().replace(/[^a-zA-Z0-9._\-]/g, '');
  if (!filename) return res.status(400).send('Invalid file name');
  const cdnBase = (process.env.CDN_BASE_URL || 'http://axissoft1.cdn3.cafe24.com/web/images/').replace(/\/$/, '');
  const fileUrl = `${cdnBase}/${filename}`;

  try {
    const { Readable } = await import('stream');
    const response = await fetch(fileUrl);
    if (!response.ok) return res.status(404).send('해당 파일이 없습니다.');

    const contentLength = response.headers.get('content-length');
    res.setHeader('Content-Type', 'file/unknown');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Content-Transfer-Encoding', 'binary');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // 스트리밍 방식으로 전송 (메모리에 전체 로드하지 않음)
    const nodeStream = Readable.fromWeb(response.body);
    nodeStream.pipe(res);
  } catch {
    return res.status(404).send('해당 파일이 없습니다.');
  }
}
