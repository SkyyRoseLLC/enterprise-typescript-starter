# Enterprise TypeScript Starter

A production-ready, full-stack TypeScript application with modern architecture, comprehensive tooling, and best practices built-in.

## 🚀 Features

- **Full-Stack TypeScript**: End-to-end type safety across frontend and backend
- **Clean Architecture**: Well-structured codebase with separation of concerns
- **Modern Tech Stack**: React 18, Express.js, Node.js with latest features
- **Production Ready**: Docker, CI/CD, security best practices, comprehensive testing
- **Developer Experience**: ESLint, Prettier, hot reload, comprehensive tooling
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **API Design**: RESTful APIs with comprehensive error handling and validation
- **Testing**: Jest unit tests with coverage reporting
- **Documentation**: Comprehensive documentation and examples

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **React Router** - Client-side routing
- **Axios** - HTTP client with interceptors

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **TypeScript** - Type-safe JavaScript
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **Joi** - Input validation

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Jest** - Testing framework
- **Husky** - Git hooks
- **lint-staged** - Pre-commit linting

### DevOps
- **Docker** - Containerization with multi-stage builds
- **GitHub Actions** - CI/CD pipeline
- **Docker Compose** - Local development and production deployment

## 📁 Project Structure

```
├── src/
│   ├── backend/          # Express.js backend
│   │   ├── config/       # Configuration files
│   │   ├── controllers/  # Route controllers
│   │   ├── middleware/   # Express middleware
│   │   ├── models/       # Data models
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── utils/        # Utility functions
│   │   └── validators/   # Input validation
│   ├── frontend/         # React frontend
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   ├── types/        # TypeScript types
│   │   └── utils/        # Utility functions
│   └── shared/           # Shared types and constants
├── tests/                # Test files
├── docs/                 # Documentation
├── scripts/              # Build and utility scripts
└── .github/workflows/    # GitHub Actions workflows
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm 8+
- Docker and Docker Compose (optional)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/SkyyRoseLLC/enterprise-typescript-starter.git
   cd enterprise-typescript-starter
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   # or use the development script
   ./scripts/dev.sh
   ```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Health Check: http://localhost:3000/api/health

### Demo Credentials

For testing the application, you can use these demo credentials:
- **Email**: demo@example.com
- **Password**: DemoPass123!

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start both frontend and backend in development mode
npm run dev:backend      # Start only the backend server
npm run dev:frontend     # Start only the frontend server

# Building
npm run build            # Build both frontend and backend for production
npm run build:backend    # Build only the backend
npm run build:frontend   # Build only the frontend

# Testing
npm run test             # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues automatically
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting
npm run type-check       # Run TypeScript type checking

# Utility
npm run clean           # Clean build artifacts
```

### Project Scripts

```bash
./scripts/dev.sh        # Full development setup and start
./scripts/build.sh      # Complete production build with validation
```

## 🐳 Docker

### Development with Docker

```bash
# Build and run with Docker Compose
docker-compose up --build

# Run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f
```

### Production Deployment

```bash
# Build and run production setup
docker-compose -f docker-compose.prod.yml up --build

# Scale the application
docker-compose -f docker-compose.prod.yml up --scale app=3
```

### Manual Docker Build

```bash
# Build the Docker image
docker build -t enterprise-typescript-starter .

# Run the container
docker run -p 3000:3000 --env-file .env enterprise-typescript-starter
```

## 🔒 Security Features

- **Helmet.js** - Security headers
- **CORS** - Cross-origin resource sharing configuration
- **Rate Limiting** - API rate limiting
- **Input Validation** - Comprehensive input validation with Joi
- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt password hashing
- **Environment Variables** - Secure configuration management

## 🧪 Testing

The project includes comprehensive testing setup:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

Test files are located in the `tests/` directory and follow the naming convention `*.test.ts` or `*.spec.ts`.

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (authenticated)
- `PUT /api/auth/profile` - Update user profile (authenticated)

### User Management Endpoints

- `GET /api/users` - Get all users (authenticated)
- `GET /api/users/:id` - Get user by ID (authenticated)
- `PUT /api/users/:id` - Update user (authenticated)
- `DELETE /api/users/:id` - Delete user (authenticated)

### System Endpoints

- `GET /api/health` - Health check endpoint
- `GET /` - API information

For detailed API documentation, see the `docs/` directory.

## 🚀 Deployment

### Environment Variables

Required environment variables for production:

```bash
NODE_ENV=production
PORT=3000
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=https://yourdomain.com
```

See `.env.example` for all available configuration options.

### CI/CD Pipeline

The project includes a comprehensive GitHub Actions pipeline that:

- Runs linting and type checking
- Executes all tests with coverage reporting
- Builds the application
- Creates and tests Docker images
- Performs security scans
- Deploys to production (when configured)

### Production Checklist

- [ ] Update JWT_SECRET with a secure random string
- [ ] Configure CORS_ORIGIN for your domain
- [ ] Set up proper logging and monitoring
- [ ] Configure SSL/TLS certificates
- [ ] Set up database (if using one)
- [ ] Configure reverse proxy (nginx)
- [ ] Set up backup and disaster recovery

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style and conventions
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR
- Use conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **SkyyRoseLLC** - *Initial work* - [SkyyRoseLLC](https://github.com/SkyyRoseLLC)

## 🙏 Acknowledgments

- React team for the amazing framework
- Express.js team for the web framework
- TypeScript team for type safety
- All open source contributors who made this possible

## 📞 Support

If you have any questions or need help, please:

1. Check the [documentation](docs/)
2. Look at [existing issues](https://github.com/SkyyRoseLLC/enterprise-typescript-starter/issues)
3. Create a [new issue](https://github.com/SkyyRoseLLC/enterprise-typescript-starter/issues/new)

---

**Happy coding! 🎉**