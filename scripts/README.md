# Scripts

Utility scripts for the Zero Light Backend project.

## Available Scripts

### 🔐 Generate JWT Secrets

Generate cryptographically secure secrets for JWT tokens.

**Usage:**

```bash
# Using npm
npm run generate-secrets

# Or run directly
node scripts/generate-jwt-secrets.js

# Or make it executable and run
./scripts/generate-jwt-secrets.js
```

**Output:**

The script generates:
- Two base64-encoded secrets (recommended)
- Two hex-encoded secrets (alternative)
- Ready-to-use .env configuration

**What it generates:**

- `JWT_SECRET` - For signing access tokens (short-lived, 1 hour default)
- `JWT_REFRESH_SECRET` - For signing refresh tokens (long-lived, 7 days default)

Both secrets are 32 bytes (256 bits) - cryptographically secure using Node.js `crypto.randomBytes()`.

**Security Tips:**

- ✅ Keep secrets private and never commit to git
- ✅ Use different secrets for development and production
- ✅ Store production secrets in environment variables or secret managers
- ✅ Rotate secrets periodically in production
- ✅ Each secret should be at least 32 bytes (256 bits)

---

### 🧪 Test Privy Token Verification

Test Privy token verification standalone without running the full server.

**Usage:**

```bash
# Using npm (pass token as argument after --)
npm run test-privy -- <PRIVY_ACCESS_TOKEN>

# Or with environment variable
PRIVY_TOKEN="your-token-here" npm run test-privy

# Or run directly
node scripts/test-privy-token.js <PRIVY_ACCESS_TOKEN>

# Or make it executable and run
./scripts/test-privy-token.js <PRIVY_ACCESS_TOKEN>
```

**Example:**

```bash
# Test a Privy token
npm run test-privy -- eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

# Or with environment variable
PRIVY_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." npm run test-privy
```

**What it tests:**

- ✅ Verifies PRIVY_APP_ID and PRIVY_APP_SECRET are set
- ✅ Initializes Privy client
- ✅ Verifies the provided Privy access token
- ✅ Displays verified claims and user information
- ✅ Shows token expiration status

**When to use:**

- Testing Privy integration during development
- Debugging authentication issues
- Verifying tokens from frontend before full integration
- Checking if Privy credentials are correctly configured

---

## Future Scripts

Additional utility scripts can be added here for:
- Database migrations
- Seed data generation
- Backup automation
- Performance testing
- etc.

