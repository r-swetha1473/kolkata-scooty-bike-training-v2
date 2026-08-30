const { Pool } = require('pg');
require('dotenv').config();

// Support both DATABASE_URL and individual connection parameters
let pool;

const isDevelopment = process.env.NODE_ENV !== 'production';
// Vercel serverless: keep pools small, but >=2 so a held transaction client
// does not starve nested pool.query() calls (was max=1 → connect timeout).
const defaultPoolMax = process.env.VERCEL ? '3' : '10';
const poolMax = parseInt(process.env.DB_POOL_MAX || defaultPoolMax, 10);
const connectionTimeoutMillis = parseInt(
  process.env.DB_CONNECTION_TIMEOUT_MS || (process.env.VERCEL ? '20000' : '10000'),
  10
);

if (process.env.DATABASE_URL) {
  // Use connection string if available (Supabase / Neon / managed Postgres)
  // Cloud Postgres typically requires SSL in production
  const sslConfig = process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } // Required for most cloud PostgreSQL (incl. Supabase)
    : (process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false);
  
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: sslConfig,
    max: poolMax,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis,
  });
  if (isDevelopment) {
    console.log('Database: Connected using DATABASE_URL');
  }
} else {
  // Use individual parameters
  const dbConfig = {
    host: String(process.env.DB_HOST || 'localhost'),
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: String(process.env.DB_NAME || 'biketraining'),
    user: String(process.env.DB_USER || 'postgres'),
    password: process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : undefined,
    ssl: process.env.NODE_ENV === 'production' 
      ? { rejectUnauthorized: false } 
      : (process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false),
    max: poolMax,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis,
  };

  // Log configuration (without password) for debugging in development only
  if (isDevelopment) {
    console.log('Database Configuration:');
    console.log(`  Host: ${dbConfig.host}`);
    console.log(`  Port: ${dbConfig.port}`);
    console.log(`  Database: ${dbConfig.database}`);
    console.log(`  User: ${dbConfig.user}`);
    console.log(`  Password: ${dbConfig.password ? '***' : '(empty - ensure PostgreSQL allows passwordless connection or set DB_PASSWORD)'}`);
  }

  pool = new Pool(dbConfig);
}

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  // Do not kill the Vercel serverless isolate on idle client errors
  if (!process.env.VERCEL) {
    process.exit(-1);
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool
};
