import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

console.log('--- DB CONFIG ---');
console.log('USER:', process.env.DB_USER);
console.log('HOST:', process.env.DB_HOST);
console.log('DB:', process.env.DB_NAME);
console.log('PORT:', process.env.DB_PORT);
console.log('PWD length:', process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0);
console.log('-----------------');

export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

export const query = (text, params) => pool.query(text, params);
