// e2e tests run against a separate database so they never touch dev data.
process.env.DB_HOST ??= 'localhost';
process.env.DB_PORT ??= '5432';
process.env.DB_USER ??= 'postgres';
process.env.DB_PASSWORD ??= 'postgres';
process.env.DB_NAME = process.env.TEST_DB_NAME ?? 'inventory_test';
process.env.JWT_SECRET ??= 'e2e-test-secret-at-least-16-chars';
process.env.GEMINI_API_KEY = '';
process.env.NODE_ENV = 'test';
