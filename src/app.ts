import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import routes
import helloRoutes from './routes/helloRoutes';
import userRoutes from './routes/userRoutes';
import privateBetaRoutes from './routes/privateBetaRoutes';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT: number = 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/hello', helloRoutes);
app.use('/api/users', userRoutes);
app.use('/api/private-beta', privateBetaRoutes);

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
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
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env["NODE_ENV"] === 'development' ? err.message : 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Hello world: http://localhost:${PORT}/api/hello`);
  console.log(`Users API: http://localhost:${PORT}/api/users`);
  console.log(`Private Beta API: http://localhost:${PORT}/api/private-beta`);
});

export default app;
