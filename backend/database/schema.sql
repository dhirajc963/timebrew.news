-- time_brew.users definition

-- Drop table

-- DROP TABLE users;

CREATE TABLE users (
	id uuid NOT NULL DEFAULT gen_random_uuid(),
	cognito_id varchar(255) NOT NULL,
	email varchar(255) NOT NULL,
	first_name varchar(100) NULL,
	last_name varchar(100) NULL,
	country varchar(100) NULL,
	interests _text NULL,
	timezone varchar(50) NULL DEFAULT 'UTC'::character varying,
	is_active bool NULL DEFAULT true,
	created_at timestamp NULL DEFAULT now(),
	updated_at timestamp NULL DEFAULT now(),
	CONSTRAINT users_cognito_id_key UNIQUE (cognito_id),
	CONSTRAINT users_email_key UNIQUE (email),
	CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_users_active ON time_brew.users USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_users_cognito_id ON time_brew.users USING btree (cognito_id);
CREATE INDEX idx_users_email ON time_brew.users USING btree (email);

-- Table Triggers

create trigger update_users_updated_at before
update
    on
    time_brew.users for each row execute function time_brew.update_updated_at_column();


-- time_brew.brews definition

-- Drop table

-- DROP TABLE brews;

CREATE TABLE brews (
	id uuid NOT NULL DEFAULT gen_random_uuid(),
	user_id uuid NULL,
	"name" varchar(255) NOT NULL,
	topic varchar(255) NOT NULL,
	keywords _text NULL,
	delivery_time time NOT NULL,
	article_count int4 NULL DEFAULT 5,
	is_active bool NULL DEFAULT true,
	last_sent_date timestamp NULL,
	created_at timestamp NULL DEFAULT now(),
	updated_at timestamp NULL DEFAULT now(),
	CONSTRAINT brews_article_count_check CHECK (((article_count >= 1) AND (article_count <= 10))),
	CONSTRAINT brews_pkey PRIMARY KEY (id),
	CONSTRAINT brews_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_brews_active ON time_brew.brews USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_brews_delivery_time ON time_brew.brews USING btree (delivery_time, is_active);
CREATE INDEX idx_brews_last_sent ON time_brew.brews USING btree (last_sent_date);
CREATE INDEX idx_brews_user_id ON time_brew.brews USING btree (user_id);

-- Table Triggers

create trigger update_brews_updated_at before
update
    on
    time_brew.brews for each row execute function time_brew.update_updated_at_column();


-- time_brew.briefings definition

-- Drop table

-- DROP TABLE briefings;

CREATE TABLE briefings (
	id uuid NOT NULL DEFAULT gen_random_uuid(),
	brew_id uuid NULL,
	user_id uuid NULL,
	subject_line varchar(500) NOT NULL,
	html_content text NOT NULL,
	sent_at timestamp NULL DEFAULT now(),
	article_count int4 NOT NULL,
	opened_at timestamp NULL,
	click_count int4 NULL DEFAULT 0,
	delivery_status varchar(20) NULL DEFAULT 'sent'::character varying,
	execution_status varchar(20) NULL DEFAULT 'completed'::character varying,
	editor_prompt text NULL,
	raw_ai_response text NULL,
	created_at timestamp NULL DEFAULT now(),
	updated_at timestamp NULL DEFAULT now(),
	CONSTRAINT briefings_delivery_status_check CHECK (((delivery_status)::text = ANY ((ARRAY['sent'::character varying, 'bounced'::character varying, 'failed'::character varying])::text[]))),
	CONSTRAINT briefings_execution_status_check CHECK (((execution_status)::text = ANY ((ARRAY['processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[]))),
	CONSTRAINT briefings_pkey PRIMARY KEY (id),
	CONSTRAINT briefings_brew_id_fkey FOREIGN KEY (brew_id) REFERENCES brews(id) ON DELETE CASCADE,
	CONSTRAINT briefings_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_briefings_brew_date ON time_brew.briefings USING btree (brew_id, sent_at DESC);
CREATE INDEX idx_briefings_content_search ON time_brew.briefings USING gin (to_tsvector('english'::regconfig, (((subject_line)::text || ' '::text) || html_content)));
CREATE INDEX idx_briefings_delivery_status ON time_brew.briefings USING btree (delivery_status);
CREATE INDEX idx_briefings_opened ON time_brew.briefings USING btree (user_id, opened_at) WHERE (opened_at IS NOT NULL);
CREATE INDEX idx_briefings_user_date ON time_brew.briefings USING btree (user_id, sent_at DESC);

-- Table Triggers

create trigger update_briefings_updated_at before
update
    on
    time_brew.briefings for each row execute function time_brew.update_updated_at_column();


-- time_brew.curation_cache definition

-- Drop table

-- DROP TABLE curation_cache;

CREATE TABLE curation_cache (
	id uuid NOT NULL DEFAULT gen_random_uuid(),
	briefing_id uuid NULL,
	raw_articles jsonb NOT NULL,
	topics_searched _text NOT NULL,
	search_timeframe tsrange NULL,
	articles_found int4 NOT NULL,
	collector_prompt text NULL,
	raw_llm_response text NULL,
	collection_duration_ms int4 NULL,
	created_at timestamp NULL DEFAULT now(),
	CONSTRAINT curation_cache_pkey PRIMARY KEY (id),
	CONSTRAINT curation_cache_briefing_id_fkey FOREIGN KEY (briefing_id) REFERENCES briefings(id) ON DELETE CASCADE
);
CREATE INDEX idx_cache_articles_search ON time_brew.curation_cache USING gin (raw_articles);
CREATE INDEX idx_cache_briefing ON time_brew.curation_cache USING btree (briefing_id);
CREATE INDEX idx_cache_timeframe ON time_brew.curation_cache USING gist (search_timeframe);
CREATE INDEX idx_cache_topics ON time_brew.curation_cache USING gin (topics_searched);
CREATE INDEX idx_cache_topics_array ON time_brew.curation_cache USING gin (topics_searched);


-- time_brew.user_feedback definition

-- Drop table

-- DROP TABLE user_feedback;

CREATE TABLE user_feedback (
	id uuid NOT NULL DEFAULT gen_random_uuid(),
	user_id uuid NULL,
	briefing_id uuid NULL,
	article_position int4 NOT NULL,
	feedback_type varchar(10) NOT NULL,
	source_url varchar(1000) NULL,
	engagement_duration_seconds int4 NULL,
	created_at timestamp NULL DEFAULT now(),
	CONSTRAINT user_feedback_article_position_check CHECK (((article_position >= 0) AND (article_position < 20))),
	CONSTRAINT user_feedback_feedback_type_check CHECK (((feedback_type)::text = ANY ((ARRAY['like'::character varying, 'dislike'::character varying])::text[]))),
	CONSTRAINT user_feedback_pkey PRIMARY KEY (id),
	CONSTRAINT user_feedback_user_id_briefing_id_article_position_feedback_key UNIQUE (user_id, briefing_id, article_position, feedback_type),
	CONSTRAINT user_feedback_briefing_id_fkey FOREIGN KEY (briefing_id) REFERENCES briefings(id) ON DELETE CASCADE,
	CONSTRAINT user_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_feedback_created ON time_brew.user_feedback USING btree (created_at);
CREATE INDEX idx_feedback_position ON time_brew.user_feedback USING btree (briefing_id, article_position);
CREATE INDEX idx_feedback_user_briefing ON time_brew.user_feedback USING btree (user_id, briefing_id);
CREATE INDEX idx_feedback_user_type ON time_brew.user_feedback USING btree (user_id, feedback_type);