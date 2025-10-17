# ZeroLight Backend

A production-ready Express.js backend with Prisma ORM, designed for concurrent user management, session handling, and notification preferences.

## Features

✅ **Prisma ORM** - Type-safe database access with PostgreSQL
✅ **Race Condition Prevention** - Distributed locking mechanism
✅ **Optimistic Locking** - Concurrent update handling with version control
✅ **Idempotent Operations** - Prevent duplicate requests
✅ **Session Management** - Secure, expiring sessions with device tracking
✅ **Notification Preferences** - Granular user notification settings
✅ **Activity Logging** - Partitioned tables for high-volume logging
✅ **API Versioning** - Clean v1 API structure
✅ **Connection Pooling** - Optimized for 1000+ concurrent users

## Architecture

### Database Schema

The application uses PostgreSQL with the following tables:

- **users** - User accounts with optimistic locking
- **sessions** - Device sessions with idempotency keys
- **notification_preferences** - Per-user notification settings
- **activity_logs** - Partitioned by month for performance
- **distributed_locks** - Prevents race conditions
- **private_beta_users** - Beta access management

### Key Design Patterns

#### 1. Optimistic Locking
Users table includes a `version` field that increments on each update, preventing lost updates in concurrent scenarios.

```typescript
// Update with version check
await updateUser(userId, updateData, currentVersion);
```

#### 2. Distributed Locking
Prevents race conditions during critical operations like user creation and wallet registration.

```typescript
// Automatically handled in services
await withLock(lockKey, async () => {
  // Critical section - only one operation at a time
});
```

#### 3. Idempotency
Session creation uses idempotency keys to prevent duplicate sessions from retry requests.

```typescript
await createSession({
  userId,
  deviceId,
  idempotencyKey: requestId, // Same key = same session
  // ...
});
```

## API Endpoints

### Users API (`/api/v1/users`)

- `GET /` - Get all users (paginated)
- `GET /:id` - Get user by ID
- `GET /privy/:privyId` - Get user by Privy ID
- `GET /wallet/:walletAddress` - Get user by wallet
- `POST /` - Create new user
- `PUT /:id` - Update user (supports optimistic locking)
- `POST /:id/wallet` - Register wallet address
- `POST /:id/activity` - Update last active timestamp
- `DELETE /:id` - Soft delete user

### Sessions API (`/api/v1/sessions`)

- `POST /` - Create new session (with idempotency)
- `GET /:id` - Get session by ID
- `GET /user/:userId/active` - Get active session
- `GET /user/:userId` - Get all user sessions
- `GET /user/:userId/stats` - Get session statistics
- `PUT /:id` - Update session
- `POST /:id/activity` - Update activity timestamp
- `PUT /:id/push-token` - Update push notification token
- `POST /:id/extend` - Extend session expiration
- `DELETE /:id` - Terminate session
- `DELETE /user/:userId/all` - Terminate all user sessions

### Notifications API (`/api/v1/notifications`)

- `GET /preferences/:userId` - Get notification preferences
- `PUT /preferences/:userId` - Update preferences
- `POST /preferences/:userId/reset` - Reset to defaults

### Private Beta API (`/api/private-beta`)

**Unchanged from original implementation**

- `POST /referral` - Create referral key
- `POST /verify` - Verify referral key
- `POST /check-validity` - Check key validity
- `POST /status` - Check user status
- `GET /users` - Get all beta users
- `GET /debug` - Debug endpoint

## Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Setup

1. **Install dependencies:**
```bash
   npm install
   ```

2. **Configure environment:**
```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Set up database:**
```bash
   # Apply SQL schema
   psql -U your_user -d your_database -f prisma/migrations/001_initial_schema.sql

   # Generate Prisma client
   npx prisma generate
   ```

4. **Build and run:**
```bash
   # Development
   npm run dev

   # Production
   npm run build
   npm start
   ```

## Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/zerolight?schema=public

# Optional: Connection pool settings can be added to DATABASE_URL
# Example: ?connection_limit=100&connect_timeout=10
```

## Database Migrations

### Initial Setup

Run the initial schema migration:
```bash
psql -U postgres -d zerolight < prisma/migrations/001_initial_schema.sql
```

### Activity Log Partitions

Activity logs are partitioned by month. New partitions should be created before each month:

