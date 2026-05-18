// 라이센스 인증 API - license/spauth.php 대응
// GET /api/spauth?license_code=XXXX-XXXX-XXXX-XXXX-XXXX
// Returns: XML (전체 필드, Geo-IP 타임존 지원)

import path from 'path';
import pool from '@/config/db_pg';
import { getCache, setCache } from '@/lib/cache';
import { writeLog } from '@/lib/logger';

const GEO_LICENSE_CODES = [
  '780FE6EC-BA01-4D38-A27F-A02111D02D8E',
  'F89E4F66-D6DB-48BA-A5AE-08191910ED8C',
  '7F939736-A851-48FA-B77B-26B24CBA2327',
  '6B310E7B-A764-4579-B4DA-79CFE28FF7CC',
];

function isValidIP(ip) {
  // IPv4
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return true;
  // IPv6 (축약형 포함)
  if (/^[0-9a-fA-F:]+$/.test(ip) && ip.includes(':')) return true;
  return false;
}

function getClientIP(req) {
  const client = req.headers['http_client_ip'];
  const forward = req.headers['x-forwarded-for'];
  const remote = req.socket?.remoteAddress || '';

  if (client && isValidIP(client)) return client;
  if (forward) {
    const first = forward.split(',')[0].trim();
    if (isValidIP(first)) return first;
  }
  return remote.replace(/^::ffff:/, '');
}

async function getGeoTimezone(ip) {
  try {
    const res = await fetch(`http://www.geoplugin.net/json.gp?ip=${ip}`);
    const data = await res.json();
    return data.geoplugin_timezone || null;
  } catch {
    return null;
  }
}

function getServerTime(timezone) {
  try {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
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
  } catch {
    return getServerTime('Asia/Seoul');
  }
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

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'max-age=7200, must-revalidate');

  let error = null;
  let message = '';

  const licenseCode =
    req.query.license_code ||
    (req.body && req.body.license_code) ||
    null;

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
  const clientIP = getClientIP(req);

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
  const cached = await getCache(licenseCode, 'spauth');
  if (cached) {
    console.info(`[spauth] cache HIT | ${licenseCode}`);
    return res.status(200).send(cached);
  }
  console.info(`[spauth] cache MISS | ${licenseCode} → DB 조회`);

  // 2. DB 조회
  try {
    const result = await pool.query(
      "SELECT * FROM spauth WHERE license_code = $1 AND enable = 'Y'",
      [licenseCode]
    );
    console.info(`[spauth] DB result | ${licenseCode} | rows: ${result.rowCount}`);
    const row = result.rows[0];

    if (row) {
      // 특정 라이센스코드는 Geo-IP 타임존, 그 외는 Asia/Seoul
      let timezone = 'Asia/Seoul';
      if (GEO_LICENSE_CODES.includes(licenseCode)) {
        const ip = getClientIP(req);
        const geoTz = await getGeoTimezone(ip);
        if (geoTz) timezone = geoTz;
      }

      const cdnBase = (process.env.CDN_BASE_URL || 'http://axissoft1.cdn3.cafe24.com/web/images/').replace(/\/$/, '');
      const iconUrl = 'http://' + (cdnBase.replace(/^https?:\/\//, '') + '/' + (row.service_icon || '')).replace(/\/+/g, '/');
      const imageUrl = 'http://' + (cdnBase.replace(/^https?:\/\//, '') + '/' + (row.launcher_image || '')).replace(/\/+/g, '/');
      const serverTime = getServerTime(timezone);

      let xmlBody = '';
      xmlBody += `<updated_date><![CDATA[${row.updated_date || ''}]]></updated_date>\n`;
      xmlBody += `<company_name><![CDATA[${row.company_name || ''}]]></company_name>\n`;
      xmlBody += `<service_name><![CDATA[${row.service_name || ''}]]></service_name>\n`;
      xmlBody += `<service_domain><![CDATA[${row.service_domain || ''}]]></service_domain>\n`;
      xmlBody += `<service_icon><![CDATA[${iconUrl}]]></service_icon>\n`;
      xmlBody += `<launcher_image><![CDATA[${imageUrl}]]></launcher_image>\n`;
      xmlBody += `<app_event><![CDATA[${row.app_event || ''}]]></app_event>\n`;
      xmlBody += `<scms_url><![CDATA[${row.scms_url || ''}]]></scms_url>\n`;
      xmlBody += `<scms_v2_apikey><![CDATA[${row.scms_v2_apikey || ''}]]></scms_v2_apikey>\n`;
      xmlBody += `<mp3_enable><![CDATA[${row.mp3_enable || ''}]]></mp3_enable>\n`;
      xmlBody += `<enable><![CDATA[${row.enable || ''}]]></enable>\n`;
      xmlBody += `<ptype><![CDATA[${row.ptype || ''}]]></ptype>\n`;
      xmlBody += `<server_time><![CDATA[${serverTime}]]></server_time>\n`;
      xmlBody += `<spkid><![CDATA[${row.spkid || ''}]]></spkid>\n`;
      xmlBody += `<spkid_v2><![CDATA[${row.spkid_v2 || ''}]]></spkid_v2>\n`;
      xmlBody += `<pc_download_yn><![CDATA[${row.pc_download_yn || ''}]]></pc_download_yn>\n`;
      xmlBody += `<pc_config_url><![CDATA[${row.pc_config_url || ''}]]></pc_config_url>\n`;
      xmlBody += `<pc_history_url><![CDATA[${row.pc_history_url || ''}]]></pc_history_url>\n`;
      xmlBody += `<pc_only_online><![CDATA[${row.pc_only_online || ''}]]></pc_only_online>\n`;
      xmlBody += `<pc_watermark_yn><![CDATA[${row.pc_watermark_yn || ''}]]></pc_watermark_yn>\n`;
      xmlBody += `<pc_watermark_interval><![CDATA[${row.pc_watermark_interval || ''}]]></pc_watermark_interval>\n`;
      xmlBody += `<pc_watermark_duration><![CDATA[${row.pc_watermark_duration || ''}]]></pc_watermark_duration>\n`;
      xmlBody += `<color><![CDATA[${row.pc_site_color || ''}]]></color>\n`;
      xmlBody += `<event_required><![CDATA[${row.event_required || ''}]]></event_required>\n`;

      // 3. XML 생성 후 Redis에 캐시 저장
      const xml = buildXml(0, 'success', xmlBody);
      await setCache(licenseCode, xml, 'spauth');

      return res.status(200).send(xml);
    } else {
      error = 1;
      message = 'no data.';
    }
  } catch (err) {
    error = 1;
    message = 'db error.';
    console.error(`[spauth] DB query failed | license: ${licenseCode} | error: ${err.message}`);
  }

  writeLog(LOG_DIR, [
    { value: licenseCode || '' },
    { key: 'ip', value: clientIP },
    { key: 'error', value: String(error) },
    { key: 'message', value: message },
  ]);
  res.status(200).send(buildXml(1, message, ''));
}
