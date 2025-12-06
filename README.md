# FlowHub Backend

<p align="center">
  Multi-tenant SaaS backend for workflow management built with NestJS
</p>

## Description

FlowHub is a comprehensive multi-tenant SaaS application backend built with NestJS, TypeORM, and PostgreSQL. It provides enterprise-ready features including JWT authentication, role-based access control, multi-schema tenant isolation, workflow management, billing integration, and comprehensive logging.

## Features

- **Multi-tenancy**: Schema-per-tenant isolation with dynamic connection management
- **Authentication & Authorization**: JWT-based auth with refresh tokens and RBAC
- **Workflow Management**: Projects and tasks with drag-and-drop support
- **Billing Integration**: Stripe integration for subscription management
- **Real-time Notifications**: Email and webhook notifications
- **Comprehensive Logging**: Tenant-specific audit trails
- **API Documentation**: Auto-generated Swagger documentation
- **Rate Limiting**: Built-in request throttling
- **Security**: Helmet, CORS, input validation, and password hashing

## Architecture

```
src/
├── auth/           # Authentication & JWT handling
├── users/          # User management with RBAC
├── tenants/        # Multi-tenant management
├── workflows/      # Projects and tasks
├── billing/        # Subscription & payment handling
├── logging/        # Audit trails & logging
├── notifications/  # Email & webhook notifications
├── database/       # TypeORM configuration & multi-tenant setup
└── common/         # Shared utilities, guards, interceptors
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Redis 6+ (optional, for caching)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd flowhub-backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your database credentials and secrets
```

### Database Setup

```bash
# Create PostgreSQL database
createdb flowhub_db

# Run migrations (after updating .env)
npm run migration:run
```

### Development

```bash
# Start in development mode
npm run start:dev

# The API will be available at http://localhost:3000
# Swagger documentation at http://localhost:3000/api/docs
```

### Using Docker

```bash
# Start all services with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password

### Users
- `GET /api/v1/users` - List users (Admin)
- `GET /api/v1/users/me` - Get current user profile
- `PATCH /api/v1/users/me` - Update profile
- `POST /api/v1/users/change-password` - Change password

### Tenants
- `POST /api/v1/tenants` - Create tenant (Super Admin)
- `GET /api/v1/tenants` - List tenants (Super Admin)
- `GET /api/v1/tenants/current` - Get current tenant
- `PATCH /api/v1/tenants/current` - Update current tenant

### Projects
- `GET /api/v1/projects` - List projects
- `POST /api/v1/projects` - Create project
- `GET /api/v1/projects/:id` - Get project
- `PATCH /api/v1/projects/:id` - Update project
- `DELETE /api/v1/projects/:id` - Delete project

### Tasks
- `GET /api/v1/tasks` - List tasks
- `POST /api/v1/tasks` - Create task
- `PATCH /api/v1/tasks/:id` - Update task
- `DELETE /api/v1/tasks/:id` - Delete task

## Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=flowhub
DB_PASSWORD=your_password
DB_DATABASE=flowhub_db

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key
JWT_ACCESS_TOKEN_EXPIRATION_TIME=3600
JWT_REFRESH_TOKEN_EXPIRATION_TIME=604800

# Application
PORT=3000
NODE_ENV=development
API_VERSION=v1

# Email
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASSWORD=your_app_password

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable
```

## Multi-tenancy

FlowHub uses a schema-per-tenant approach:

1. Each tenant gets a dedicated PostgreSQL schema
2. Tenant resolution via `x-tenant-id` header
3. Dynamic schema switching for database operations
4. Isolated data with shared application logic

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
