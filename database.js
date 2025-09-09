const mysql = require('mysql2/promise');
require('dotenv').config();

// Database config 
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'monopoly_game',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
 
    

    keepAliveInitialDelay: 0,
    enableKeepAlive: true,
    idleTimeout: 600000, 
    acquireTimeout: 60000, 
};

// Creating connection pool
const pool = mysql.createPool(dbConfig);


pool.on('connection', (connection) => {
    console.log('New connection established as id ' + connection.threadId);
});

pool.on('error', (err) => {
    console.error('Database pool error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('Database connection lost, pool will reconnect automatically');
    } else {
        console.error('Database error:', err);
    }
});

// Test connection function
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        await connection.execute('SELECT 1');
        console.log('✅ Database connected successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

// Test connection on startup
testConnection();

//  shutdown
process.on('SIGINT', async () => {
    console.log('Closing database connections...');
    await pool.end();
    process.exit(0);
});

module.exports = pool;
