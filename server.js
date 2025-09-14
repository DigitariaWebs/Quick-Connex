const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { logTurbopackStart, logTurbopackComplete, logTurbopackError } = require('./src/lib/turbopack-logger');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Log when server starts
console.log('\n🚀 CUSTOM SERVER STARTING');
console.log('='.repeat(50));
console.log(`📅 Started at: ${new Date().toLocaleString()}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`⚡ Bundler: Turbopack`);
console.log(`🌐 Host: ${hostname}:${port}`);
console.log('='.repeat(50) + '\n');

app.prepare().then(() => {
    // Log when Next.js is ready
    console.log('✅ Next.js app prepared successfully');
    logTurbopackComplete(true, 0);

    createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url, true);
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('❌ Server error:', err);
            logTurbopackError(err);
            res.statusCode = 500;
            res.end('Internal Server Error');
        }
    }).listen(port, (err) => {
        if (err) {
            console.error('❌ Failed to start server:', err);
            logTurbopackError(err);
            throw err;
        }
        console.log(`🎉 Server ready on http://${hostname}:${port}`);
    });
}).catch((err) => {
    console.error('❌ Failed to prepare Next.js app:', err);
    logTurbopackError(err);
    process.exit(1);
});

// Handle process events
process.on('SIGINT', () => {
    console.log('\n🛑 Server shutting down...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Server terminated');
    process.exit(0);
});
