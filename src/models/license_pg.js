// 라이선스 DB 쿼리 함수 모음 (PostgreSQL용 데이터 레이어)

import pool from '@/config/db_pg';

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
  let paramIndex = 1;

  if (searchtxt) {
    countQuery += ` WHERE ${safeSearchId} LIKE $${paramIndex}`;
    listQuery += ` WHERE ${safeSearchId} LIKE $${paramIndex}`;
    params.push(`%${searchtxt}%`);
    paramIndex++;
  }

  listQuery += ` ORDER BY regdate DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

  const countResult = await pool.query(countQuery, params);
  const totalRows = parseInt(countResult.rows[0].total);
  const dataResult = await pool.query(listQuery, [...params, PER_PAGE, offset]);

  return {
    data: JSON.parse(JSON.stringify(dataResult.rows)),
    totalRows,
  };
}

/**
 * 라이선스 단건 조회
 */
export async function getLicenseDetail(licenseCode) {
  const result = await pool.query('SELECT * FROM spauth WHERE license_code = $1', [licenseCode]);
  return result.rows[0] ? JSON.parse(JSON.stringify(result.rows[0])) : null;
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
    const keys = Object.keys(setData);
    const cols = keys.join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    await pool.query(
      `INSERT INTO spauth (${cols}) VALUES (${placeholders})`,
      Object.values(setData)
    );
  } else {
    const keys = Object.keys(setData);
    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    await pool.query(
      `UPDATE spauth SET ${setClauses} WHERE license_code = $${keys.length + 1}`,
      [...Object.values(setData), licenseCode]
    );
  }
}

/**
 * 라이선스 삭제
 */
export async function deleteLicense(licenseCode) {
  await pool.query('DELETE FROM spauth WHERE license_code = $1', [licenseCode]);
}
