# TimeBrew AI Pipeline Backend

A serverless AI-powered news curation system that delivers personalized Morning Brew-style briefings to users based on their interests, timezone, and delivery preferences.

## 🏗️ Architecture Overview

The system consists of three main components:

### 1. **AI Pipeline (Step Functions)**
- **News Collector**: Gathers fresh articles using Perplexity AI
- **News Editor**: Formats articles into Morning Brew-style briefings using OpenAI
- **Email Dispatcher**: Sends formatted briefings via SMTP

### 2. **Scheduler System**
- **Brew Scheduler**: Runs every 15 minutes to identify due brews
- **Trigger Brew**: Manual API endpoint for immediate brew generation

### 3. **User Management & Analytics**
- **Authentication**: Cognito-based user management
- **Briefings API**: Retrieve and browse past briefings
- **Feedback System**: Position-based learning for article preferences

## 📁 Project Structure

```
backend/
├── handlers/
│   ├── ai/                    # AI Pipeline Lambda functions
│   │   ├── news_collector.py  # Perplexity AI article collection
│   │   ├── news_editor.py     # OpenAI briefing formatting
│   │   └── email_dispatcher.py # SMTP email delivery
│   ├── scheduler/             # Scheduling system
│   │   ├── brew_scheduler.py  # Periodic brew identification
│   │   └── trigger_brew.py    # Manual brew triggering
│   ├── briefings/             # Briefing management
│   │   ├── get.py            # List briefings with pagination
│   │   └── get_by_id.py      # Get specific briefing details
│   ├── feedback/              # User feedback system
│   │   └── submit.py         # Submit article/briefing feedback
│   ├── auth/                  # Authentication (existing)
│   ├── brews/                 # Brew management (existing)
│   └── utils/                 # Shared utilities (existing)
├── database/
│   └── schema.sql            # Complete PostgreSQL schema
├── serverless.yml            # AWS infrastructure configuration
├── requirements.txt          # Python dependencies
├── .env                      # Environment variables
└── README.md                 # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- AWS CLI configured
- PostgreSQL database
- Serverless Framework

### 1. Install Dependencies

```bash
# Install Serverless Framework
npm install -g serverless

# Install project dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt
```

### 2. Environment Setup

Copy `.env` and fill in your values:

```bash
cp .env .env.local
```

Required environment variables:

```env
# Database Configuration
DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=your-database-name
DB_USER=your-username
DB_PASSWORD=your-password

# AWS Cognito
COGNITO_USER_POOL_ID=your-user-pool-id
COGNITO_CLIENT_ID=your-client-id

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=TimeBrew

# AI API Keys
PERPLEXITY_API_KEY=your-perplexity-api-key
OPENAI_API_KEY=your-openai-api-key

# Deployment
STAGE=dev
```

### 3. Database Setup

```bash
# Connect to your PostgreSQL database and run:
psql -h your-host -U your-user -d your-database -f database/schema.sql
```

### 4. Deploy to AWS

```bash
# Deploy to development
serverless deploy --stage dev

# Deploy to production
serverless deploy --stage prod
```

## 🔧 API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/verify-otp` - OTP verification
- `POST /auth/resend-verification` - Resend verification
- `POST /auth/refresh-token` - Refresh JWT token

### Brew Management
- `GET /brews` - List user's brews
- `GET /brews/{id}` - Get specific brew
- `POST /brews` - Create new brew

### Briefings
- `GET /briefings` - List briefings with pagination
- `GET /briefings/{id}` - Get specific briefing with content

### Feedback
- `POST /feedback` - Submit briefing or article feedback

### Scheduler
- `POST /scheduler/trigger/{brewId}` - Manually trigger brew generation

## 🤖 AI Pipeline Details

### Step Functions Workflow

1. **News Collection** (`newsCollector`)
   - Uses Perplexity AI to find fresh articles
   - Filters based on user interests and last sent date
   - Stores raw articles in `curation_cache`

2. **News Formatting** (`newsEditor`)
   - Uses OpenAI to format articles into Morning Brew style
   - Creates engaging subject lines and HTML content
   - Updates briefing with formatted content

3. **Email Delivery** (`emailDispatcher`)
   - Sends formatted briefing via SMTP
   - Updates delivery status and timestamps
   - Handles bounce and error tracking

### Scheduling Logic

The `brewScheduler` runs every 15 minutes and:
- Converts user delivery times to UTC
- Identifies brews due for delivery
- Prevents duplicate sends using `last_sent_date`
- Triggers Step Functions for due brews

## 📊 Database Schema

### Core Tables
- `users` - User profiles and preferences
- `brews` - User's news configurations
- `user_sources` - Preferred news sources

### AI Pipeline Tables
- `briefings` - Email archive and pipeline status
- `curation_cache` - Raw articles with position tracking
- `feedback` - User feedback for learning
- `article_fingerprints` - Deduplication system

### Key Features
- **Temporal Logic**: `last_sent_date` prevents duplicate articles
- **Position Tracking**: Maps user feedback to specific articles
- **Pipeline Status**: Tracks briefings through all stages
- **Auto-cleanup**: Expires old fingerprints automatically

## 🔍 Monitoring & Debugging

### CloudWatch Logs
- Each Lambda function logs to separate log groups
- Step Functions provide execution history
- Database queries are logged for performance monitoring

### Error Handling
- Graceful degradation for API failures
- Retry logic for transient errors
- Detailed error messages in briefing records

### Performance Optimization
- Database indexes for fast queries
- JSONB for efficient article storage
- Connection pooling for database access

## 🧪 Testing

### Manual Testing

```bash
# Test brew scheduler
curl -X POST https://your-api-gateway/dev/scheduler/trigger/your-brew-id

# Test briefing retrieval
curl -H "Authorization: Bearer your-jwt" https://your-api-gateway/dev/briefings

# Test feedback submission
curl -X POST -H "Authorization: Bearer your-jwt" \
  -H "Content-Type: application/json" \
  -d '{"briefing_id":"uuid","feedback_type":"overall","rating":5}' \
  https://your-api-gateway/dev/feedback
```

### Database Queries

```sql
-- Check pipeline status
SELECT status, COUNT(*) FROM time_brew.briefings GROUP BY status;

-- View user engagement
SELECT * FROM time_brew.user_engagement_summary;

-- Check recent briefings
SELECT * FROM time_brew.briefing_performance LIMIT 10;
```

## 🔐 Security Considerations

- JWT tokens for API authentication
- Cognito for user management
- Environment variables for sensitive data
- IAM roles with minimal permissions
- Input validation and sanitization
- Rate limiting on API endpoints

## 📈 Scaling Considerations

- Lambda functions auto-scale based on demand
- PostgreSQL connection pooling
- Step Functions handle concurrent executions
- CloudWatch for monitoring and alerting
- Database indexes for query performance

## 🛠️ Development

### Local Development

```bash
# Install development dependencies
pip install -r requirements-dev.txt

# Run local tests
python -m pytest tests/

# Format code
black handlers/
flake8 handlers/
```

### Adding New Features

1. **New Lambda Function**:
   - Add handler in appropriate directory
   - Update `serverless.yml` with function definition
   - Add necessary IAM permissions

2. **Database Changes**:
   - Update `schema.sql`
   - Create migration scripts
   - Update relevant Lambda functions

3. **New API Endpoint**:
   - Add HTTP event to function in `serverless.yml`
   - Implement authentication if needed
   - Update API documentation

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For issues and questions:
- Check the CloudWatch logs
- Review the database schema
- Verify environment variables
- Test API endpoints manually

---

**Built with ❤️ using AWS Lambda, Step Functions, and PostgreSQL**