# OneSupportAI Backend

> Serverless backend service based on AWS Lambda + API Gateway + DynamoDB with JWT Authentication

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ 
- npm or yarn
- AWS CLI (optional, for deployment)

### Install Dependencies
```bash
cd backend
npm install
```

### Initialize Database Tables
```bash
# Initialize only conversation table (recommended for testing)
node src/scripts/initData.mjs --tables=chatInfo --no-data

# Initialize multiple specific tables
node src/scripts/initData.mjs --tables=chatInfo,users

# Initialize all tables with sample data
node src/scripts/initData.mjs

# Initialize all tables without sample data
node src/scripts/initData.mjs --no-data

# View help information
node src/scripts/initData.mjs --help
```

### Environment Variables
Create a `.env` file in the `backend/` directory:

env file in our google doc

## 🏃‍♂️ Development Workflow

### 1. Initialize Database Tables
```bash
# First time setup - create necessary tables
node src/scripts/initData.mjs --tables=chatInfo --no-data

# For development with sample data
node src/scripts/initData.mjs
```

### 2. Start Local Development Server
```bash
# Method 1: Using npm script (recommended)
npm run dev

# Method 2: Direct serverless offline call
npx serverless offline
```

### 2. Access API Documentation
After successful startup, open in browser:
- **Swagger UI**: http://localhost:3000/docs
- **Health Check**: http://localhost:3000/health
- **Service Status**: http://localhost:3000/status

### 3. Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate test coverage report
npm run test:coverage
```

### 4. Build and Deploy
```bash
# Build production version
npm run build

# Deploy to development environment
npm run deploy:dev

# Deploy to production environment
npm run deploy:prod
```

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── handlers/           # API handlers
│   │   ├── userHandler.js      # User-related APIs
│   │   └── productHandler.js   # Product-related APIs
│   ├── services/           # Business logic services
│   │   ├── dynamoDBService.js  # DynamoDB operations
│   │   └── swaggerService.js   # Swagger UI generation
│   ├── utils/              # Utility functions
│   │   └── responseHelper.js   # Standardized response helpers
│   ├── middleware/         # Middleware (future use)
│   ├── model/             # Data models
│   │   └── ProductSchema.js   # Product data structure
│   ├── tests/             # Test files
│   │   ├── userHandler.test.js
│   │   └── dynamoDBService.test.js
│   ├── scripts/           # Utility scripts
│   │   └── initData.mjs      # Database table initialization script
│   └── lambda.js          # Main Lambda handler with JWT auth
├── config.js              # Environment variables configuration
├── serverless.yml         # Serverless configuration
├── openapi.yaml           # OpenAPI specification document
└── package.json           # Project dependencies
```

## 📚 API Endpoints

### Health Check
- `GET /health` - Service health status
- `GET /status` - Detailed service information

### Authentication
- `POST /api/auth/login` - User login (JWT token generation)
- `POST /api/auth/refresh` - Refresh JWT token

### User Management
- `GET /api/users` - Get all users
- `GET /api/users/{id}` - Get user by ID
- `POST /api/users` - Create new user

### Product Management
- `GET /api/products` - Get all products (with search support)
- `GET /api/products/{id}` - Get product by ID
- `GET /api/products/type/{type}` - Get products by type

### Protected Routes
- `GET /api/protected/{path}` - JWT authentication required

## 🔐 JWT Authentication

### Features
- **Token-based authentication** using JSON Web Tokens
- **Automatic token validation** for protected routes
- **Token refresh mechanism** for extended sessions
- **Comprehensive error handling** with specific error codes

### Usage
```bash
# 1. Login to get tokens
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# 2. Use token for protected routes
curl -X GET http://localhost:3000/api/protected/example \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Error Codes
- `MISSING_TOKEN` - No authorization header provided
- `INVALID_TOKEN_FORMAT` - Token format is incorrect
- `TOKEN_EXPIRED` - JWT token has expired
- `INVALID_SIGNATURE` - Token signature is invalid
- `TOKEN_NOT_ACTIVE` - Token is not yet active

## 🛠️ Response Helpers

### Standardized Response Format
All API responses use a consistent format through `responseHelper.js`:

```javascript
// Success Response
{
  "success": true,
  "message": "Success message",
  "data": { ... },
  "timestamp": "2025-01-13T00:00:00.000Z"
}

// Error Response
{
  "success": false,
  "error": "Error Type",
  "message": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-13T00:00:00.000Z"
}
```

### Available Response Functions
```javascript
import { responses } from './utils/responseHelper.js';

// Success responses
responses.ok(data, message)           // 200 OK
responses.created(data, message)      // 201 Created

