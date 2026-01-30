import { ENV } from './loadEnv'

// Define types for the configuration
interface DBConfig {
    host: string | undefined
    port: number
    user: string | undefined
    password: string | undefined
    database: string | undefined
    dialect: string | undefined
}

interface Config {
    port: number
    dbConfig: DBConfig
}

// Export the configuration
const config: Config = {
    port: ENV.PORT,
    dbConfig: {
        host: ENV.DB_HOST,
        port: ENV.DB_PORT,
        user: ENV.DB_USER,
        password: ENV.DB_PASSWORD,
        database: ENV.DB_NAME,
        dialect: ENV.DB_DIALECT,
    },
}

export default config
