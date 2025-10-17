-- Initial Database Schema for ZeroLight Backend
-- This migration creates the complete database structure with proper constraints and indexes

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  
  -- Lighter Account Info
  wallet_address VARCHAR(42) UNIQUE,
  wallet_registered_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_active_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active',
  
  -- Optimistic locking for concurrent updates
  version INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_privy_id ON users(privy_id);
CREATE INDEX IF NOT EXISTS idx_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_status ON users(status);

-- Sessions Table with better constraints
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Device Information
  device_id VARCHAR(255) NOT NULL,
  device_name VARCHAR(100),
  device_model VARCHAR(100),
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android')),
  os_version VARCHAR(50),
  app_version VARCHAR(50),
  
  -- Push notification token
  push_token VARCHAR(500),
  push_token_updated_at TIMESTAMP,
  
  -- Session state
  is_active BOOLEAN DEFAULT true,
  ip_address INET,
  
  -- Idempotency key for preventing duplicate session creation
  idempotency_key VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  last_activity_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  terminated_at TIMESTAMP,
  termination_reason VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_id_active ON sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_device_id ON sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_device_user ON sessions(device_id, user_id);
CREATE INDEX IF NOT EXISTS idx_active ON sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_platform ON sessions(platform);
CREATE INDEX IF NOT EXISTS idx_push_token ON sessions(push_token) WHERE push_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_idempotency_key ON sessions(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expires_at ON sessions(expires_at) WHERE is_active = true;

-- Unique constraint for idempotency key
CREATE UNIQUE INDEX IF NOT EXISTS unique_idempotency_key ON sessions(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Partial unique constraint: Only one active session per user
-- Note: This constraint needs to be added manually after initial migration if using Prisma
-- CREATE UNIQUE INDEX unique_active_session ON sessions(user_id, is_active) WHERE is_active = true;

-- Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  trade_executed_enabled BOOLEAN DEFAULT true,
  order_filled_enabled BOOLEAN DEFAULT true,
  order_cancelled_enabled BOOLEAN DEFAULT true,
  position_liquidated_enabled BOOLEAN DEFAULT true,
  funding_payment_enabled BOOLEAN DEFAULT true,
  price_alert_enabled BOOLEAN DEFAULT false,
  margin_warning_enabled BOOLEAN DEFAULT true,
  
  push_enabled BOOLEAN DEFAULT true,
  
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_hours_timezone VARCHAR(50) DEFAULT 'UTC',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Activity Logs (Partitioned by month for performance)
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  
  action VARCHAR(100) NOT NULL,
  metadata JSONB,
  ip_address INET,
  
  created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE INDEX IF NOT EXISTS idx_user_id_created ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_id_logs ON activity_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_created_at_logs ON activity_logs(created_at DESC);

-- Create partitions for activity logs (2025)
CREATE TABLE IF NOT EXISTS activity_logs_2025_01 PARTITION OF activity_logs
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE IF NOT EXISTS activity_logs_2025_02 PARTITION OF activity_logs
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE IF NOT EXISTS activity_logs_2025_03 PARTITION OF activity_logs
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE IF NOT EXISTS activity_logs_2025_04 PARTITION OF activity_logs
  FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE IF NOT EXISTS activity_logs_2025_05 PARTITION OF activity_logs
  FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE IF NOT EXISTS activity_logs_2025_06 PARTITION OF activity_logs
  FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE IF NOT EXISTS activity_logs_2025_07 PARTITION OF activity_logs
  FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE IF NOT EXISTS activity_logs_2025_08 PARTITION OF activity_logs
  FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE IF NOT EXISTS activity_logs_2025_09 PARTITION OF activity_logs
  FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE IF NOT EXISTS activity_logs_2025_10 PARTITION OF activity_logs
  FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE IF NOT EXISTS activity_logs_2025_11 PARTITION OF activity_logs
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE IF NOT EXISTS activity_logs_2025_12 PARTITION OF activity_logs
  FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- Distributed locks table (for preventing race conditions)
CREATE TABLE IF NOT EXISTS distributed_locks (
  lock_key VARCHAR(255) PRIMARY KEY,
  lock_owner VARCHAR(255) NOT NULL,
  locked_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expires_at_lock ON distributed_locks(expires_at);

-- Private Beta Users (keeping existing table for compatibility)
CREATE TABLE IF NOT EXISTS private_beta_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_key VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  user_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Trigger to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_private_beta_users_updated_at BEFORE UPDATE ON private_beta_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

