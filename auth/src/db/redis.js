import Redis from "ioredis"

const isTestMode = process.env.NODE_ENV === 'test';

// Lazy initialization - NO side effects on import
let redisClient = null;
let redisConnectPromise = null;

// Initialize Redis only when actually needed
function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  // Prevent multiple concurrent initialization attempts
  if (redisConnectPromise) {
    return redisConnectPromise;
  }

  redisConnectPromise = initializeRedis();
  return redisConnectPromise;
}

async function initializeRedis() {
  if (redisClient) return redisClient;

  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      // Fail fast in test mode - no retries, no background attempts
      retryStrategy: isTestMode ? () => null : (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: isTestMode ? 0 : null,
      enableReadyCheck: !isTestMode,
      enableOfflineQueue: !isTestMode,
      lazyConnect: isTestMode,
      // Connection timeout
      connectTimeout: 5000,
    });

    // Only log in production
    if (!isTestMode) {
      redisClient.on('connect', () => {
        console.log('✓ Connected to Redis');
      });

      redisClient.on('error', (err) => {
        console.error('✗ Redis error:', err.message);
      });
    } else {
      // In test mode, silently ignore all events
      redisClient.on('error', () => {});
      redisClient.on('connect', () => {});
    }

    // Test mode: don't actually connect
    if (!isTestMode) {
      await redisClient.ping();
    }

    return redisClient;
  } catch (err) {
    if (!isTestMode) {
      console.error('✗ Redis initialization failed:', err.message);
    }
    // Return a no-op client that doesn't throw
    return createNoOpRedisClient();
  }
}

// No-op client for when Redis is unavailable
function createNoOpRedisClient() {
  return {
    set: async () => ({ ok: true }),
    get: async () => null,
    del: async () => 0,
    quit: async () => 'OK',
    disconnect: async () => 'OK',
  };
}

// Graceful shutdown
async function disconnectRedis() {
  if (redisClient && typeof redisClient.quit === 'function') {
    try {
      await redisClient.quit();
      redisClient = null;
      redisConnectPromise = null;
    } catch (err) {
      // Ignore cleanup errors
    }
  }
}

export { getRedisClient, disconnectRedis };
export default { getRedisClient, disconnectRedis };