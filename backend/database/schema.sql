-- time_brew.users definition
-- Purpose: Stores user account information and preferences for the personalized news system
-- This is the core user table that manages authentication, personalization, and account settings

-- Drop table

-- DROP TABLE users;

CREATE TABLE users (
	id uuid NOT NULL DEFAULT gen_random_uuid(), -- Primary key: Unique identifier for each user account
	cognito_id varchar(255) NOT NULL, -- AWS Cognito user ID for authentication and identity management
	email varchar(255) NOT NULL, -- User's email address (unique) for login and communication
	first_name varchar(100) NULL, -- User's first name for personalization and greetings
	last_name varchar(100) NULL, -- User's last name for personalization and formal communication
	country varchar(100) NULL, -- User's country for regional news filtering and timezone inference
	interests _text NULL, -- Array of user interests/topics for content personalization and filtering
	timezone varchar(50) NULL DEFAULT 'UTC'::character varying, -- User's timezone for scheduling news delivery
	is_active bool NULL DEFAULT true, -- Flag to enable/disable user account and news delivery
	created_at timestamp NULL DEFAULT (now() AT TIME ZONE 'UTC'::text), -- Account creation timestamp
	updated_at timestamp NULL DEFAULT (now() AT TIME ZONE 'UTC'::text), -- Last profile update timestamp
	CONSTRAINT users_cognito_id_key UNIQUE (cognito_id),
	CONSTRAINT users_email_key UNIQUE (email),
	CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_users_active ON time_brew.users USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_users_cognito_id ON time_brew.users USING btree (cognito_id);
CREATE INDEX idx_users_email ON time_brew.users USING btree (email);

-- Table Triggers
-- Purpose: Automatically maintain updated_at timestamps for audit trails and change tracking
-- These triggers ensure updated_at is always current when records are modified

CREATE OR REPLACE FUNCTION time_brew.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = (now() AT TIME ZONE 'UTC'::text); -- Set updated_at to current UTC timestamp
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to all tables with updated_at columns
create trigger update_users_updated_at before
update
    on
    time_brew.users for each row execute function time_brew.update_updated_at_column();


-- time_brew.brews definition
-- Purpose: Stores user-defined news briefing configurations ("brews")
-- Each brew represents a personalized news digest with specific topics, timing, and delivery preferences
-- Users can have multiple brews for different interests or schedules

-- Drop table

-- DROP TABLE brews;

CREATE TABLE brews (
	id uuid NOT NULL DEFAULT gen_random_uuid(), -- Primary key: Unique identifier for each news brew configuration
	user_id uuid NULL, -- Foreign key: Links brew to the user who created it
	"name" varchar(255) NOT NULL, -- User-defined name for the brew (e.g., "Morning Tech News", "Evening Sports")
	topics _text NULL, -- Array of topics/keywords for content filtering and curation
	delivery_time time NOT NULL, -- Daily time when this brew should be delivered to the user
	article_count int4 NULL DEFAULT 5, -- Number of articles to include in each briefing (1-10)
	is_active bool NULL DEFAULT true, -- Flag to enable/disable this brew without deleting it
	last_sent_date timestamp NULL, -- Timestamp of the last successful briefing delivery
	created_at timestamp NULL DEFAULT (now() AT TIME ZONE 'UTC'::text), -- Brew creation timestamp
	updated_at timestamp NULL DEFAULT (now() AT TIME ZONE 'UTC'::text), -- Last brew configuration update timestamp
	CONSTRAINT brews_article_count_check CHECK (((article_count >= 1) AND (article_count <= 10))),
	CONSTRAINT brews_pkey PRIMARY KEY (id),
	CONSTRAINT brews_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_brews_active ON time_brew.brews USING btree (is_active) WHERE (is_active = true); -- Partial index for active brews only
CREATE INDEX idx_brews_delivery_time ON time_brew.brews USING btree (delivery_time, is_active); -- Fast lookup for scheduling active brews
CREATE INDEX idx_brews_last_sent ON time_brew.brews USING btree (last_sent_date); -- Track delivery history and scheduling
CREATE INDEX idx_brews_user_id ON time_brew.brews USING btree (user_id); -- Fast lookup of user's brews

-- Brews table trigger
create trigger update_brews_updated_at before
update
    on
    time_brew.brews for each row execute function time_brew.update_updated_at_column();


-- time_brew.run_tracker definition
-- Purpose: Tracks the execution pipeline for each news briefing generation
-- Monitors the multi-stage process: curator → editor → dispatcher → completed
-- Essential for debugging, monitoring, and ensuring reliable news delivery

-- Drop table

-- DROP TABLE run_tracker;

CREATE TABLE run_tracker (
	run_id uuid NOT NULL DEFAULT gen_random_uuid(), -- Primary key: Unique identifier for each briefing generation run
	brew_id uuid NOT NULL, -- Foreign key: Links to the brew configuration being processed
	user_id uuid NOT NULL, -- Foreign key: User who owns this briefing run
	current_stage varchar(20) NOT NULL, -- Current pipeline stage: 'curator', 'editor', 'dispatcher', 'completed', 'failed'
	failed_stage varchar(20) NULL, -- Stage where failure occurred (if any): 'curator', 'editor', 'dispatcher'
	error_message text NULL, -- Detailed error message for debugging failed runs
	created_at timestamptz NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text), -- Run initiation timestamp
	updated_at timestamptz NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text), -- Last stage update timestamp
	CONSTRAINT run_tracker_current_stage_check CHECK (((current_stage)::text = ANY ((ARRAY['curator'::character varying, 'editor'::character varying, 'dispatcher'::character varying, 'completed'::character varying, 'failed'::character varying])::text[]))),
	CONSTRAINT run_tracker_failed_stage_check CHECK (((failed_stage)::text = ANY ((ARRAY['curator'::character varying, 'editor'::character varying, 'dispatcher'::character varying])::text[]))),
	CONSTRAINT run_tracker_pkey PRIMARY KEY (run_id),
	CONSTRAINT run_tracker_brew_id_fkey FOREIGN KEY (brew_id) REFERENCES brews(id) ON DELETE CASCADE,
	CONSTRAINT run_tracker_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- Run tracker table indexes
CREATE INDEX idx_run_tracker_brew_id ON time_brew.run_tracker USING btree (brew_id); -- Fast lookup by brew configuration
CREATE INDEX idx_run_tracker_stage ON time_brew.run_tracker USING btree (current_stage); -- Fast lookup by pipeline stage
CREATE INDEX idx_run_tracker_user_id ON time_brew.run_tracker USING btree (user_id); -- Fast lookup by user

-- Table Triggers

create trigger update_run_tracker_updated_at before
update
    on
    time_brew.run_tracker for each row execute function time_brew.update_updated_at_column();


-- time_brew.user_feedback definition
-- Purpose: Captures user interactions and feedback on individual articles in briefings
-- Used for personalization, content quality improvement, and user engagement analytics
-- Tracks clicks, likes, dislikes, and other user actions on specific articles

-- Drop table

-- DROP TABLE user_feedback;

CREATE TABLE user_feedback (
	id uuid NOT NULL DEFAULT gen_random_uuid(), -- Primary key: Unique identifier for each feedback event
	user_id uuid NULL, -- Foreign key: User who provided the feedback
	run_id uuid NULL, -- Foreign key: Links to the specific briefing run containing the article
	article_position int4 NOT NULL, -- Position of the article in the briefing (1-based index)
	feedback_type varchar(10) NOT NULL, -- Type of user interaction: 'click', 'like', 'dislike', 'share', 'save'
	source_url varchar(1000) NULL, -- Original URL of the article for tracking and analytics
	created_at timestamp NULL DEFAULT (now() AT TIME ZONE 'UTC'::text), -- Timestamp when user provided feedback
	article_title varchar(500) NULL, -- Title of the article (cached for analytics without joining other tables)
	article_source varchar(200) NULL, -- News source/publisher name (cached for analytics)
	CONSTRAINT user_feedback_article_position_check CHECK (((article_position >= 0) AND (article_position < 20))),
	CONSTRAINT user_feedback_feedback_type_check CHECK (((feedback_type)::text = ANY (ARRAY[('like'::character varying)::text, ('dislike'::character varying)::text]))),
	CONSTRAINT user_feedback_pkey PRIMARY KEY (id),
	CONSTRAINT user_feedback_user_id_run_id_article_position_feedback_key UNIQUE (user_id, run_id, article_position, feedback_type),
	CONSTRAINT user_feedback_run_id_fkey FOREIGN KEY (run_id) REFERENCES run_tracker(run_id) ON DELETE CASCADE,
	CONSTRAINT user_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_feedback_article_source ON time_brew.user_feedback USING btree (article_source);
CREATE INDEX idx_feedback_article_title ON time_brew.user_feedback USING btree (article_title);
CREATE INDEX idx_feedback_created ON time_brew.user_feedback USING btree (created_at);
CREATE INDEX idx_feedback_position ON time_brew.user_feedback USING btree (run_id, article_position);
CREATE INDEX idx_feedback_user_run ON time_brew.user_feedback USING btree (user_id, run_id);
CREATE INDEX idx_feedback_user_type ON time_brew.user_feedback USING btree (user_id, feedback_type);


-- time_brew.curator_logs definition
-- Purpose: Logs the news curation process for each article in a briefing
-- Stores raw article data from news sources and AI curator's analysis/selection rationale
-- Critical for debugging curation quality and improving article selection algorithms

-- Drop table

-- DROP TABLE curator_logs;

CREATE TABLE curator_logs (
	id uuid NOT NULL DEFAULT gen_random_uuid(), -- Primary key: Unique identifier for each curation log entry
	run_id uuid NOT NULL, -- Foreign key: Links to the briefing generation run
	prompt_used text NOT NULL, -- AI prompt used for article curation and selection
	raw_llm_response text NOT NULL, -- Raw response from AI curator for debugging and analysis
	raw_articles jsonb NOT NULL, -- Raw article data from news APIs (title, content, source, URL, etc.)
	topics_searched _text NOT NULL, -- Array of topics/keywords that were searched for this curation run
	search_timeframe tsrange NULL, -- Time range used for article search (e.g., last 24 hours)
	article_count int4 NOT NULL, -- Number of articles processed during curation
	user_id uuid NOT NULL, -- Foreign key: User who owns this curation run
	runtime_ms int4 NULL, -- Curation process execution time in milliseconds
	created_at timestamptz NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text), -- Curation process timestamp
	curator_notes text NULL, -- Additional notes or metadata from the curation process
	CONSTRAINT curator_logs_pkey PRIMARY KEY (id),
	CONSTRAINT curator_logs_run_id_fkey FOREIGN KEY (run_id) REFERENCES run_tracker(run_id) ON DELETE CASCADE,
	CONSTRAINT curator_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- Curator logs table indexes
CREATE INDEX idx_curator_logs_articles_search ON time_brew.curator_logs USING gin (raw_articles); -- Full-text search within article content
CREATE INDEX idx_curator_logs_run_id ON time_brew.curator_logs USING btree (run_id); -- Fast lookup by briefing run
CREATE INDEX idx_curator_logs_runtime ON time_brew.curator_logs USING btree (runtime_ms); -- Performance analysis queries
CREATE INDEX idx_curator_logs_timeframe ON time_brew.curator_logs USING gist (search_timeframe); -- Efficient range queries on time periods
CREATE INDEX idx_curator_logs_topics ON time_brew.curator_logs USING gin (topics_searched); -- Fast search within topic arrays
CREATE INDEX idx_curator_logs_user_id ON time_brew.curator_logs USING btree (user_id); -- Fast lookup by user


-- time_brew.editor_logs definition
-- Purpose: Logs the news editing and briefing compilation process
-- Stores AI editor's work: transforming curated articles into polished briefings
-- Contains the final editorial content, formatting, and personalization applied to articles

-- Drop table

-- DROP TABLE editor_logs;

CREATE TABLE editor_logs (
	id uuid NOT NULL DEFAULT gen_random_uuid(), -- Primary key: Unique identifier for each editing log entry
	run_id uuid NOT NULL, -- Foreign key: Links to the briefing generation run
	brew_id uuid NOT NULL, -- Foreign key: Brew configuration used for this editing session
	user_id uuid NOT NULL, -- Foreign key: User who owns this briefing
	prompt_used text NOT NULL, -- AI prompt used for editing and briefing compilation
	raw_llm_response text NOT NULL, -- Raw response from AI editor (legacy, kept for backward compatibility)
	email_sent bool NULL DEFAULT false, -- Flag indicating if the briefing email was successfully sent
	email_sent_time timestamptz NULL, -- Timestamp when the briefing email was sent
	runtime_ms int4 NULL, -- Editing process execution time in milliseconds
	created_at timestamptz NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text), -- Editing process timestamp
	editorial_content jsonb NULL, -- Structured editorial content: formatted articles, subject lines, summaries
	CONSTRAINT editor_logs_pkey PRIMARY KEY (id),
	CONSTRAINT editor_logs_brew_id_fkey FOREIGN KEY (brew_id) REFERENCES brews(id) ON DELETE CASCADE,
	CONSTRAINT editor_logs_run_id_fkey FOREIGN KEY (run_id) REFERENCES run_tracker(run_id) ON DELETE CASCADE,
	CONSTRAINT editor_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- Editor logs table indexes
CREATE INDEX idx_editor_logs_brew_id ON time_brew.editor_logs USING btree (brew_id); -- Fast lookup by brew configuration
CREATE INDEX idx_editor_logs_created_at ON time_brew.editor_logs USING btree (created_at); -- Time-based queries and analytics
CREATE INDEX idx_editor_logs_editorial_content ON time_brew.editor_logs USING gin (editorial_content); -- Full-text search within editorial content
CREATE INDEX idx_editor_logs_email_sent ON time_brew.editor_logs USING btree (email_sent); -- Fast lookup of sent/unsent briefings
CREATE INDEX idx_editor_logs_run_id ON time_brew.editor_logs USING btree (run_id); -- Fast lookup by briefing run
CREATE INDEX idx_editor_logs_runtime ON time_brew.editor_logs USING btree (runtime_ms); -- Performance analysis queries
CREATE INDEX idx_editor_logs_user_id ON time_brew.editor_logs USING btree (user_id); -- Fast lookup by user


-- Foreign Key Constraints
-- Purpose: Maintain referential integrity and enable cascading deletes
-- CASCADE deletes ensure that when a parent record is deleted, all related child records are automatically removed

-- time_brew.brews foreign keys
ALTER TABLE time_brew.brews ADD CONSTRAINT brews_user_id_fkey FOREIGN KEY (user_id) REFERENCES time_brew.users(id) ON DELETE CASCADE;

-- time_brew.curator_logs foreign keys
ALTER TABLE time_brew.curator_logs ADD CONSTRAINT curator_logs_run_id_fkey FOREIGN KEY (run_id) REFERENCES time_brew.run_tracker(run_id) ON DELETE CASCADE;
ALTER TABLE time_brew.curator_logs ADD CONSTRAINT curator_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES time_brew.users(id) ON DELETE CASCADE;

-- time_brew.editor_logs foreign keys
ALTER TABLE time_brew.editor_logs ADD CONSTRAINT editor_logs_brew_id_fkey FOREIGN KEY (brew_id) REFERENCES time_brew.brews(id) ON DELETE CASCADE;
ALTER TABLE time_brew.editor_logs ADD CONSTRAINT editor_logs_run_id_fkey FOREIGN KEY (run_id) REFERENCES time_brew.run_tracker(run_id) ON DELETE CASCADE;
ALTER TABLE time_brew.editor_logs ADD CONSTRAINT editor_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES time_brew.users(id) ON DELETE CASCADE;

-- time_brew.run_tracker foreign keys
ALTER TABLE time_brew.run_tracker ADD CONSTRAINT run_tracker_brew_id_fkey FOREIGN KEY (brew_id) REFERENCES time_brew.brews(id) ON DELETE CASCADE;
ALTER TABLE time_brew.run_tracker ADD CONSTRAINT run_tracker_user_id_fkey FOREIGN KEY (user_id) REFERENCES time_brew.users(id) ON DELETE CASCADE;

-- time_brew.user_feedback foreign keys
ALTER TABLE time_brew.user_feedback ADD CONSTRAINT user_feedback_run_id_fkey FOREIGN KEY (run_id) REFERENCES time_brew.run_tracker(run_id) ON DELETE CASCADE;
ALTER TABLE time_brew.user_feedback ADD CONSTRAINT user_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES time_brew.users(id) ON DELETE CASCADE;

-- =============================================================================
-- SCHEMA SUMMARY
-- =============================================================================
-- This schema supports a personalized news briefing system with the following workflow:
--
-- 1. USERS register and configure their preferences (interests, timezone, etc.)
-- 2. BREWS define personalized news configurations (topics, delivery time, article count)
-- 3. RUN_TRACKER monitors the 3-stage pipeline for each briefing generation:
--    a) CURATOR: Searches and selects relevant articles from news sources
--    b) EDITOR: Formats and personalizes the content into a briefing
--    c) DISPATCHER: Sends the final briefing via email
-- 4. CURATOR_LOGS store raw articles and AI curation analysis
-- 5. EDITOR_LOGS store formatted briefings and editorial content
-- 6. USER_FEEDBACK captures user interactions for personalization improvement
--
-- Key Features:
-- - Multi-user support with personalized preferences
-- - Flexible brew configurations for different interests/schedules
-- - Comprehensive logging for debugging and analytics
-- - Performance optimization through strategic indexing
-- - Data integrity via foreign key constraints and cascading deletes
-- - Automatic timestamp management via triggers
-- =============================================================================