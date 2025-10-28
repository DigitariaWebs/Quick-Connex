# Patients Management Backend

Backend API server for the Patients Management System.

## Environment Variables

Create a `.env` file in the backend directory:

```env
# Server Configuration
NODE_ENV=development
PORT=3001
HOST=localhost

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Database Configuration (when implemented)
# DATABASE_URL=mongodb://localhost:27017/patients_management
# DATABASE_NAME=patients_management

# Authentication (when implemented)
# JWT_SECRET=your-super-secret-jwt-key
# JWT_EXPIRES_IN=7d

# External Services (when implemented)
# TWILIO_ACCOUNT_SID=your-twilio-sid
# TWILIO_AUTH_TOKEN=your-twilio-token
# SENDGRID_API_KEY=your-sendgrid-key
```

## Development

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Start production server
npm start

# Build TypeScript
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

## API Endpoints

- `GET /health` - Health check
- `GET /api` - API information
- `GET /api/*` - All API routes (to be implemented)

## Project Structure

```
backend/
├── src/
│   ├── types/           # Type definitions
│   ├── utils/           # Utility functions
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes (to be created)
│   ├── controllers/     # Route controllers (to be created)
│   ├── models/          # Data models (to be created)
│   └── lib/             # Core libraries (to be created)
├── app.ts              # Express app configuration
├── server.ts           # Server initialization
├── package.json        # Dependencies and scripts
└── tsconfig.json       # TypeScript configuration
```

## Features

- ✅ Express.js with TypeScript
- ✅ Security middleware (Helmet, CORS)
- ✅ Rate limiting
- ✅ Request logging
- ✅ Graceful shutdown
- ✅ Centralized error handling
- ✅ Standardized API responses
- ✅ Health check endpoint
- 🔄 Database integration (pending)
- 🔄 Authentication system (pending)
- 🔄 API routes (pending)
