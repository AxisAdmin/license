// 라이선스 DB 쿼리 함수 모음 (데이터 레이어)

import pool from '@/config/db';

const ALLOWED_SEARCH_IDS = ['license_code', 'service_name', 'company_name', 'service_domain', 'comment'];
const PER_PAGE = 20;

/**
 * 라이선스 목록 조회 (페이지네이션 + 검색)
 */
export async function getLicenseList({ page = 0, searchid = 'license_code', searchtxt = '' } = {}) {
  const offset = parseInt(page) || 0;
  const safeSearchId = ALLOWED_SEARCH_IDS.includes(searchid) ? searchid : 'license_code';

  let countQuery = 'SELECT COUNT(*) as total FROM spauth';
  let listQuery = 'SELECT license_code, company_name, service_name, enable, regdate, updated_date FROM spauth';
  const params = [];

  if (searchtxt) {
    countQuery += ` WHERE ${safeSearchId} LIKE ?`;
    listQuery += ` WHERE ${safeSearchId} LIKE ?`;
    params.push(`%${searchtxt}%`);
  }

  listQuery += ' ORDER BY regdate DESC LIMIT ? OFFSET ?';

  const [countRows] = await pool.execute(countQuery, params);
  const totalRows = countRows[0].total;
  const [dataRows] = await pool.execute(listQuery, [...params, PER_PAGE, offset]);

  return {
    data: JSON.parse(JSON.stringify(dataRows)),
    totalRows,
  };
}

/**
 * 라이선스 단건 조회
 */
export async function getLicenseDetail(licenseCode) {
  const [rows] = await pool.execute('SELECT * FROM spauth WHERE license_code = ?', [licenseCode]);
  return rows[0] ? JSON.parse(JSON.stringify(rows[0])) : null;
}

/**
 * 라이선스 등록 (INSERT) 또는 수정 (UPDATE)
 * @param {'insert'|'update'} mode
 * @param {string} licenseCode
 * @param {object} setData  - 저장할 필드 객체
 */
export async function saveLicense(mode, licenseCode, setData) {
  if (mode === 'insert') {
    setData.license_code = licenseCode;
    const cols = Object.keys(setData).join(', ');
    const placeholders = Object.keys(setData).map(() => '?').join(', ');
    await pool.execute(
      `INSERT INTO spauth (${cols}) VALUES (${placeholders})`,
      Object.values(setData)
    );
  } else {
    const setClauses = Object.keys(setData).map((k) => `${k} = ?`).join(', ');
    await pool.execute(
      `UPDATE spauth SET ${setClauses} WHERE license_code = ?`,
      [...Object.values(setData), licenseCode]
    );
  }
}

/**
 * 라이선스 삭제
 */
export async function deleteLicense(licenseCode) {
  await pool.execute('DELETE FROM spauth WHERE license_code = ?', [licenseCode]);
}
