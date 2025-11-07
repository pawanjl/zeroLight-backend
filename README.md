# ZeroLight Backend

A production-ready Express.js backend with Prisma ORM, designed for concurrent user management, session handling, and notification preferences.

## Features

✅ **Privy + JWT Authentication** - Two-tier auth with Privy verification and JWT tokens
✅ **Protected Routes** - Middleware-based authentication for all API v1 endpoints
✅ **Token Management** - Access tokens (short-lived) and refresh tokens (long-lived)
✅ **Prisma ORM** - Type-safe database access with PostgreSQL
✅ **Race Condition Prevention** - Distributed locking mechanism
✅ **Optimistic Locking** - Concurrent update handling with version control
✅ **Idempotent Operations** - Prevent duplicate requests
✅ **Session Management** - Secure, expiring sessions with device tracking
✅ **Notification Preferences** - Granular user notification settings
✅ **Activity Logging** - Partitioned tables for high-volume logging
✅ **API Versioning** - Clean v1 API structure
✅ **Connection Pooling** - Optimized for Supabase session pooler

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

### Authentication API (`/api/auth`) 🔓 Public

- `POST /login` - Login with Privy token, get JWT tokens
- `POST /refresh` - Refresh access token with refresh token
- `POST /logout` - Logout and terminate session (requires auth)
- `GET /me` - Get current authenticated user (requires auth)
- `GET /status` - Authentication service health check

### Users API (`/api/v1/users`) 🔒 Protected

**All endpoints require JWT authentication**

- `GET /` - Get all users (paginated)
- `GET /:id` - Get user by ID
- `GET /privy/:privyId` - Get user by Privy ID
- `GET /wallet/:walletAddress` - Get user by wallet
- `POST /` - Create new user
- `PUT /:id` - Update user (supports optimistic locking)
- `POST /:id/wallet` - Register wallet address
- `POST /:id/activity` - Update last active timestamp
- `DELETE /:id` - Soft delete user

### Sessions API (`/api/v1/sessions`) 🔒 Protected

**All endpoints require JWT authentication**

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

### Notifications API (`/api/v1/notifications`) 🔒 Protected

**All endpoints require JWT authentication**

- `GET /preferences/:userId` - Get notification preferences
- `PUT /preferences/:userId` - Update preferences
- `POST /preferences/:userId/reset` - Reset to defaults

### Activity Logs API (`/api/v1/activity-logs`) 🔒 Protected

**All endpoints require JWT authentication**

- `GET /user/:userId` - Get user activity logs (paginated)
- `POST /` - Create activity log entry

### Private Beta API (`/api/private-beta`) 🔓 Public

- `POST /referral` - Create single referral key
- `POST /referrals` - Create single referral key (alias)
- `POST /referrals/bulk` - Create multiple referral keys (1-100)
- `GET /referrals/unused` - Get all unused (pending) referral keys
- `POST /verify` - Verify referral key with user email
- `POST /check-validity` - Check if referral key is valid
- `POST /status` - Check user status by email
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

2. **Generate JWT secrets:**
```bash
npm run generate-secrets
# Copy the generated secrets to your .env file
```

3. **Configure environment:**
```bash
# Create .env file with:
# - DATABASE_URL (PostgreSQL connection)
# - JWT_SECRET and JWT_REFRESH_SECRET (from step 2)
# - PRIVY_APP_ID, PRIVY_APP_SECRET (from https://dashboard.privy.io)
```

4. **Set up database:**
```bash
# Apply SQL schema
psql -U your_user -d your_database -f prisma/migrations/001_initial_schema.sql

# Generate Prisma client
npx prisma generate
```

5. **Build and run:**
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### Quick Start with Authentication

1. **Test Privy token verification:**
```bash
npm run test-privy -- <YOUR_PRIVY_ACCESS_TOKEN>
```

2. **Login to get JWT tokens:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"privyToken": "YOUR_PRIVY_TOKEN"}'
```

3. **Use JWT token for protected endpoints:**
```bash
curl -X GET http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000

# Database (PostgreSQL with Supabase session pooler)
DATABASE_URL=postgresql://user:password@host.pooler.supabase.com:5432/database?pgbouncer=true

# JWT Configuration (REQUIRED)
# Generate with: npm run generate-secrets
JWT_SECRET=your-super-secret-key-min-32-characters
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-characters
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Privy Configuration (REQUIRED for authentication)
# Get from: https://dashboard.privy.io
PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-app-secret
PRIVY_VERIFICATION_KEY=your-privy-verification-key
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

### Authentication Testing

**1. Test Privy Token:**
```bash
npm run test-privy -- <PRIVY_ACCESS_TOKEN>
```

**2. Login with Privy:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "privyToken": "YOUR_PRIVY_TOKEN",
    "platform": "web"
  }'
```

**3. Test Protected Endpoint:**
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**4. Refresh Token:**
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
```

### API Testing (Requires Authentication)

**Create User:**
```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "privyId": "privy_user123",
    "email": "user@example.com"
  }'
```

**Create Session:**
```bash
curl -X POST http://localhost:3000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "userId": "user-uuid-here",
    "deviceId": "device123",
    "platform": "ios",
    "idempotencyKey": "request-uuid-here"
  }'
```

