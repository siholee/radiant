# Radiant

Yurasis company website built with Next.js, Apollo GraphQL, PostgreSQL, and Docker. Features AI-powered blog generation with CrewAI and employee task management.

## Features

- 🌐 **Multi-language Support**: Korean and English i18n
- 🔐 **Dual Authentication**: Cookie-based sessions + JWT token fallback
- 📝 **AI Blog Generation**: Integrated with CrewAI Python scripts
- 📊 **GraphQL API**: Apollo Server with full CRUD operations
- 👥 **Employee Management**: Task assignment and tracking
- 🐳 **Docker Deployment**: Production-ready containerized setup
- 🔒 **Secure Middleware**: Role-based access control (ADMIN, EMPLOYEE, USER)

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS, Framer Motion
- **Backend**: Apollo Server, GraphQL, Prisma ORM
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Authentication**: iron-session, JWT (jose), bcryptjs
- **AI**: Python 3.11 + CrewAI
- **Deployment**: Docker, Nginx, Certbot (SSL)

## Getting Started

### Prerequisites

- Node.js 20+ (for local development)
- Docker & Docker Compose (for production)
- PostgreSQL 16 (if running locally without Docker)

### Local Development

1. **Install dependencies:**

```bash
npm install
```

2. **Set up environment variables:**

```bash
cp .env.example .env
```

Edit `.env` and configure:
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: 32+ character random string
- `JWT_SECRET`: 32+ character random string

3. **Initialize database:**

```bash
npx prisma generate
npx prisma db push
```

4. **Run development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Docker Deployment (Production)

1. **Prepare environment:**

```bash
cp .env.example .env
# Edit .env with production values
```

Generate secure secrets:
```bash
openssl rand -base64 32  # For SESSION_SECRET
openssl rand -base64 32  # For JWT_SECRET
```

2. **Build and run with Docker Compose:**

```bash
docker-compose up -d --build
```

3. **Initialize database:**

```bash
docker-compose exec app npx prisma db push
```

4. **Create admin user:**

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yurasis.com","password":"your-password","name":"Admin","role":"ADMIN"}'
```

## Vultr Deployment

### Initial Server Setup

1. **Connect to Vultr server:**

```bash
ssh root@your-vultr-ip
```

2. **Install dependencies:**

```bash
apt update && apt upgrade -y
apt install -y docker.io docker-compose nginx certbot python3-certbot-nginx git
```

3. **Clone repository:**

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/siholee/radiant.git
cd radiant
```

4. **Configure environment:**

```bash
cp .env.example .env
nano .env  # Edit with production values
```

5. **Set up Nginx:**

```bash
cp nginx.conf /etc/nginx/sites-available/yurasis.com
ln -s /etc/nginx/sites-available/yurasis.com /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx
```

6. **Get SSL certificate:**

```bash
certbot --nginx -d yurasis.com -d www.yurasis.com
```

7. **Start application:**

```bash
./deploy.sh
```

### Continuous Deployment

Set up GitHub Actions secrets:
- `VULTR_HOST`: Your server IP
- `VULTR_USER`: SSH username (usually `root`)
- `VULTR_SSH_KEY`: Private SSH key
- `VULTR_SSH_PORT`: SSH port (default: 22)

Push to `main` branch to trigger automatic deployment.

## API Documentation

### Authentication

**Register:**
```bash
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name",
  "role": "USER"  # or "EMPLOYEE", "ADMIN"
}
```

**Login (Cookie Session):**
```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Login (JWT Token):**
```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123",
  "returnToken": true
}
```

**Logout:**
```bash
POST /api/auth/logout
```

**Get Current User:**
```bash
GET /api/auth/me
```

### GraphQL API

Endpoint: `/api/graphql`

**Example Query:**
```graphql
query GetBlogPosts {
  blogPosts(status: PUBLISHED, locale: "ko", limit: 10) {
    id
    title
    slug
    excerpt
    publishedAt
    author {
      name
      email
    }
  }
}
```

**Example Mutation:**
```graphql
mutation CreateBlogPost {
  createBlogPost(input: {
    title: "New Post"
    slug: "new-post"
    content: "Content here..."
    locale: "ko"
    tags: ["tech", "ai"]
  }) {
    id
    title
    slug
  }
}
```

### CrewAI Blog Generation

**Generate Blog Post (Admin Only):**
```bash
POST /api/crewai/generate
Authorization: Bearer <jwt-token>
{
  "prompt": "Write a blog post about AI trends",
  "title": "AI Trends 2024",
  "locale": "ko",
  "tags": ["ai", "technology"]
}
```

## Python CrewAI Setup

Place your CrewAI script at `python/crewai/blog_generator.py`.

**Expected Input Format:**
```json
{
  "prompt": "Write about...",
  "title": "Optional title",
  "locale": "ko",
  "tags": ["tag1", "tag2"]
}
```

**Expected Output Format:**
```json
{
  "title": "Generated Title",
  "content": "Full markdown content",
  "excerpt": "Short summary"
}
```

## Database Schema

### User
- `id`, `email`, `password`, `name`, `role`, `createdAt`, `updatedAt`

### BlogPost
- `id`, `title`, `slug`, `content`, `excerpt`, `coverImage`
- `status`, `publishedAt`, `locale`, `tags`
- `generatedBy`, `promptUsed`, `authorId`

### EmployeeTask
- `id`, `title`, `description`, `status`, `priority`
- `dueDate`, `completedAt`, `assigneeId`

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npx prisma generate` - Generate Prisma Client
- `npx prisma db push` - Push schema to database
- `npx prisma studio` - Open Prisma Studio
- `./deploy.sh` - Deploy on Vultr (requires sudo)

## Project Structure

```
radiant/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── [lang]/       # Locale-based routes
│   │   └── api/          # API routes
│   ├── components/       # React components
│   ├── lib/              # Utilities
│   │   ├── auth/         # Authentication
│   │   └── prisma.ts     # Database client
│   ├── graphql/          # GraphQL schema & resolvers
│   ├── locales/          # i18n translations
│   └── middleware.ts     # Auth middleware
├── prisma/
│   └── schema.prisma     # Database schema
├── python/
│   └── crewai/           # Python AI scripts
├── Dockerfile            # Multi-stage Docker build
├── docker-compose.yml    # Docker orchestration
├── nginx.conf            # Nginx configuration
└── deploy.sh             # Deployment script
```
- [Headless UI](https://headlessui.dev) - the official Headless UI documentation
- [Sanity](https://www.sanity.io) - the Sanity website
