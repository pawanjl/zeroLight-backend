-- Add display_name and profile_picture_url to users table
ALTER TABLE users 
ADD COLUMN display_name VARCHAR(100),
ADD COLUMN profile_picture_url VARCHAR(500);

-- Add indexes for display_name
CREATE INDEX idx_display_name ON users(display_name);

-- Add comment
COMMENT ON COLUMN users.display_name IS 'User display name';
COMMENT ON COLUMN users.profile_picture_url IS 'URL to user profile picture';


