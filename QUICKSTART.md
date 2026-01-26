# 🚀 빠른 시작 가이드

## 환경변수 파일 구조

```
.env.example      # 프로덕션 템플릿 (Git 포함) ✅
.env.local        # 로컬 개발용 실제 파일 (Git 제외) ✅ 이 파일 사용!
```

## 1단계: 필수 설정 (5분)

### OpenAI API 키 설정 (필수)

```bash
# .env.local 파일 열기
vi .env.local

# 또는
code .env.local
```

아래 줄을 찾아서 실제 키로 교체:
```bash
OPENAI_API_KEY="sk-YOUR_OPENAI_API_KEY_HERE"
```

👉 키 발급: https://platform.openai.com/api-keys

### 보안 키 생성 (권장)

```bash
# 암호화 키 생성
openssl rand -hex 32

# .env.local에서 ENCRYPTION_KEY_V1 값을 위 결과로 교체
```

## 2단계: Docker 실행

```bash
# PostgreSQL + Redis 시작
docker compose up -d

# 10초 정도 대기 (컨테이너 초기화)
```

## 3단계: Database 설정

```bash
# Prisma 마이그레이션 실행
npx prisma migrate dev --name init

# Prisma Client 생성
npx prisma generate
```

## 4단계: 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 접속!

---

## 🧪 빠른 테스트

### 1. 회원가입

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "Test1234!",
    "name": "테스트유저"
  }'
```

### 2. 로그인

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "Test1234!"
  }'
```

응답에서 `accessToken` 복사

### 3. API Key 등록

```bash
TOKEN="여기에_위에서_받은_토큰_붙여넣기"

curl -X POST http://localhost:3000/api/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "provider": "OPENAI",
    "apiKey": "sk-your-actual-openai-key",
    "name": "My OpenAI Key"
  }'
```

### 4. 블로그 생성 요청

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

---

## 📊 데이터 확인

### Prisma Studio (GUI)

```bash
npx prisma studio
```

http://localhost:5555 에서 GUI로 데이터 확인

### PostgreSQL 직접 접속

```bash
docker exec -it radiant-postgres-1 psql -U radiant -d radiant

# 유저 목록
SELECT id, email, name, role FROM "User";

# API Keys
SELECT id, provider, status FROM "UserApiKey";

# 블로그 생성 작업
SELECT id, topic, status FROM "BlogGenerationJob";
```

### Redis 확인

```bash
docker exec -it radiant-redis-1 redis-cli
AUTH redis123

# Job Queue 확인
KEYS bull:blog-generation:*
```

---

## 🔧 유용한 명령어

```bash
# Docker 로그 확인
docker compose logs -f

# Docker 중지
docker compose down

# Docker 완전 삭제 (데이터 포함)
docker compose down -v

# Prisma 스키마 변경 후
npx prisma migrate dev --name your_change_name
npx prisma generate

# TypeScript 타입 에러 확인
npm run build
```

---

## ❓ 문제 해결

### "Cannot connect to database"

```bash
# Docker 컨테이너 상태 확인
docker compose ps

# 재시작
docker compose restart postgres
```

### "Prisma Client 에러"

```bash
# Prisma Client 재생성
rm -rf node_modules/.prisma
npx prisma generate
```

### "Port already in use"

```bash
# 포트 사용 중인 프로세스 확인
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :3000  # Next.js

# 프로세스 종료 (PID 확인 후)
kill -9 <PID>
```

---

## 📚 더 알아보기

- [TEST_GUIDE.md](TEST_GUIDE.md) - 상세한 API 테스트 가이드
- [DEVELOPMENT.md](DEVELOPMENT.md) - 개발 가이드
- [DEPLOYMENT.md](DEPLOYMENT.md) - 배포 가이드
