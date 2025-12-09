export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USER || 'saas_admin',
    password: process.env.DB_PASSWORD || 'dev_password',
    database: process.env.DB_NAME || 'saas_platform',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    algorithm: process.env.JWT_ALGORITHM || 'HS256',
  },
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001'],
  },
  authService: {
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:8000',
  },
  productService: {
    url: process.env.PRODUCT_SERVICE_URL || 'http://localhost:4000',
  },
  paymentService: {
    url: process.env.PAYMENT_SERVICE_URL || 'http://localhost:5000',
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3001',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
});

