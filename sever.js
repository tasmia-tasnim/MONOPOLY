const express = require('express');
const cors = require('cors');
const path = require('path');
const gameRoutes = require('./routes/gameRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static 
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes 
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/test-db', async (req, res) => {
    try {
        const db = require('./config/database');
        const [result] = await db.execute('SELECT 1 as test');
        res.json({ 
            success: true, 
            message: 'Database connection successful',
            result: result
        });
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Database connection failed',
            error: error.message 
        });
    }
});

// Game routes
app.use('/api/games', gameRoutes);

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `API endpoint not found: ${req.originalUrl}`
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});


app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🎮 Monopoly Game Server running on port ${PORT}`);
    console.log(`📱 Frontend: http://localhost:${PORT}`);
    console.log(`🔌 API: http://localhost:${PORT}/api`);
    console.log(`🔧 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`💾 DB Test: http://localhost:${PORT}/api/test-db`);
    
    // Test database 
    const db = require('./config/database');
});


process.on('SIGINT', () => {
    console.log('\n🛑 Server shutting down...');
    process.exit(0);
});

module.exports = app;
