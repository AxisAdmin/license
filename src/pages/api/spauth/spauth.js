// 라이센스 호출 url (ios, android 에서 사용) - license/spauth/spauth.php 대응
// GET /api/spauth/spauth?license_code=XXXX-XXXX-XXXX-XXXX-XXXX
// Returns: XML (기본 필드, 타임존 Asia/Seoul 고정)

import path from 'path';
import pool from '@/config/db_pg';
import { getCache, setCache } from '@/lib/cache';
import { writeLog } from '@/lib/logger';
import { getLicenseCode } from '@/lib/parseLicenseCode';

function getServerTime() {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const p = {};
  parts.forEach(({ type, value }) => { p[type] = value; });
  const hour = p.hour === '24' ? '00' : p.hour;
  return `${p.year}${p.month}${p.day}${hour}${p.minute}${p.second}`;
}

function buildXml(error, message, xmlBody) {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<response>\n` +
    `<error>${error}</error>\n` +
    `<message>${message}</message>\n` +
    xmlBody +
    `</response>\n`
  );
}

// Next.js 기본 bodyParser 비활성화, multipart/form-data 포함 모든 Content-Type을 parseLicenseCode에서 직접 처리
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'max-age=7200, must-revalidate');

  let error = null;
  let message = '';

  const licenseCode = await getLicenseCode(req);
  console.info(`[spauth/spauth] method=${req.method} | content-type=${req.headers['content-type'] || ''} | license=${licenseCode}`);

  // 라이센스코드 검증
  if (licenseCode) {
    if (/[^A-Z0-9\-]/.test(licenseCode)) {
      error = 1;
      message += 'wrong license_code.';
    }
    if (licenseCode.length !== 36) {
      error = 1;
      message += 'wrong license_code length.';
    }
  } else {
    error = 1;
    message += 'no parameter.';
  }

  const LOG_DIR = path.join(process.cwd(), 'src', 'pages', 'api', 'spauth', 'log');
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress?.replace(/^::ffff:/, '') || '';

  // 검증 실패 시 즉시 반환
  if (error) {
    writeLog(LOG_DIR, [
      { value: licenseCode || '' },
      { key: 'ip', value: clientIP },
      { key: 'error', value: String(error) },
      { key: 'message', value: message },
    ]);
    return res.status(200).send(buildXml(1, message, ''));
  }

  // 1. Redis 캐시 조회
  const cached = await getCache(licenseCode, 'spauth_2');
  if (cached) {
    console.info(`[spauth/spauth] cache HIT | ${licenseCode}`);
    return res.status(200).send(cached);
  }
  console.info(`[spauth/spauth] cache MISS | ${licenseCode} → DB 조회`);

  // 2. DB 조회
  try {
    const result = await pool.query(
      "SELECT * FROM spauth WHERE license_code = $1 AND enable = 'Y'",
      [licenseCode]
    );
    console.info(`[spauth/spauth] DB result | ${licenseCode} | rows: ${result.rowCount}`);
    const row = result.rows[0];

    if (row) {
      const cdnBase = (process.env.SPAUTH_CDN_BASE_URL || 'http://license.starplayer.net/license/files/').replace(/\/$/, '');
      const iconUrl = 'http://' + (cdnBase.replace(/^https?:\/\//, '') + '/' + (row.service_icon || '')).replace(/\/+/g, '/');
      const imageUrl = 'http://' + (cdnBase.replace(/^https?:\/\//, '') + '/' + (row.launcher_image || '')).replace(/\/+/g, '/');
      const serverTime = getServerTime();

      let xmlBody = '';
      xmlBody += `<updated_date><![CDATA[${row.updated_date || ''}]]></updated_date>\n`;
      xmlBody += `<company_name><![CDATA[${row.company_name || ''}]]></company_name>\n`;
      xmlBody += `<service_name><![CDATA[${row.service_name || ''}]]></service_name>\n`;
      xmlBody += `<service_domain><![CDATA[${row.service_domain || ''}]]></service_domain>\n`;
      xmlBody += `<service_icon><![CDATA[${iconUrl}]]></service_icon>\n`;
      xmlBody += `<launcher_image><![CDATA[${imageUrl}]]></launcher_image>\n`;
      xmlBody += `<app_event><![CDATA[${row.app_event || ''}]]></app_event>\n`;
      xmlBody += `<scms_url><![CDATA[${row.scms_url || ''}]]></scms_url>\n`;
      xmlBody += `<mp3_enable><![CDATA[${row.mp3_enable || ''}]]></mp3_enable>\n`;
      xmlBody += `<enable><![CDATA[${row.enable || ''}]]></enable>\n`;
      xmlBody += `<ptype><![CDATA[${row.ptype || ''}]]></ptype>\n`;
      xmlBody += `<server_time><![CDATA[${serverTime}]]></server_time>\n`;

      // 3. XML 생성 후 Redis에 캐시 저장
      const xml = buildXml(0, 'success', xmlBody);
      await setCache(licenseCode, xml, 'spauth_2');

      return res.status(200).send(xml);
    } else {
      error = 1;
      message = 'no data.';
    }
  } catch (err) {
    error = 1;
    message = 'db error.';
    console.error(`[spauth/spauth] DB query failed | license: ${licenseCode} | error: ${err.message}`);
  }

  writeLog(LOG_DIR, [
    { value: licenseCode || '' },
    { key: 'ip', value: clientIP },
    { key: 'error', value: String(error) },
    { key: 'message', value: message },
  ]);
  res.status(200).send(buildXml(1, message, ''));
}
