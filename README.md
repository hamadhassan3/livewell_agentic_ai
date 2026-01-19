# 🌱 LiveWell - AI-Powered Healthy Aging Companion

**Empowering older adults to live healthier, more connected lives through intelligent conversational support and personalized wellness tracking.**

[![Django](https://img.shields.io/badge/Django-5.2.5-green.svg)](https://www.djangoproject.com/)
[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-54.0-black.svg)](https://expo.dev/)
[![Python](https://img.shields.io/badge/Python-3.10+-yellow.svg)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

LiveWell is a comprehensive digital health platform that combines AI-powered conversational assistance with wellness tracking to support healthy aging. Built with modern web and mobile technologies, it provides personalized health insights, medication management, goal tracking, and social engagement features designed specifically for older adults.


## 22 Tool Calls Available to the AI Agent
<img width="1256" height="1602" alt="1_22_tools" src="https://github.com/user-attachments/assets/6b436c82-c45f-415e-a652-25fb27add5d3" />


### Sequential Tool Calls (Calls Client first to get coordinates, then uses reverse geocode tool to get name of location)
<img width="2486" height="1128" alt="2_sequence_tools" src="https://github.com/user-attachments/assets/4f70df82-abf5-4d3e-802e-246a161cb75d" />

### Goals and Medication Tracking (Notice the proactive nature of the agent to ask questions)
<img width="2640" height="1292" alt="3_goals_and_meds" src="https://github.com/user-attachments/assets/f3f6065c-343c-4fea-9c8b-7604322dcb5c" />


### Profile update tool (Info gathering)
<img width="2640" height="1292" alt="4_profile_update" src="https://github.com/user-attachments/assets/34ddfcfa-8aa3-4f70-9b90-0244e275f7ac" />

### Recipes tool (Notice how the agent already knows from the profile that the user is diabetic)
<img width="2640" height="1292" alt="5_recipe_tools" src="https://github.com/user-attachments/assets/64bb4731-c571-481b-987a-78ea1d0beb0f" />


### Nearby locations tool
<img width="2640" height="900" alt="6_nearby_locations" src="https://github.com/user-attachments/assets/c3ac2ffd-ba7a-4f24-a20e-cb69d5ab1f9c" />


### Calculator for accurate information
<img width="2640" height="788" alt="7_calculator" src="https://github.com/user-attachments/assets/193ae8e6-4392-4fc4-a684-566ed06ce5fd" />


### Info fetched from RAG to maintain credibility
<img width="2640" height="788" alt="8_RAG_Information" src="https://github.com/user-attachments/assets/7f5008fb-7682-4d00-82bb-ee23b4f3d37b" />


### Web search for factual information
<img width="2640" height="788" alt="9_web_search" src="https://github.com/user-attachments/assets/e196de69-cae2-4daf-8836-e62b702cf9cc" />


### Creating goals and marking them complete
<img width="2770" height="1316" alt="10_create_goals" src="https://github.com/user-attachments/assets/23c266c3-2e9d-4135-b501-93890c482649" />


All of the tools give a very interactive and helpful conversation to the user.

## App Highlights

### RAG
4 thorough documents are chunked and added to RAG. These documents are related to healthy ageing from credible websites. This helps the model give responses in accordance with the best practices of RAG.

### User is Pushed to Improve their health by smart goals (Medium Frailty)
<img width="2486" height="1550" alt="11_user_pushed" src="https://github.com/user-attachments/assets/8bf91f5e-fac2-4ddd-87fc-48cb8d17f5b5" />


### Frail User (Model stops user from overexertion)
<img width="2486" height="1414" alt="12_frail_user" src="https://github.com/user-attachments/assets/c009592d-119f-4ee8-bd17-2c6a6bc3b9c0" />


### Frail User Smart Goals (Notice low intensity)
<img width="2408" height="1602" alt="13_frail_user_smart" src="https://github.com/user-attachments/assets/8dbfc213-509f-4ec5-bc85-8bdd830f83c4" />


### Notifications (2 types of nudges + Reminders, all smartly scheduled according to user preferences)
<img width="2408" height="1602" alt="14_notifications" src="https://github.com/user-attachments/assets/8ae94f42-a6d0-4893-88bd-20942d59f0e8" />


### Proactive Information Update Through Notifications
<img width="2408" height="966" alt="15_proactive_information" src="https://github.com/user-attachments/assets/c3fe64e5-7495-4be6-a5c7-cf79a6c0ab43" />
<img width="2408" height="966" alt="16_proactive_information_2" src="https://github.com/user-attachments/assets/f6a5815f-c5cb-45a3-8488-4cab5579fd81" />


### Friendly Update of Information (user's dignity is protected)
<img width="2408" height="966" alt="17_friendly_update" src="https://github.com/user-attachments/assets/ca4289c2-b136-4009-878b-9e6878e9af02" />



## Deployment on Azure (VM not active anymore)
Initially, we deployed on Oracle, then AWS, then Azure. We ran out of free resources on AWS and Oracle, so we had to switch to Azure. The Docker setup makes it super easy to do this.
<img width="3024" height="1964" alt="19_azure" src="https://github.com/user-attachments/assets/fed07e5b-60ba-4980-a683-b04bb7058c40" />
<img width="3024" height="1964" alt="19_azure" src="https://github.com/user-attachments/assets/51199ea4-32cb-4ba2-b5b6-4a0ab7d79372" />


## 📋 Table of Contents

- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Quick Start](#quick-start)
- [Usage](#-usage)
  - [For End Users](#for-end-users)
  - [API Documentation](#api-documentation)
- [Development](#-development)
  - [Project Structure](#project-structure)
  - [Development Setup](#development-setup)
  - [Testing](#testing)
- [Configuration](#-configuration)
  - [Environment Variables](#environment-variables)
  - [Firebase Setup](#firebase-setup)
- [Contributing](#-contributing)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)
- [Acknowledgments](#-acknowledgments)

## 🚀 Features

### Core Capabilities

#### 🤖 AI-Powered Health Assistant
- **Intelligent Conversations**: Natural language processing powered by Anthropic Claude and Google Gemini
- **Personalized Nudges**: Context-aware health reminders and motivational messages
- **Voice Interaction**: Speech-to-text and text-to-speech capabilities for accessibility
- **RAG System**: Document-based knowledge retrieval for accurate health information

#### 📊 Comprehensive Health Tracking
- **Medication Management**: Schedule tracking, reminders, and adherence monitoring
- **Activity Monitoring**: Step counting with pedometer integration
- **Goal Setting & Tracking**: Personal wellness goals with progress visualization
- **Event Calendar**: Health appointments and activity scheduling

#### 🎮 Gamification & Engagement
- **Forest Progress System**: Visual growth tracking with animated plant stages
- **Points & Achievements**: Reward system for healthy behaviors
- **Leaderboard**: Social competition and community engagement
- **Weekly Challenges**: Structured health improvement activities

#### 📱 Multi-Platform Support
- **Mobile App**: Native iOS and Android support via React Native/Expo
- **Web Application**: Responsive web interface for desktop access
- **Cross-Platform Sync**: Real-time data synchronization across devices
- **Offline Capability**: Core features available without internet connection

### Additional Features
- 📄 Document management for health records
- 🔔 Push notifications for reminders and alerts
- 📈 Dashboard with health metrics visualization
- 🌍 Location-based services for local health resources
- 👥 User profiles with customizable preferences
- 📊 Questionnaire system for health assessments (CFS, EFS scales)

## 🛠 Technology Stack

### Backend
- **Framework**: Django 5.2.5 with Django REST Framework
- **Language**: Python 3.10+
- **Database**: PostgreSQL 17
- **Vector DB**: ChromaDB for RAG implementation
- **AI/ML**: 
  - LangChain for AI orchestration
  - Anthropic Claude API
  - Google Gemini API
  - Hugging Face models
  - Sentence Transformers for embeddings
- **Authentication**: JWT with Simple JWT
- **Task Queue**: Firebase Cloud Messaging for notifications
- **Storage**: AWS S3 for document storage

### Frontend
- **Framework**: React Native 0.81.5 with Expo 54.0
- **Language**: TypeScript 5.9
- **State Management**: Zustand
- **Navigation**: React Navigation with Expo Router
- **UI Components**: 
  - Lottie for animations
  - React Native Charts for data visualization
  - Custom themed components
- **Services**: 
  - Firebase for push notifications
  - Expo AV for audio features
  - Expo Sensors for pedometer

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx (production)
- **API Documentation**: DRF Spectacular (Swagger/OpenAPI)
- **Development Tools**: ESLint, TypeScript, Pipenv

## 🚀 Getting Started

### Prerequisites

- **Docker & Docker Compose** (recommended) OR
- **Manual Installation Requirements**:
  - Python 3.10+
  - Node.js 18+ and npm/yarn
  - PostgreSQL 17
  - Redis (optional, for caching)

### Installation

#### Using Docker (Recommended)

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/livewell-f.git
cd livewell-f
```

2. **Set up environment variables**
```bash
# Backend environment
cp backend/.env.example backend/.env

# Frontend environment
cp frontend/.env.example frontend/.env
```

3. **Configure your environment files** with required API keys:
- Anthropic API key
- Google OAuth credentials
- Firebase credentials
- AWS S3 credentials (optional)

4. **Start the application**
```bash
docker-compose up --build
```

#### Manual Installation

**Backend Setup:**
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up database
python manage.py migrate
python manage.py createsuperuser

# Load initial data
python manage.py load_global_documents
python manage.py populate_cfs_questions
python manage.py populate_efs_questions

# Start server
python manage.py runserver
```

**Frontend Setup:**
```bash
cd frontend

# Install dependencies
npm install
# or
yarn install

# Start Expo
npx expo start
```

### Quick Start

Once the services are running:

1. **Access the applications**:
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/api/schema/swagger-ui/
   - Frontend Web: http://localhost:8081
   - ChromaDB: http://localhost:8002

2. **Create an account** via the mobile app or web interface

3. **Complete initial setup**:
   - Fill out health questionnaires
   - Set personal goals
   - Configure notification preferences

## 📖 Usage

### For End Users

#### Mobile App
1. **Download Expo Go** app on your device
2. Scan the QR code displayed in terminal
3. Sign up with email or Google account
4. Complete onboarding questionnaires
5. Start chatting with the AI assistant

#### Web Application
1. Navigate to http://localhost:8081
2. Sign in or create account
3. Access dashboard for health metrics
4. Use chat widget for AI assistance

### API Documentation

Interactive API documentation available at `/api/schema/swagger-ui/`

**Key Endpoints:**

```bash
# Authentication
POST /api/auth/register/
POST /api/auth/login/
POST /api/auth/token/refresh/

# Chat & AI
POST /api/agent/chat/
GET /api/agent/conversation-history/
POST /api/agent/nudge/

# Health Tracking
GET/POST /api/tracking/goals/
GET/POST /api/tracking/medications/
GET/POST /api/tracking/steps/
GET/POST /api/tracking/events/

# User Management
GET/PATCH /api/profiles/me/
GET/POST /api/profiles/preferences/
GET /api/profiles/forest-progress/
```

## 💻 Development

### Project Structure

```
livewell-f/
├── backend/                 # Django backend application
│   ├── agent/              # AI chat and nudge system
│   ├── documents/          # Document management
│   ├── livewell/           # Django settings
│   ├── notification/       # Push notification service
│   ├── profiles/           # User management
│   ├── rag/               # RAG implementation
│   ├── tools/             # LangChain tools
│   └── tracking/          # Health tracking features
│
├── frontend/               # React Native/Expo application
│   ├── api/               # API service layer
│   ├── app/               # Expo Router pages
│   ├── components/        # Reusable UI components
│   ├── hooks/             # Custom React hooks
│   ├── screens/           # Screen components
│   ├── services/          # Business logic
│   ├── stores/            # Zustand state stores
│   └── types/             # TypeScript definitions
│
├── nginx/                  # Web server configuration
├── docker-compose.yml      # Development orchestration
└── docker-compose.prod.yml # Production orchestration
```

### Development Setup

#### Backend Development
```bash
# Activate virtual environment
cd backend
source venv/bin/activate

# Install development dependencies
pip install pylint pylint-django

# Run linting
pylint --load-plugins pylint_django --django-settings-module=livewell.settings */

# Run Django shell
python manage.py shell

# Create migrations
python manage.py makemigrations
python manage.py migrate
```

#### Frontend Development
```bash
cd frontend

# Run linting
npm run lint

# Start with specific platform
npm run ios     # iOS simulator
npm run android # Android emulator
npm run web     # Web browser

# Build for production
npx expo build:ios
npx expo build:android
npx expo export:web
```

### Testing

#### Backend Tests
```bash
cd backend
python manage.py test

# Run specific app tests
python manage.py test agent
python manage.py test profiles
```

#### Frontend Tests
```bash
cd frontend
npm test

# Run with coverage
npm test -- --coverage
```

## ⚙️ Configuration

### Environment Variables

#### Backend (.env)
```env
# Database
POSTGRES_DB=livewell
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
DATABASE_URL=postgresql://postgres:password@db:5432/livewell

# AI Services
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_google_key
LANGFUSE_PUBLIC_KEY=your_langfuse_key
LANGFUSE_SECRET_KEY=your_langfuse_secret

# AWS S3 (Optional)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_STORAGE_BUCKET_NAME=livewell-documents

# OAuth
GOOGLE_OAUTH_CLIENT_ID=your_oauth_id
GOOGLE_OAUTH_CLIENT_SECRET=your_oauth_secret

# ChromaDB
CHROMA_HOST=chromadb
CHROMA_PORT=8000
```

#### Frontend (.env)
```env
# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:8000

# Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_key
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Firebase Setup

1. Create Firebase project at https://console.firebase.google.com
2. Enable Cloud Messaging
3. Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
4. Place credentials in `backend/firebase-credentials.json`
5. Update frontend Firebase configuration

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
```bash
git checkout -b feature/amazing-feature
```

3. **Make your changes**
   - Follow existing code style
   - Add tests for new features
   - Update documentation

4. **Commit with conventional commits**
```bash
git commit -m "feat: add amazing feature"
```

5. **Push and create Pull Request**
```bash
git push origin feature/amazing-feature
```

### Code Standards

- **Python**: Follow PEP 8, use type hints
- **TypeScript**: Use strict mode, define interfaces
- **React**: Functional components with hooks
- **Git**: Conventional commits, squash before merge

### Pull Request Process

1. Update README.md with details of changes
2. Ensure all tests pass
3. Update version numbers following SemVer
4. Request review from maintainers

## 🚢 Deployment

### Production Deployment with Docker

```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose exec backend python manage.py migrate

# Collect static files
docker-compose exec backend python manage.py collectstatic --noinput

# Create superuser
docker-compose exec backend python manage.py createsuperuser
```

### Environment-Specific Settings

- Set `DEBUG=False` in production
- Configure proper `ALLOWED_HOSTS`
- Use environment-specific SECRET_KEY
- Enable HTTPS with proper certificates
- Configure CORS for production domains

### Monitoring & Maintenance

- Set up logging aggregation
- Configure error tracking (e.g., Sentry)
- Implement health checks
- Schedule regular backups
- Monitor API performance with Langfuse

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Error
```bash
# Check PostgreSQL is running
docker-compose ps db

# Verify credentials
docker-compose exec backend python manage.py dbshell
```

#### ChromaDB Connection Issues
```bash
# Restart ChromaDB service
docker-compose restart chromadb

# Check logs
docker-compose logs chromadb
```

#### Frontend Build Errors
```bash
# Clear cache
npx expo start -c

# Reset project
npm run reset-project
```

#### Push Notifications Not Working
- Verify Firebase credentials are correct
- Check FCM token is being generated
- Ensure device permissions are granted

---

**Built with ❤️ for healthier, happier aging**

*LiveWell - Because every day matters*
