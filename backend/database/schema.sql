-- Users table with profile information
CREATE TABLE IF NOT EXISTS time_brew.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cognito_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    country VARCHAR(100),
    interests TEXT[], -- Array of interests
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Brews table (for later)
CREATE TABLE IF NOT EXISTS time_brew.brews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    keywords TEXT[],
    delivery_time TIME NOT NULL,
    article_count INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    last_sent_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_cognito_id ON time_brew.users(cognito_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON time_brew.users(email);
CREATE INDEX IF NOT EXISTS idx_brews_user_id ON time_brew.brews(user_id);