```sql
CREATE TABLE activity_logs_2026_01 PARTITION OF activity_logs
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

Consider automating this with a cron job or scheduled task.

## Concurrency & Performance

### Connection Pooling

Prisma handles connection pooling automatically. Configure via DATABASE_URL:

```
postgresql://user:pass@host:5432/db?connection_limit=100&connect_timeout=10
```

### Race Condition Prevention

The application prevents race conditions through:

1. **Distributed Locks** - Database-level locks with automatic expiration
2. **Optimistic Locking** - Version-based conflict detection
3. **Unique Constraints** - Database enforced uniqueness
4. **Transactions** - ACID guarantees for multi-step operations

### Handling High Concurrency

The system is designed to handle 1000+ concurrent users through:

- ✅ Connection pooling (configurable pool size)
- ✅ Non-blocking async operations
- ✅ Indexed database queries
- ✅ Efficient lock acquisition with retries
- ✅ Partitioned tables for high-volume data
- ✅ Automatic cleanup of expired resources

## Monitoring & Maintenance

### Periodic Cleanup Tasks

The application automatically runs cleanup tasks in production:

- **Expired locks** - Cleaned every 5 minutes
- **Expired sessions** - Cleaned every 10 minutes

### Manual Cleanup

```bash
# Clean old activity logs (e.g., older than 90 days)
# This should be run as a scheduled job
```

### Health Check

```bash
curl http://localhost:3000/health
```

Response includes database connection status.

## Testing

### Manual Testing

Use the provided examples:

**Create User:**
```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "privyId": "privy_user123",
    "email": "user@example.com"
  }'
```

**Create Session:**
```bash
curl -X POST http://localhost:3000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-here",
    "deviceId": "device123",
    "platform": "ios",
    "idempotencyKey": "request-uuid-here"
  }'
```

## Error Handling

### Optimistic Lock Conflicts

When a user update fails due to concurrent modification:

```json
{
  "success": false,
  "error": "Failed to update user",
  "message": "User has been modified by another request. Please retry."
}
```

**Status Code:** 409 Conflict

### Duplicate Resource Creation

When attempting to create a duplicate resource:

```json
{
  "success": false,
  "error": "User with this Privy ID already exists"
}
```

**Status Code:** 400 Bad Request

## Development

### Project Structure

```
src/
├── config/
│   └── prisma.ts           # Database connection & pooling
├── services/
│   ├── lockService.ts      # Distributed locking
│   ├── userService.ts      # User operations
│   ├── sessionService.ts   # Session management
│   ├── notificationService.ts
│   ├── activityLogService.ts
│   └── privateBetaService.ts
├── routes/
│   ├── v1/
│   │   ├── userRoutes.ts
│   │   ├── sessionRoutes.ts
│   │   └── notificationRoutes.ts
│   └── privateBetaRoutes.ts
├── types/
│   └── index.ts            # TypeScript definitions
└── app.ts                  # Express app setup

prisma/
├── schema.prisma           # Prisma schema
└── migrations/
    └── 001_initial_schema.sql
```

### Code Style

The project uses TypeScript with strict type checking and follows:
- ESLint for linting
- Prettier for formatting
- Async/await for asynchronous operations
- Proper error handling with try/catch

## Production Deployment

### Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure DATABASE_URL with production credentials
- [ ] Set up database backups
- [ ] Configure connection pooling appropriately
- [ ] Set up monitoring and alerting
- [ ] Configure log aggregation
- [ ] Set up SSL/TLS for database connections
- [ ] Review and adjust session expiration times
- [ ] Set up automated partition creation for activity_logs
- [ ] Configure CORS appropriately
- [ ] Set up rate limiting (not included, should be added)

### Scaling Considerations

For horizontal scaling:
- Use a managed PostgreSQL service (e.g., AWS RDS, Google Cloud SQL)
- Implement Redis for session storage (optional enhancement)
- Add load balancer in front of API servers
- Monitor database connection pool usage
- Consider read replicas for read-heavy workloads

## Security Notes

⚠️ **Important:** The current implementation is designed for demonstration. For production:

1. Add authentication middleware (JWT, OAuth, etc.)
2. Implement rate limiting
3. Add request validation with schema validators
4. Use HTTPS only
5. Implement CORS restrictions
6. Add API key authentication for admin endpoints
7. Sanitize user inputs
8. Add audit logging
9. Implement IP whitelisting for admin routes
10. Add request signing for sensitive operations

## License

ISC

## Support

For issues and questions, please open an issue on the repository.
