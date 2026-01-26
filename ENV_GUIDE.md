# 환경변수 파일 구조

## 📁 현재 구조

```
.env          ← Docker Compose + Prisma CLI 전용 (Git 제외)
.env.local    ← Next.js 개발 서버 전용 (Git 제외)
.env.example  ← 프로덕션 배포 템플릿 (Git 포함)
```

## 🔍 각 파일의 용도

### `.env` (Docker Compose + Prisma)
- Docker Compose가 자동으로 읽음
- Prisma CLI가 자동으로 읽음
- 데이터베이스 연결 정보, 비밀번호 등 포함
- **Git에서 제외됨** (.gitignore)

### `.env.local` (Next.js)
- Next.js 개발 서버(`npm run dev`)가 우선적으로 읽음
- OpenAI API 키 등 추가 설정 포함
- **Git에서 제외됨** (.gitignore)

### `.env.example` (템플릿)
- 프로덕션 배포 시 참고용 템플릿
- **Git에 포함됨** - 팀원과 공유

## ⚙️ 사용 시나리오

### 1. Docker 실행
```bash
docker compose up -d
```
→ `.env` 파일 사용

### 2. Prisma 마이그레이션
```bash
npx prisma migrate dev
```
→ `.env` 파일 사용

### 3. Next.js 개발 서버
```bash
npm run dev
```
→ `.env.local` 우선, 없으면 `.env` 사용

## 📝 초기 설정

### 1단계: Docker + DB 설정

`.env` 파일은 이미 생성되어 있습니다. 기본값:
- PostgreSQL 비밀번호: `radiant123`
- Redis 비밀번호: `redis123`

### 2단계: Next.js 설정

`.env.local` 파일에서 OpenAI API 키 설정:

```bash
vi .env.local
```

다음 값을 실제 키로 교체:
```
OPENAI_API_KEY="sk-YOUR_ACTUAL_KEY"
```

### 3단계: Docker 실행

```bash
docker compose up -d postgres redis
```

### 4단계: Database 마이그레이션

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5단계: 개발 서버 실행

```bash
npm run dev
```

## 🔒 보안 주의사항

### Git에서 제외되는 파일
- ✅ `.env`
- ✅ `.env.local`
- ✅ `.env*.local`

### Git에 포함되는 파일
- ✅ `.env.example` (실제 값 없는 템플릿)

**절대 실제 API 키나 비밀번호를 Git에 커밋하지 마세요!**

## 🐛 문제 해결

### "REDIS_PASSWORD is required" 에러

→ `.env` 파일이 없거나 REDIS_PASSWORD가 없음
→ 해결: 위 1단계 참고

### "DATABASE_URL not found" 에러

→ `.env` 파일에 DATABASE_URL이 없음
→ 해결: 위 문서의 `.env` 내용 참고

### Next.js에서 환경변수가 로드되지 않음

→ `.env.local` 파일 확인
→ 서버 재시작: `npm run dev`

## 📚 참고

- [QUICKSTART.md](QUICKSTART.md) - 빠른 시작 가이드
- [TEST_GUIDE.md](TEST_GUIDE.md) - API 테스트 가이드
- [Next.js 환경변수 문서](https://nextjs.org/docs/basic-features/environment-variables)
