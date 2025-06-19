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

-- =====================================================
-- TimeBrew.news Database Schema
-- PostgreSQL DDL for Complete System
-- =====================================================

-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS time_brew;

-- =====================================================
-- CORE TABLES (Your Existing + Enhanced)
-- =====================================================

-- Users table with profile information (YOUR EXISTING - Enhanced)
CREATE TABLE IF NOT EXISTS time_brew.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cognito_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    country VARCHAR(100),
    interests TEXT[], -- Array of user interests
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Brews table (YOUR EXISTING - Enhanced) 
CREATE TABLE IF NOT EXISTS time_brew.brews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES time_brew.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    keywords TEXT[], -- Additional keywords for fine-tuning
    delivery_time TIME NOT NULL,
    article_count INTEGER DEFAULT 5 CHECK (article_count >= 1 AND article_count <= 10),
    is_active BOOLEAN DEFAULT true,
    last_sent_date TIMESTAMP, -- CRITICAL: tracks last delivery for temporal logic
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- NEW ARCHIVE & INTELLIGENCE TABLES  
-- =====================================================

-- Briefings - Complete email archive for web UI browsing
CREATE TABLE IF NOT EXISTS time_brew.briefings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brew_id UUID REFERENCES time_brew.brews(id) ON DELETE CASCADE,
    user_id UUID REFERENCES time_brew.users(id) ON DELETE CASCADE, -- denormalized for fast queries
    
    -- Email Content
    subject_line VARCHAR(500) NOT NULL,
    html_content TEXT NOT NULL, -- Complete formatted email with personality
    
    -- Delivery Metadata
    sent_at TIMESTAMP DEFAULT NOW(),
    article_count INTEGER NOT NULL,
    
    -- Email Engagement (updated via webhooks)
    opened_at TIMESTAMP,
    click_count INTEGER DEFAULT 0,
    delivery_status VARCHAR(20) DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'bounced', 'failed')),
    
    -- System Metadata
    execution_status VARCHAR(20) DEFAULT 'completed' CHECK (execution_status IN ('processing', 'completed', 'failed')),
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Curation Cache - Raw articles from NewsCollector for debugging & learning
CREATE TABLE IF NOT EXISTS time_brew.curation_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    briefing_id UUID REFERENCES time_brew.briefings(id) ON DELETE CASCADE,
    
    -- Raw AI Output (JSONB for efficient querying)
    raw_articles JSONB NOT NULL, -- Array of articles from NewsCollector
    
    -- Search Context
    topics_searched TEXT[] NOT NULL,
    search_timeframe TSRANGE, -- PostgreSQL range type for time periods
    articles_found INTEGER NOT NULL,
    
    -- AI Metadata
    collector_prompt TEXT, -- Store prompt for debugging
    collection_duration_ms INTEGER,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- User Feedback - Position-based learning system
CREATE TABLE IF NOT EXISTS time_brew.user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES time_brew.users(id) ON DELETE CASCADE,
    briefing_id UUID REFERENCES time_brew.briefings(id) ON DELETE CASCADE,
    
    -- Position-Based Article Reference
    article_position INTEGER NOT NULL CHECK (article_position >= 0 AND article_position < 20),
    
    -- Feedback Type
    feedback_type VARCHAR(10) NOT NULL CHECK (feedback_type IN ('like', 'dislike')),
    
    -- Optional Context
    source_url VARCHAR(1000), -- if click feedback
    engagement_duration_seconds INTEGER, -- how long they engaged
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Prevent duplicate feedback for same article
    UNIQUE(user_id, briefing_id, article_position, feedback_type)
);