### Utility Scripts

**Generate JWT Secrets:**
```bash
npm run generate-secrets
```

**Test Privy Token:**
```bash
npm run test-privy -- <TOKEN>
# or
PRIVY_TOKEN="your-token" npm run test-privy
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
│   ├── prisma.ts           # Database connection & pooling
│   └── privy.ts            # Privy client configuration
├── middleware/
│   └── auth.ts             # JWT authentication middleware
├── services/
│   ├── authService.ts      # Authentication logic
│   ├── tokenService.ts     # JWT token management
│   ├── lockService.ts      # Distributed locking
│   ├── userService.ts      # User operations
│   ├── sessionService.ts   # Session management
│   ├── notificationService.ts
│   ├── activityLogService.ts
│   └── privateBetaService.ts
├── routes/
│   ├── authRoutes.ts       # Authentication endpoints
│   ├── v1/
│   │   ├── userRoutes.ts
│   │   ├── sessionRoutes.ts
│   │   ├── notificationRoutes.ts
│   │   └── activityLogRoutes.ts
│   └── privateBetaRoutes.ts
├── types/
│   ├── index.ts            # General TypeScript definitions
│   └── auth.ts             # Authentication type definitions
└── app.ts                  # Express app setup

prisma/
├── schema.prisma           # Prisma schema
└── migrations/
    └── 001_initial_schema.sql

scripts/
├── generate-jwt-secrets.js # Generate secure JWT secrets
├── test-privy-token.js     # Test Privy token verification
└── README.md               # Scripts documentation
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
- [ ] Generate and set secure JWT secrets (32+ characters)
- [ ] Configure Privy credentials from dashboard
- [ ] Configure DATABASE_URL with production credentials
- [ ] Ensure JWT_SECRET ≠ JWT_REFRESH_SECRET
- [ ] Set appropriate token expiry times
- [ ] Set up database backups
- [ ] Configure connection pooling for Supabase
- [ ] Set up monitoring and alerting
- [ ] Configure log aggregation
- [ ] Set up SSL/TLS for database connections
- [ ] Review and adjust session expiration times
- [ ] Set up automated partition creation for activity_logs
- [ ] Configure CORS appropriately
- [ ] Set up rate limiting on auth endpoints
- [ ] Enable HTTPS only
- [ ] Test authentication flow end-to-end

### Scaling Considerations

For horizontal scaling:
- Use a managed PostgreSQL service (e.g., AWS RDS, Google Cloud SQL)
- Implement Redis for session storage (optional enhancement)
- Add load balancer in front of API servers
- Monitor database connection pool usage
- Consider read replicas for read-heavy workloads

## Security

### Authentication System

✅ **Two-Tier Authentication**
- Frontend: Privy authentication
- Backend: JWT tokens (access + refresh)

✅ **Token Security**
- Short-lived access tokens (1 hour default)
- Long-lived refresh tokens (7 days default)
- Separate secrets for access and refresh tokens
- Token rotation on refresh

✅ **Protected Routes**
- All `/api/v1/*` endpoints require JWT authentication
- Middleware-based authorization
- User context attached to requests

### Security Checklist for Production

✅ **Implemented:**
1. ✅ JWT authentication with Privy verification
2. ✅ Protected API routes
3. ✅ Token expiration handling
4. ✅ Secure token generation (256-bit secrets)
5. ✅ Activity logging for auth events
6. ✅ Session management with device tracking

⚠️ **Additional Recommendations:**
1. Implement rate limiting (especially on auth endpoints)
2. Add request validation with schema validators (Zod, Joi)
3. Use HTTPS only in production
4. Configure CORS restrictions
5. Add API key authentication for admin endpoints
6. Sanitize user inputs
7. Implement IP whitelisting for sensitive routes
8. Add request signing for critical operations
9. Set up Web Application Firewall (WAF)
10. Regular security audits and dependency updates

### Token Storage Best Practices

**Web/Browser:**
- Access Token: Memory or sessionStorage
- Refresh Token: HttpOnly cookie (recommended) or secure localStorage

**Mobile (React Native):**
- Use secure storage: `expo-secure-store` or `react-native-keychain`
- Never store tokens in AsyncStorage

**Token Refresh:**
- Implement automatic token refresh on 401 responses
- Use refresh token to get new access token
- Handle refresh token expiration gracefully

## License

ISC

## Documentation

- **[API Documentation](./API_DOCUMENTATION.md)** - Complete API reference with examples
- **[Authentication Setup Guide](./AUTHENTICATION_SETUP.md)** - Detailed authentication setup
- **[Authentication Implementation](./AUTHENTICATION_IMPLEMENTATION_SUMMARY.md)** - Implementation details
- **[Scripts Documentation](./scripts/README.md)** - Utility scripts guide

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with auto-reload |
| `npm run build` | Build TypeScript to JavaScript |
| `npm start` | Start production server |
| `npm run generate-secrets` | Generate secure JWT secrets |
| `npm run test-privy` | Test Privy token verification |

## Support

For issues and questions:
- Check the [API Documentation](./API_DOCUMENTATION.md)
- Review [Authentication Setup Guide](./AUTHENTICATION_SETUP.md)
- Check server logs for detailed error messages
- Open an issue on the repository
