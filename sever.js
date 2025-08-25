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

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes - COMMENTED OUT TO TEST
 app.use('/api/games', gameRoutes);

// Test database connection route - COMMENTED OUT TO TEST

app.get('/api/test-db', async (req, res) => {
    try {
        const db = require('./config/database');
        await db.execute('SELECT 1');
        res.json({ 
            success: true, 
            message: 'Database connection successful' 
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


// Health check route - FIXED: removed full URL, just use path
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Catch all route - serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
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

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🎮 Monopoly Game Server running on port ${PORT}`);
    console.log(`📱 Frontend: http://localhost:${PORT}`);
    console.log(`🔌 API: http://localhost:${PORT}/api`);
    console.log(`🔧 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`💾 DB Test: http://localhost:${PORT}/api/test-db`);
});

module.exports = app;
