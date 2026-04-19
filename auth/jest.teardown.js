export default async function globalTeardown() {
  // Disconnect Redis after all tests complete
  try {
    const { disconnectRedis } = await import('./src/db/redis.js');
    await disconnectRedis();
  } catch (err) {
    // Ignore errors during cleanup
  }
}
