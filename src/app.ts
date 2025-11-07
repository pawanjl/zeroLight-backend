import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import v1 routes
import userRoutesV1 from './routes/v1/userRoutes';
import sessionRoutesV1 from './routes/v1/sessionRoutes';
import notificationRoutesV1 from './routes/v1/notificationRoutes';
import activityLogRoutesV1 from './routes/v1/activityLogRoutes';

// Import auth routes
import authRoutes from './routes/authRoutes';

// Import legacy routes (keeping private-beta unchanged)
import privateBetaRoutes from './routes/privateBetaRoutes';

// Import auth middleware
import { authenticate } from './middleware/auth';

// Import config
import { checkDatabaseConnection } from './config/prisma';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT: number = parseInt(process.env['PORT'] || '3000', 10);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration - Allow all origins in development, configure for production
const corsOptions = {
  origin: process.env['NODE_ENV'] === 'production' 
    ? process.env['ALLOWED_ORIGINS']?.split(',') || []
    : true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization']
};

app.use(cors(corsOptions));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Public routes (no authentication required)
// Auth routes - login, refresh, etc.
app.use('/api/auth', authRoutes);

// Keep private-beta routes unchanged at /api/private-beta (public)
app.use('/api/private-beta', privateBetaRoutes);

// Protected API v1 Routes (authentication required)
app.use('/api/v1/users', authenticate, userRoutesV1);
app.use('/api/v1/sessions', authenticate, sessionRoutesV1);
app.use('/api/v1/notifications', authenticate, notificationRoutesV1);
app.use('/api/v1/activity-logs', authenticate, activityLogRoutesV1);

// Health check route
app.get('/health', async (_req: Request, res: Response) => {
  const dbConnected = await checkDatabaseConnection();

  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'OK' : 'Unhealthy',
    message: 'Server is running',
    database: {
      connected: dbConnected,
      type: 'PostgreSQL (Prisma)'
    },
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env["NODE_ENV"] === 'development' ? err.message : 'Internal server error'
  });
});

app.listen(PORT, async () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log('\n🔐 Authentication Endpoints:');
  console.log(`   Login: http://localhost:${PORT}/api/auth/login`);
  console.log(`   Refresh: http://localhost:${PORT}/api/auth/refresh`);
  console.log(`   Logout: http://localhost:${PORT}/api/auth/logout`);
  console.log(`   Me: http://localhost:${PORT}/api/auth/me`);
  console.log('\n📡 API v1 Endpoints (Protected):');
  console.log(`   Users: http://localhost:${PORT}/api/v1/users`);
  console.log(`   Sessions: http://localhost:${PORT}/api/v1/sessions`);
  console.log(`   Notifications: http://localhost:${PORT}/api/v1/notifications`);
  console.log(`   Activity Logs: http://localhost:${PORT}/api/v1/activity-logs`);
  console.log('\n🎫 Private Beta API (Public):');
  console.log(`   Private Beta: http://localhost:${PORT}/api/private-beta`);

  // Check database connection on startup
  const dbConnected = await checkDatabaseConnection();
  console.log(`\n💾 Database: ${dbConnected ? '✅ Connected' : '❌ Disconnected'}`);
});

export default app;
