const Redis = require('ioredis');

// Configuração Redis
const redis = new Redis(process.env.REDIS_URL || 'redis://:@412Trocar@redis:6379', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

// Eventos
redis.on('connect', () => {
  console.log('✅ Redis conectando...');
});

redis.on('ready', () => {
  console.log('✅ Redis conectado e pronto');
});

redis.on('error', (err) => {
  console.error('❌ Redis erro:', err.message);
});

redis.on('close', () => {
  console.log('⚠️  Redis conexão fechada');
});

redis.on('reconnecting', () => {
  console.log('🔄 Redis reconectando...');
});

// Helper functions para cache
const cache = {
  async get(key) {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Erro ao ler cache:', error.message);
      return null;
    }
  },

  async set(key, value, expirationInSeconds = 3600) {
    try {
      await redis.setex(key, expirationInSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Erro ao escrever cache:', error.message);
      return false;
    }
  },

  async del(key) {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error('Erro ao deletar cache:', error.message);
      return false;
    }
  },

  async invalidatePattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return true;
    } catch (error) {
      console.error('Erro ao invalidar padrão de cache:', error.message);
      return false;
    }
  }
};

module.exports = {
  redis,
  cache
};