// Error responses
responses.badRequest(message, code)   // 400 Bad Request
responses.unauthorized(message, code) // 401 Unauthorized
responses.notFound(message, code)     // 404 Not Found
responses.internalError(message, code) // 500 Internal Error
```

## 🧪 Testing Guide

### Test File Location
All test files are located in the `src/tests/` directory, using the Vitest testing framework.

### Run Specific Tests
```bash
# Run user handler tests
npm test userHandler

# Run database service tests
npm test dynamoDBService

# Run all tests with coverage
npm run test:coverage
```

### Testing Best Practices
1. **Each functional module should have corresponding test files**
2. **Test cases should cover both normal and exceptional scenarios**
3. **Use `beforeEach` to set up test environment**
4. **Mock external dependencies (e.g., AWS SDK)**

## 🔧 Development Tools

### 1. Swagger UI
- Automatically generates API documentation
- Supports online API testing
- Access URL: http://localhost:3000/docs
- Includes JWT authentication endpoints

### 2. Serverless Offline
- Local simulation of AWS Lambda environment
- Supports hot reload
- Port configuration: HTTP 3000, Lambda 3002

### 3. Response Helpers
- Standardized API response format
- Consistent CORS headers
- Automatic timestamp generation
- Error code standardization

### 4. Database Initialization Script
- **Selective table creation** - Create specific tables or all tables
- **Schema reuse** - Uses existing model definitions from `src/model/`
- **Smart table detection** - Automatically skips existing tables
- **Sample data loading** - Optional initialization of test data
- **Command line options** - Flexible configuration via CLI arguments

## 📝 Development Standards

### Code Style
- Use ES6 module syntax (`import`/`export`)
- Use `const` and `let`, avoid `var`
- Use arrow functions
- Use template literals

### File Naming
- Use camelCase for filenames
- Test files end with `.test.js`
- Handler files end with `Handler.js`
- Utility files end with descriptive names (e.g., `responseHelper.js`)

### Error Handling
- All async operations must have try-catch
- Return unified error format using response helpers
- Log detailed error information
- Use specific error codes for different failure scenarios

### Response Format
- Always use response helper functions
- Maintain consistent CORS headers
- Include appropriate HTTP status codes
- Provide meaningful error messages and codes

## 🚨 Common Issues

### Q: Port already in use when starting
```bash
# Check port usage
netstat -ano | findstr :3000

# Kill process
taskkill /PID <process_id> /F
```

### Q: Test fails with module not found
```bash
# Check import path is correct
# Ensure .js extension is used
import userHandler from './handlers/userHandler.js';
```

### Q: Environment variables not loading
```bash
# Check .env file is in correct location
# Ensure config.js path is correct
# Verify JWT_SECRET is set
```

### Q: DynamoDB connection fails
```bash
# Check AWS credentials configuration
# Confirm AWS_REGION is set correctly
# Verify DynamoDB tables exist
```

### Q: JWT authentication fails
```bash
# Verify JWT_SECRET is set in .env
# Check token format (Bearer token)
# Ensure token hasn't expired
```

### Q: Database initialization script fails
```bash
# Check AWS credentials are configured
# Verify AWS_REGION is set correctly
# Ensure DynamoDB permissions are granted
# Check table schemas in src/model/ directory
```

### Q: Tables already exist error
```bash
# This is normal - script automatically skips existing tables
# Use --no-data flag to only create tables without sample data
# Check DynamoDB console to verify table status
```

## 🔄 Workflow

### Daily Development Process
1. **Pull latest code**: `git pull origin main`
2. **Install dependencies**: `npm install`
3. **Start local service**: `npm run dev`
4. **Write/modify code**
5. **Run tests**: `npm test`
6. **Commit code**: `git add . && git commit -m "feat: description"`
7. **Push code**: `git push origin feature/xxx`

### New Feature Development Process
1. **Create feature branch**: `git checkout -b feature/new-feature`
2. **Write code and tests**
3. **Pass local tests**
4. **Create Pull Request**
5. **Code review**
6. **Merge to main branch**

### Deployment Process
1. **Test in development environment**: `npm run deploy:dev`
2. **Verify functionality works**
3. **Deploy to production**: `npm run deploy:prod`
4. **Monitor service status**

## 🔒 Security Features

### JWT Implementation
- **Secure token generation** with configurable expiration
- **Token validation** with comprehensive error handling
- **Refresh token mechanism** for secure session management
- **Bearer token authentication** for API access

### CORS Configuration
- **Preflight request handling** for cross-origin requests
- **Configurable CORS headers** for different environments
- **Secure credential handling** with appropriate settings

---

**Happy Coding! 🎉**
