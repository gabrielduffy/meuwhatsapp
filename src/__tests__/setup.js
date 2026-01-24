// Setup global test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SEGREDO = 'test-secret-key';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.REDIS_ENABLED = 'false';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.PORT = '3000';
process.env.API_KEY = 'test-api-key';

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

// Mock logger to prevent actual logging
jest.mock('../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Mock database config
jest.mock('../config/database', () => ({
  query: jest.fn(),
  pool: {
    query: jest.fn(),
    on: jest.fn(),
    connect: jest.fn(),
  },
}));

// Mock redis config
jest.mock('../config/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    on: jest.fn(),
    keys: jest.fn(),
  },
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    invalidatePattern: jest.fn(),
  },
}));

// Mock Baileys
jest.mock('@whiskeysockets/baileys', () => ({
  default: jest.fn(),
  makeWASocket: jest.fn(() => ({
    ev: { on: jest.fn() },
    user: { id: 'test-user-id' },
  })),
  useMultiFileAuthState: jest.fn(() => ({
    state: {},
    saveCreds: jest.fn(),
  })),
  DisconnectReason: {},
  prepareWAMessageMedia: jest.fn(),
  generateWAMessageFromContent: jest.fn(),
}));

// Mock rate limit
jest.mock('express-rate-limit', () => jest.fn(() => (req, res, next) => next()));

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
};
