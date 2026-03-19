import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASS || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: 3,
  commandTimeout: 3000,
  enableOfflineQueue: false,
  retryStrategy(times) {
    if (times > 10) return null;
    return Math.min(times * 500, 5000);
  },
  reconnectOnError(err) {
    const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
    return targetErrors.some((e) => err.message.includes(e));
  },
});

redis.on('error', (err) => {
  const code = err.code || 'UNKNOWN';
  const msg = err.message || err.toString();
  const addr = `${redis.options.host}:${redis.options.port}`;
  console.error(`[Redis] error: ${code} | ${msg} | target: ${addr}`);
});

redis.on('reconnecting', (delay) => {
  console.warn(`[Redis] reconnecting in ${delay}ms... (status: ${redis.status})`);
});

redis.on('close', () => {
  console.warn('[Redis] connection closed');
});

redis.on('end', () => {
  console.error('[Redis] connection ended — all retry attempts exhausted');
});

export default redis;
