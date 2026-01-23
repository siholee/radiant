# Radiant 🚀

**보안성이 뛰어난 회원가입/로그인 시스템을 갖춘 Next.js 기반 엔터프라이즈 웹 애플리케이션**

Yurasis 기업 웹사이트 - Next.js, Apollo GraphQL, PostgreSQL, Docker 기반. CrewAI를 활용한 AI 블로그 생성 및 직원 작업 관리 기능 포함.

## ✨ 주요 기능

### 🔐 **강력한 보안 인증 시스템**
- ✅ 회원가입 (이메일 인증)
- ✅ 로그인/로그아웃 (세션 기반)
- ✅ 비밀번호 찾기/재설정
- ✅ 프로필 업데이트
- ✅ 비밀번호 변경
- ✅ Rate Limiting (DDoS 방어)
- ✅ 계정 잠금 (브루트포스 방어)
- ✅ 감사 로그 (보안 이벤트 기록)
- ✅ 비밀번호 강도 검증

### 🌐 **다국어 지원**
- 한국어/영어 i18n 지원

### 📝 **AI 블로그 생성**
- CrewAI Python 스크립트 통합

### 📊 **GraphQL API**
- Apollo Server
- 완전한 CRUD 작업 지원

### 👥 **직원 관리**
- 작업 할당 및 추적

### 🐳 **프로덕션 배포**
- Docker 컨테이너화
- Nginx 리버스 프록시
- Let's Encrypt SSL

## 🛠 기술 스택

### Frontend
- **Next.js 15** (App Router)
- **React 19**
- **Tailwind CSS**
- **Framer Motion**
- **Headless UI**

### Backend
- **Apollo Server**
- **GraphQL**
- **Prisma ORM**

### Database & Cache
- **PostgreSQL 16**
- **Redis 7**

### Authentication & Security
- **iron-session** (암호화된 세션 쿠키)
- **bcryptjs** (비밀번호 해싱)
- **Zod** (입력 검증)
- **Rate Limiting** (엔드포인트별 제한)
- **Audit Logging** (보안 이벤트 기록)

### AI & Automation
- **Python 3.11**
- **CrewAI**

### Deployment
- **Docker & Docker Compose**
- **Nginx**
- **Certbot (SSL)**

## 🚀 빠른 시작

### 📋 사전 요구사항

- Node.js 20+
- PostgreSQL 16 (또는 Docker)
- Redis 7 (또는 Docker)

### 💻 로컬 개발 환경 설정

**상세한 가이드는 [DEVELOPMENT.md](DEVELOPMENT.md) 참조**

1. **저장소 클론**
```bash
git clone https://github.com/siholee/radiant.git
cd radiant
```

2. **의존성 설치**
```bash
npm install
```

3. **데이터베이스 시작 (Docker 사용)**
```bash
# 개발용 PostgreSQL + Redis 시작
npm run docker:dev

# 또는
docker compose -f docker-compose.dev.yml up -d
```

4. **환경변수 설정**
```bash
cp .env.local.example .env.local
nano .env.local  # 편집
```

5. **데이터베이스 마이그레이션**
```bash
npm run db:generate
npm run db:migrate
```

6. **개발 서버 시작**
```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

### 📦 NPM 스크립트

```bash
# 개발
npm run dev              # 개발 서버 시작
npm run build            # 프로덕션 빌드
npm start               # 프로덕션 서버 시작

# 데이터베이스
npm run db:generate      # Prisma Client 생성
npm run db:migrate       # 마이그레이션 실행
npm run db:studio        # Prisma Studio (GUI)
npm run db:reset         # 데이터베이스 초기화 (주의!)

# Docker
npm run docker:dev       # 개발용 DB 시작
npm run docker:dev:down  # 개발용 DB 중지
npm run docker:prod      # 프로덕션 배포
npm run docker:prod:down # 프로덕션 중지
```

## 🔐 인증 API 엔드포인트

| 엔드포인트 | 메서드 | 설명 | 인증 필요 |
|-----------|--------|------|----------|
| `/api/auth/register` | POST | 회원가입 | ❌ |
| `/api/auth/login` | POST | 로그인 | ❌ |
| `/api/auth/logout` | POST | 로그아웃 | ✅ |
| `/api/auth/me` | GET | 현재 사용자 정보 | ✅ |
| `/api/auth/profile` | PUT | 프로필 업데이트 | ✅ |
| `/api/auth/change-password` | POST | 비밀번호 변경 | ✅ |
| `/api/auth/forgot-password` | POST | 비밀번호 찾기 | ❌ |
| `/api/auth/reset-password` | POST | 비밀번호 재설정 | ❌ |
| `/api/auth/verify-email` | GET | 이메일 인증 | ❌ |

**API 사용 예시는 [DEVELOPMENT.md](DEVELOPMENT.md#-api-테스트) 참조**

## 🐳 프로덕션 배포

### Vultr 서버 초기 설정

**상세한 보안 가이드는 [SECURITY.md](SECURITY.md) 참조**

1. **서버 접속**
```bash
ssh root@YOUR_SERVER_IP
```

2. **필수 패키지 설치**
```bash
apt update && apt upgrade -y
apt install -y docker.io docker-compose git ufw fail2ban nginx certbot python3-certbot-nginx
systemctl enable docker
systemctl start docker
```

3. **방화벽 설정 (중요!)**
```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

4. **프로젝트 클론**
```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/siholee/radiant.git
cd radiant
```

5. **환경변수 설정**
```bash
cp .env.example .env
nano .env  # 프로덕션 값으로 편집

# 강력한 비밀번호 생성
openssl rand -base64 24  # PostgreSQL
openssl rand -base64 24  # Redis  
openssl rand -hex 32     # Session Secret
openssl rand -hex 32     # JWT Secret
```

6. **Nginx 설정**
```bash
cp nginx.conf /etc/nginx/sites-available/yurasis.com
ln -s /etc/nginx/sites-available/yurasis.com /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default  # 기본 사이트 제거
nginx -t && systemctl restart nginx
```

7. **SSL 인증서 발급**
```bash
certbot --nginx -d yurasis.com -d www.yurasis.com
```

8. **애플리케이션 시작**
```bash
docker compose up -d --build
```

9. **데이터베이스 마이그레이션**
```bash
docker exec -it radiant-app sh
npx prisma migrate deploy
npx prisma generate
exit

docker compose restart app
```

10. **배포 확인**
```bash
# 컨테이너 상태 확인
docker ps

# 로그 확인
docker logs radiant-app
docker logs radiant-postgres

# 외부 포트 스캔 (로컬에서 실행)
nmap -sV YOUR_SERVER_IP
# 22, 80, 443만 보여야 함 (3000, 5432, 6379 보이면 안됨!)
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