-- Article Fingerprints - Deduplication across all users and brews
CREATE TABLE IF NOT EXISTS time_brew.article_fingerprints (
    url_hash VARCHAR(64) PRIMARY KEY, -- SHA256 of article URL
    headline_hash VARCHAR(64), -- SHA256 of headline for extra dedup
    source VARCHAR(100) NOT NULL,
    
    -- Auto-cleanup mechanism
    first_seen TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days'),
    
    -- Usage tracking
    times_seen INTEGER DEFAULT 1
);

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- Users table indexes (YOUR EXISTING)
CREATE INDEX IF NOT EXISTS idx_users_cognito_id ON time_brew.users(cognito_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON time_brew.users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON time_brew.users(is_active) WHERE is_active = true;

-- Brews table indexes (YOUR EXISTING + Enhanced)
CREATE INDEX IF NOT EXISTS idx_brews_user_id ON time_brew.brews(user_id);
CREATE INDEX IF NOT EXISTS idx_brews_active ON time_brew.brews(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_brews_delivery_time ON time_brew.brews(delivery_time, is_active);
CREATE INDEX IF NOT EXISTS idx_brews_last_sent ON time_brew.brews(last_sent_date);

-- Briefings table indexes (for fast UI browsing)
CREATE INDEX IF NOT EXISTS idx_briefings_user_date ON time_brew.briefings(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_briefings_brew_date ON time_brew.briefings(brew_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_briefings_delivery_status ON time_brew.briefings(delivery_status);
CREATE INDEX IF NOT EXISTS idx_briefings_opened ON time_brew.briefings(user_id, opened_at) WHERE opened_at IS NOT NULL;

-- Curation cache indexes  
CREATE INDEX IF NOT EXISTS idx_cache_briefing ON time_brew.curation_cache(briefing_id);
CREATE INDEX IF NOT EXISTS idx_cache_topics ON time_brew.curation_cache USING gin(topics_searched array_ops);
CREATE INDEX IF NOT EXISTS idx_cache_timeframe ON time_brew.curation_cache USING gist(search_timeframe);

-- User feedback indexes (for learning engine)
CREATE INDEX IF NOT EXISTS idx_feedback_user_briefing ON time_brew.user_feedback(user_id, briefing_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_type ON time_brew.user_feedback(user_id, feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedback_position ON time_brew.user_feedback(briefing_id, article_position);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON time_brew.user_feedback(created_at);

-- Article fingerprints indexes (for deduplication performance)
CREATE INDEX IF NOT EXISTS idx_fingerprints_expires ON time_brew.article_fingerprints(expires_at);
CREATE INDEX IF NOT EXISTS idx_fingerprints_source ON time_brew.article_fingerprints(source);
CREATE INDEX IF NOT EXISTS idx_fingerprints_first_seen ON time_brew.article_fingerprints(first_seen);

-- =====================================================
-- FULL-TEXT SEARCH INDEXES (for archive search)
-- =====================================================

-- Enable full-text search on briefing content
CREATE INDEX IF NOT EXISTS idx_briefings_content_search 
ON time_brew.briefings USING gin(to_tsvector('english', subject_line || ' ' || html_content));

-- Search within raw articles JSON
CREATE INDEX IF NOT EXISTS idx_cache_articles_search 
ON time_brew.curation_cache USING gin(raw_articles jsonb_ops);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

-- Auto-update updated_at timestamp for users
CREATE OR REPLACE FUNCTION time_brew.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON time_brew.users 
    FOR EACH ROW EXECUTE FUNCTION time_brew.update_updated_at_column();

CREATE TRIGGER update_brews_updated_at 
    BEFORE UPDATE ON time_brew.brews 
    FOR EACH ROW EXECUTE FUNCTION time_brew.update_updated_at_column();

-- Auto-cleanup expired fingerprints (run this as a scheduled job)
CREATE OR REPLACE FUNCTION time_brew.cleanup_expired_fingerprints()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM time_brew.article_fingerprints 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- USEFUL VIEWS FOR ANALYTICS
-- =====================================================

-- User engagement summary view
CREATE OR REPLACE VIEW time_brew.user_engagement_summary AS
SELECT 
    u.id,
    u.email,
    COUNT(b.id) as total_briefings_received,
    COUNT(CASE WHEN b.opened_at IS NOT NULL THEN 1 END) as briefings_opened,
    ROUND(
        COUNT(CASE WHEN b.opened_at IS NOT NULL THEN 1 END)::numeric / 
        NULLIF(COUNT(b.id), 0) * 100, 2
    ) as open_rate_percent,
    SUM(b.click_count) as total_clicks,
    COUNT(uf.id) as total_feedback_actions,
    MAX(b.sent_at) as last_briefing_received
FROM time_brew.users u
LEFT JOIN time_brew.briefings b ON u.id = b.user_id
LEFT JOIN time_brew.user_feedback uf ON u.id = uf.user_id
GROUP BY u.id, u.email;

-- Popular sources view
CREATE OR REPLACE VIEW time_brew.popular_sources AS
SELECT 
    jsonb_array_elements(cc.raw_articles)->>'source' as source,
    COUNT(*) as times_curated,
    AVG(b.click_count) as avg_clicks_per_briefing,
    COUNT(CASE WHEN uf.feedback_type = 'like' THEN 1 END) as total_likes,
    COUNT(CASE WHEN uf.feedback_type = 'dislike' THEN 1 END) as total_dislikes
FROM time_brew.curation_cache cc
JOIN time_brew.briefings b ON cc.briefing_id = b.id
LEFT JOIN time_brew.user_feedback uf ON b.id = uf.briefing_id
GROUP BY source
ORDER BY times_curated DESC;

-- =====================================================
-- SAMPLE DATA VALIDATION FUNCTIONS
-- =====================================================

-- Function to validate brew configuration
CREATE OR REPLACE FUNCTION time_brew.validate_brew_config(
    p_user_id UUID,
    p_delivery_time TIME,
    p_article_count INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    user_brew_count INTEGER;
BEGIN
    -- Check if user already has 3 brews
    SELECT COUNT(*) INTO user_brew_count 
    FROM time_brew.brews 
    WHERE user_id = p_user_id AND is_active = true;
    
    IF user_brew_count >= 3 THEN
        RAISE EXCEPTION 'User already has maximum of 3 active brews';
    END IF;
    
    -- Validate article count
    IF p_article_count < 1 OR p_article_count > 10 THEN
        RAISE EXCEPTION 'Article count must be between 1 and 10';
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE time_brew.briefings IS 'Complete email archive - stores final formatted briefings sent to users';
COMMENT ON TABLE time_brew.curation_cache IS 'Raw articles from NewsCollector - used for learning and debugging';
COMMENT ON TABLE time_brew.user_feedback IS 'Position-based feedback system - maps user reactions to original articles';
COMMENT ON TABLE time_brew.article_fingerprints IS 'Deduplication system - prevents sending same articles twice';

COMMENT ON COLUMN time_brew.brews.last_sent_date IS 'CRITICAL: Defines temporal boundary for finding fresh articles';
COMMENT ON COLUMN time_brew.briefings.html_content IS 'Complete email HTML with Morning Brew personality and formatting';
COMMENT ON COLUMN time_brew.curation_cache.raw_articles IS 'JSONB array of original articles from AI collection stage';
COMMENT ON COLUMN time_brew.user_feedback.article_position IS 'Zero-based index mapping to curation_cache.raw_articles array';

-- =====================================================
-- GRANT PERMISSIONS (adjust as needed for your setup)
-- =====================================================

-- Grant usage on schema
-- GRANT USAGE ON SCHEMA time_brew TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA time_brew TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA time_brew TO your_app_user;