# Blog Creator 로컬 테스트 가이드

## 🚀 빠른 시작

### 1. Docker Desktop 설치

**Homebrew로 설치 (권장):**
```bash
brew install --cask docker
```

**또는 직접 다운로드:**
https://www.docker.com/products/docker-desktop

설치 후 Docker Desktop 앱을 실행하세요.

### 2. 자동 설정 스크립트 실행

```bash
./test-setup.sh
```

이 스크립트는 자동으로:
- ✅ Docker 설치 확인
- ✅ 환경변수 파일 생성 (.env)
- ✅ PostgreSQL & Redis 컨테이너 시작
- ✅ Prisma 마이그레이션 실행
- ✅ Prisma Client 생성

### 3. OpenAI API 키 설정 (필수)

Blog Creator 기능을 사용하려면 OpenAI API 키가 필요합니다:

```bash
# .env 파일 편집
vi .env

# 아래 라인을 실제 키로 교체
OPENAI_API_KEY="sk-YOUR_OPENAI_API_KEY_HERE"
```

OpenAI API 키 발급: https://platform.openai.com/api-keys

### 4. 개발 서버 실행

```bash
npm run dev
```

서버가 http://localhost:3000 에서 실행됩니다.

---

## 📋 주요 명령어

### Docker 관리

```bash
# 컨테이너 시작
docker compose up -d

# 컨테이너 중지
docker compose down

# 로그 확인
docker compose logs -f

# 특정 서비스 로그만 보기
docker compose logs -f postgres
docker compose logs -f redis

# 컨테이너 상태 확인
docker compose ps

# 전체 삭제 (데이터 포함)
docker compose down -v
```

### Database 관리

```bash
# Prisma Studio 실행 (GUI)
npx prisma studio

# 마이그레이션 생성
npx prisma migrate dev --name migration_name

# Prisma Client 재생성
npx prisma generate

# Database 초기화 (⚠️ 모든 데이터 삭제)
npx prisma migrate reset
```

---

## 🧪 테스트

### API 테스트

#### 1. 회원가입
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!",
    "name": "테스트 유저"
  }'
```

#### 2. 로그인
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!"
  }'
```

#### 3. API Key 등록
```bash
# 먼저 로그인해서 토큰 받기
TOKEN="your_jwt_token_here"

curl -X POST http://localhost:3000/api/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "provider": "OPENAI",
    "apiKey": "sk-your-openai-key",
    "name": "My OpenAI Key"
  }'
```

#### 4. 블로그 생성 요청
```bash
curl -X POST http://localhost:3000/api/blog-generator \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "topic": "Next.js 15의 새로운 기능",
    "tone": "professional",
    "keywords": ["Next.js", "React", "SSR"],
    "targetLength": 1500
  }'
```

### GraphQL 테스트

GraphQL Playground: http://localhost:3000/api/graphql

```graphql
# API Keys 조회
query {
  myApiKeys {
    id
    provider
    name
    status
    usage {
      requestCount
      totalCost
      totalInputTokens
      totalOutputTokens
    }
  }
}

# 블로그 생성
mutation {
  startBlogGeneration(input: {
    topic: "TypeScript 타입 시스템"
    tone: "educational"
    keywords: ["TypeScript", "타입", "제네릭"]
    targetLength: 2000
  }) {
    id
    status
    topic
    createdAt
  }
}
```

---

## 🗄️ Database 접속

### PostgreSQL 접속

```bash
# Docker 컨테이너 접속
docker exec -it radiant-postgres-1 psql -U radiant -d radiant

# 또는 로컬에서 직접 접속
psql postgresql://radiant:radiant123@localhost:5432/radiant
```

### 주요 테이블 확인

```sql
-- 유저 목록
SELECT id, email, name, role FROM "User";

-- API Keys 목록
SELECT id, provider, status, "userId" FROM "UserApiKey";

-- 블로그 생성 작업 목록
SELECT id, topic, status, "userId", "createdAt" FROM "BlogGenerationJob";

-- Writing Profiles
SELECT id, name, description, "userId" FROM "WritingStyleProfile";
```

### Redis 접속

```bash
# Docker 컨테이너 접속
docker exec -it radiant-redis-1 redis-cli

# 인증 (비밀번호: redis123)
AUTH redis123

# Job Queue 확인
KEYS bull:blog-generation:*
LLEN bull:blog-generation:wait
```

---

## 🐛 트러블슈팅

### Docker가 실행되지 않음

```bash
# Docker Desktop이 실행 중인지 확인
docker info

# 실행 중이 아니면
open -a Docker
```

### Port 충돌

```bash
# 5432 포트를 사용 중인 프로세스 확인
lsof -i :5432

# 6379 포트를 사용 중인 프로세스 확인
lsof -i :6379

# 다른 포트로 변경하려면 docker-compose.yml 수정
```

### Prisma Client 에러

```bash
# Prisma Client 재생성
rm -rf node_modules/.prisma
npx prisma generate

# 마이그레이션 다시 실행
npx prisma migrate reset
```

### 환경변수가 로드되지 않음

```bash
# .env 파일 확인
cat .env

# Next.js 서버 재시작
pkill -f "next dev"
npm run dev
```

---

## 📚 추가 리소스

### Blog Creator 기능

1. **API Keys 관리**
   - 사용자별 OpenAI API 키 암호화 저장
   - 사용량 추적 (토큰, 비용)
   - Key 순환 (rotation)

2. **Writing Style Learning**
   - RAG 기반 문체 학습
   - pgvector를 사용한 유사도 검색
   - 사용자별 커스텀 프로필

3. **Blog Generation**
   - LangGraph 기반 워크플로우
   - BullMQ를 통한 비동기 처리
   - 진행상황 추적

4. **Web Scraping**
   - Jina Reader API (무료, 1M req/month)
   - Naver 블로그 전용 스크래퍼
   - WordPress API 지원

### 환경

- **Database**: PostgreSQL 16 + pgvector
- **Cache/Queue**: Redis 7
- **Encryption**: AES-256-GCM
- **Embeddings**: OpenAI text-embedding-3-small
- **LLM**: LangGraph workflow

---

## 🔒 보안 주의사항

1. **API Keys**
   - `.env` 파일을 절대 커밋하지 마세요
   - 프로덕션에서는 강력한 비밀번호 사용
   - 정기적으로 암호화 키 순환

2. **Database**
   - 기본 비밀번호는 개발 전용입니다
   - 프로덕션에서는 복잡한 비밀번호 설정

3. **Redis**
   - 기본 설정은 localhost만 허용
   - 프로덕션에서는 ACL 설정 필요

---

## 📞 문제 해결

문제가 발생하면:

1. Docker 로그 확인: `docker compose logs -f`
2. Next.js 로그 확인: 터미널 출력
3. Database 연결: `npx prisma studio`
4. 전체 재시작: `./test-setup.sh`

Happy coding! 🚀
