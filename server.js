const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const os = require('os');
const ServerLock = require('./lib/server-lock');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Initialize server lock
const serverLock = new ServerLock(port);

// Function to get local network IP
function getLocalNetworkIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

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

// Acquire server lock before starting
serverLock.acquireLock()
    .then(() => {
        // Setup cleanup handlers
        serverLock.setupCleanup();

        return app.prepare();
    })
    .then(() => {
        // Log when Next.js is ready
        console.log('✅ Next.js app prepared successfully');
        console.log('🎉 Turbopack: First compilation completed - app is ready!');

        const httpServer = createServer(async (req, res) => {
            try {
                const parsedUrl = parse(req.url, true);
                await handle(req, res, parsedUrl);
            } catch (err) {
                console.error('❌ Server error:', err);
                console.error('❌ TURBOPACK COMPILATION ERROR');
                console.error(`📋 Error: ${err.message || err}`);
                res.statusCode = 500;
                res.end('Internal Server Error');
            }
        });

        // SSE notifications are handled by Next.js API routes
        console.log('🔌 SSE notification system ready');

        httpServer.listen(port, (err) => {
            if (err) {
                console.error('❌ Failed to start server:', err);
                console.error('❌ TURBOPACK COMPILATION ERROR');
                console.error(`📋 Error: ${err.message || err}`);
                serverLock.releaseLock();
                throw err;
            }
            console.log(`🎉 Server ready on http://${hostname}:${port}`);
            console.log('🔌 SSE notification system ready for real-time notifications');

            // Display network access information
            const networkIP = getLocalNetworkIP();
            console.log('\n📡 NETWORK ACCESS:');
            console.log('='.repeat(50));
            console.log(`🏠 Local:    http://localhost:${port}`);
            if (networkIP !== 'localhost') {
                console.log(`🌐 Network:  http://${networkIP}:${port}`);
                console.log(`📱 Mobile:   http://${networkIP}:${port}`);
            }
            console.log('='.repeat(50));
            console.log('💡 Share the Network URL with other devices on the same network');
            console.log('');
        });
    })
    .catch((err) => {
        if (err.message.includes('already running') || err.message.includes('already in use')) {
            console.error(`❌ ${err.message}`);
            console.error('💡 To kill existing servers, run: ./scripts/kill-nextjs-servers.sh');
            console.error('💡 Or use: npm run kill-servers');
        } else {
            console.error('❌ Failed to prepare Next.js app:', err);
            console.error('❌ TURBOPACK COMPILATION ERROR');
            console.error(`📋 Error: ${err.message || err}`);
        }
        serverLock.releaseLock();
        process.exit(1);
    });

// Process events are now handled by ServerLock
