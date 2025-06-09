import mysql, { Pool, PoolOptions } from 'mysql2'

import { ENV } from './loadEnv'

// Define the connection pool options
const poolOptions: PoolOptions = {
    host: ENV.DB_HOST,
    port: ENV.DB_PORT,
    user: ENV.DB_USER,
    password: ENV.DB_PASSWORD,
    database: ENV.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
}

// Create a connection pool
const pool: Pool = mysql.createPool(poolOptions)

export default pool.promise()
