-- ============================================
-- Zero Light Backend Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    privy_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    
    -- Lighter Account Info
    wallet_address VARCHAR(42) UNIQUE,
    wallet_registered_at TIMESTAMP(6),
    
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP(6),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    
    -- Optimistic locking for concurrent updates
    version INTEGER NOT NULL DEFAULT 0
);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_privy_id ON users(privy_id);
CREATE INDEX IF NOT EXISTS idx_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_status ON users(status);

-- ============================================
-- 2. SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Device Information
    device_id VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    device_model VARCHAR(255),
    platform VARCHAR(50) NOT NULL,
    os_version VARCHAR(50),
    app_version VARCHAR(50),
    
    -- Push Notifications
    push_token TEXT,
    push_token_updated_at TIMESTAMP(6),
    
    -- Session Management
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP(6) NOT NULL,
    terminated_at TIMESTAMP(6),
    termination_reason VARCHAR(100),
    
    -- Security
    ip_address VARCHAR(45),
    
    -- Idempotency
    idempotency_key VARCHAR(255) UNIQUE
);

-- Indexes for sessions table
CREATE INDEX IF NOT EXISTS idx_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_device_id ON sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_is_active ON sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_device ON sessions(user_id, device_id);

-- ============================================
-- 3. NOTIFICATION PREFERENCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Notification Channels
    push_enabled BOOLEAN NOT NULL DEFAULT true,
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    sms_enabled BOOLEAN NOT NULL DEFAULT false,
    
    -- Notification Types
    transaction_notifications BOOLEAN NOT NULL DEFAULT true,
    security_alerts BOOLEAN NOT NULL DEFAULT true,
    marketing_updates BOOLEAN NOT NULL DEFAULT false,
    product_updates BOOLEAN NOT NULL DEFAULT true,
    
    -- Quiet Hours (stored as TIME)
    quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
    quiet_hours_start TIME(6),
    quiet_hours_end TIME(6),
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for notification preferences
CREATE INDEX IF NOT EXISTS idx_notification_user_id ON notification_preferences(user_id);

-- ============================================
-- 4. ACTIVITY LOGS TABLE (with partitioning support)
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    
    action VARCHAR(100) NOT NULL,
    metadata JSONB,
    ip_address VARCHAR(45),
    
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create initial partitions (current month and next month)
DO $$
DECLARE
    current_month TEXT;
    next_month TEXT;
    current_start DATE;
    next_start DATE;
    next_end DATE;
BEGIN
    current_start := date_trunc('month', CURRENT_DATE);
    next_start := date_trunc('month', CURRENT_DATE + INTERVAL '1 month');
    next_end := date_trunc('month', CURRENT_DATE + INTERVAL '2 months');
    
    current_month := to_char(current_start, 'YYYY_MM');
    next_month := to_char(next_start, 'YYYY_MM');
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS activity_logs_%s PARTITION OF activity_logs FOR VALUES FROM (%L) TO (%L)', 
                   current_month, current_start, next_start);
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS activity_logs_%s PARTITION OF activity_logs FOR VALUES FROM (%L) TO (%L)', 
                   next_month, next_start, next_end);
END $$;

-- Indexes for activity logs
CREATE INDEX IF NOT EXISTS idx_activity_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_session_id ON activity_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_logs(created_at);

-- ============================================
-- 5. DISTRIBUTED LOCKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS distributed_locks (
    lock_key VARCHAR(255) PRIMARY KEY,
    lock_owner VARCHAR(255) NOT NULL,
    acquired_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP(6) NOT NULL
);

-- Index for distributed locks
CREATE INDEX IF NOT EXISTS idx_expires_at ON distributed_locks(expires_at);

-- ============================================
-- 6. PRIVATE BETA USERS TABLE (existing)
-- ============================================
CREATE TABLE IF NOT EXISTS private_beta_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_key VARCHAR(255) UNIQUE NOT NULL,
    user_email VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for private beta users
CREATE INDEX IF NOT EXISTS idx_referral_key ON private_beta_users(referral_key);
CREATE INDEX IF NOT EXISTS idx_beta_status ON private_beta_users(status);

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to notification_preferences table
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to private_beta_users table
DROP TRIGGER IF EXISTS update_private_beta_users_updated_at ON private_beta_users;
CREATE TRIGGER update_private_beta_users_updated_at
    BEFORE UPDATE ON private_beta_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- AUTOMATIC PARTITION CREATION FUNCTION
-- ============================================

-- Function to create next month's partition automatically
CREATE OR REPLACE FUNCTION create_next_month_partition()
RETURNS void AS $$
DECLARE
    next_month TEXT;
    next_start DATE;
    next_end DATE;
BEGIN
    next_start := date_trunc('month', CURRENT_DATE + INTERVAL '2 months');
    next_end := date_trunc('month', CURRENT_DATE + INTERVAL '3 months');
    next_month := to_char(next_start, 'YYYY_MM');
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS activity_logs_%s PARTITION OF activity_logs FOR VALUES FROM (%L) TO (%L)', 
                   next_month, next_start, next_end);
    
    RAISE NOTICE 'Created partition activity_logs_%', next_month;
EXCEPTION
    WHEN duplicate_table THEN
        RAISE NOTICE 'Partition activity_logs_% already exists', next_month;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to create partitions (requires pg_cron extension)
-- Uncomment if you have pg_cron enabled in Supabase
-- SELECT cron.schedule(
--     'create-monthly-partition',
--     '0 0 1 * *',  -- Run at midnight on the first day of each month
--     $$SELECT create_next_month_partition()$$
-- );

-- ============================================
-- CLEANUP FUNCTION FOR EXPIRED LOCKS
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM distributed_locks WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Optional: Schedule lock cleanup (requires pg_cron extension)
-- Uncomment if you have pg_cron enabled
-- SELECT cron.schedule(
--     'cleanup-expired-locks',
--     '*/5 * * * *',  -- Run every 5 minutes
--     $$SELECT cleanup_expired_locks()$$
-- );

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify the setup
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Database Schema Created Successfully!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  ✓ users';
    RAISE NOTICE '  ✓ sessions';
    RAISE NOTICE '  ✓ notification_preferences';
    RAISE NOTICE '  ✓ activity_logs (partitioned)';
    RAISE NOTICE '  ✓ distributed_locks';
    RAISE NOTICE '  ✓ private_beta_users';
    RAISE NOTICE '============================================';
END $$;

-- Show table counts
SELECT 
    'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'sessions', COUNT(*) FROM sessions
UNION ALL
SELECT 'notification_preferences', COUNT(*) FROM notification_preferences
UNION ALL
SELECT 'activity_logs', COUNT(*) FROM activity_logs
UNION ALL
SELECT 'distributed_locks', COUNT(*) FROM distributed_locks
UNION ALL
SELECT 'private_beta_users', COUNT(*) FROM private_beta_users;

