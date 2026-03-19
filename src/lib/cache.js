import redis from '@/config/redis';

const DEFAULT_TTL = 7200; // 2시간 (초)
const KEY_PREFIX = 'spauth:';
const CACHE_TIMEOUT = 2000; // 캐시 작업 타임아웃 (ms)

/**
 * Promise에 타임아웃을 적용하여 Redis 장애 시 무한 대기를 방지
 */
function withTimeout(promise, ms = CACHE_TIMEOUT) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Redis timeout')), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

/**
 * Redis 연결 상태 확인
 */
function isRedisAvailable() {
  return redis.status === 'ready';
}

/**
 * 캐시 조회
 * @param {string} licenseCode
 * @param {string} [variant] - 캐시 키 구분자 (예: 'spauth')
 * @returns {string|null} 캐시된 XML 또는 null
 */
export async function getCache(licenseCode, variant = 'spauth') {
  if (!isRedisAvailable()) return null;
  try {
    return await withTimeout(redis.get(`${KEY_PREFIX}${variant}:${licenseCode}`));
  } catch (err) {
    console.warn(`[Redis] getCache failed (${variant}:${licenseCode}):`, err.message);
    return null;
  }
}

/**
 * 캐시 저장
 * @param {string} licenseCode
 * @param {string} xml - 저장할 XML 문자열
 * @param {string} [variant] - 캐시 키 구분자
 * @param {number} [ttl] - TTL (초)
 */
export async function setCache(licenseCode, xml, variant = 'spauth', ttl = DEFAULT_TTL) {
  if (!isRedisAvailable()) return;
  try {
    await withTimeout(redis.set(`${KEY_PREFIX}${variant}:${licenseCode}`, xml, 'EX', ttl));
  } catch (err) {
    console.warn(`[Redis] setCache failed (${variant}:${licenseCode}):`, err.message);
  }
}

/**
 * 특정 라이선스의 모든 캐시 삭제 (등록/수정/삭제 시 호출)
 * @param {string} licenseCode
 */
export async function delCache(licenseCode) {
  if (!isRedisAvailable()) return;
  try {
    const keys = await withTimeout(redis.keys(`${KEY_PREFIX}*:${licenseCode}`));
    if (keys.length > 0) {
      await withTimeout(redis.del(...keys));
    }
  } catch (err) {
    console.warn(`[Redis] delCache failed (${licenseCode}):`, err.message);
  }
}
