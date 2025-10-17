import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import v1 routes
import userRoutesV1 from './routes/v1/userRoutes';
import sessionRoutesV1 from './routes/v1/sessionRoutes';
import notificationRoutesV1 from './routes/v1/notificationRoutes';

// Import legacy routes (keeping private-beta unchanged)
import privateBetaRoutes from './routes/privateBetaRoutes';

// Import config
import { checkDatabaseConnection } from './config/prisma';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT: number = parseInt(process.env['PORT'] || '3000', 10);

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API v1 Routes
app.use('/api/v1/users', userRoutesV1);
app.use('/api/v1/sessions', sessionRoutesV1);
app.use('/api/v1/notifications', notificationRoutesV1);

// Keep private-beta routes unchanged at /api/private-beta
app.use('/api/private-beta', privateBetaRoutes);

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
  console.log('\n📡 API v1 Endpoints:');
  console.log(`   Users: http://localhost:${PORT}/api/v1/users`);
  console.log(`   Sessions: http://localhost:${PORT}/api/v1/sessions`);
  console.log(`   Notifications: http://localhost:${PORT}/api/v1/notifications`);
  console.log('\n🔐 Private Beta API (unchanged):');
  console.log(`   Private Beta: http://localhost:${PORT}/api/private-beta`);
  
  // Check database connection on startup
  const dbConnected = await checkDatabaseConnection();
  console.log(`\n💾 Database: ${dbConnected ? '✅ Connected' : '❌ Disconnected'}`);
});

export default app;
