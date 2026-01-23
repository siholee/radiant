# 🚀 Local Development Guide

## Quick Start (로컬 개발 환경 설정)

### 1. Prerequisites (필수 사항)
- Node.js 20+ 설치
- PostgreSQL 설치 (또는 Docker)
- Git

### 2. 프로젝트 클론
```bash
git clone https://github.com/siholee/radiant.git
cd radiant
```

### 3. 의존성 설치
```bash
npm install
```

### 4. 데이터베이스 설정

#### 옵션 A: Docker 사용 (권장)
```bash
# Docker가 설치되어 있다면
docker compose -f docker-compose.dev.yml up -d

# 컨테이너 상태 확인
docker ps
# radiant-postgres-dev와 radiant-redis-dev가 실행 중이어야 함
```

#### 옵션 B: 로컬 PostgreSQL 사용
```bash
# PostgreSQL 설치 (macOS)
brew install postgresql@16
brew services start postgresql@16

# 데이터베이스 생성
createdb radiant_dev
```

### 5. 환경변수 설정
```bash
# .env.local 파일 생성
cp .env.local.example .env.local

# .env.local 파일 편집
nano .env.local
```

**로컬 개발용 .env.local 예시:**
```env
# Docker를 사용하는 경우
DATABASE_URL="postgresql://radiant:devpassword123@localhost:5432/radiant_dev?schema=public"
REDIS_URL="redis://:devredis123@localhost:6379"

# 로컬 PostgreSQL을 사용하는 경우
# DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/radiant_dev?schema=public"

# 세션 시크릿 (개발용 - 프로덕션에서는 변경!)
SESSION_SECRET="dev-session-secret-change-this-in-production-32chars"
JWT_SECRET="dev-jwt-secret-change-this-in-production-32-chars"
JWT_EXPIRES_IN="7d"

# 이메일 (선택사항 - 없으면 콘솔에 출력)
RESEND_API_KEY=""

# API URLs
NEXT_PUBLIC_GRAPHQL_ENDPOINT="http://localhost:3000/api/graphql"
NEXT_PUBLIC_API_URL="http://localhost:3000/api"

NODE_ENV="development"
```

### 6. Prisma 마이그레이션 실행
```bash
# Prisma Client 생성
npx prisma generate

# 데이터베이스 마이그레이션
npx prisma migrate dev --name init

# Prisma Studio로 데이터 확인 (선택사항)
npx prisma studio
# http://localhost:5555 에서 데이터베이스 GUI 제공
```

### 7. 개발 서버 시작
```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

---

## 📁 프로젝트 구조

```
radiant/
├── prisma/
│   ├── schema.prisma          # 데이터베이스 스키마
│   └── migrations/            # 마이그레이션 히스토리
├── src/
│   ├── app/
│   │   ├── [lang]/            # 다국어 라우팅
│   │   │   ├── login/         # 로그인 페이지
│   │   │   ├── register/      # 회원가입 페이지
│   │   │   ├── forgot-password/
│   │   │   └── reset-password/
│   │   └── api/
│   │       └── auth/          # 인증 API 엔드포인트
│   │           ├── login/
│   │           ├── register/
│   │           ├── logout/
│   │           ├── me/        # 현재 사용자 정보
│   │           ├── profile/   # 프로필 업데이트
│   │           ├── change-password/
│   │           ├── forgot-password/
│   │           ├── reset-password/
│   │           └── verify-email/
│   ├── lib/
│   │   ├── auth/              # 인증 라이브러리
│   │   │   ├── session.ts     # 세션 관리
│   │   │   ├── validation.ts  # 입력 검증
│   │   │   ├── rate-limit.ts  # Rate limiting
│   │   │   ├── audit.ts       # 감사 로그
│   │   │   └── tokens.ts      # 토큰 관리
│   │   ├── prisma.ts          # Prisma 클라이언트
│   │   └── email/
│   │       └── send.ts        # 이메일 발송
│   └── components/            # React 컴포넌트
├── docker-compose.yml         # 프로덕션용
├── docker-compose.dev.yml     # 로컬 개발용
├── .env.example               # 프로덕션 환경변수 예시
└── .env.local.example         # 로컬 환경변수 예시
```

---

## 🔐 인증 시스템 기능

### 구현된 기능
✅ 회원가입 (이메일 인증 포함)  
✅ 로그인 (세션 기반)  
✅ 로그아웃  
✅ 비밀번호 찾기/재설정  
✅ 이메일 인증  
✅ 프로필 업데이트  
✅ 비밀번호 변경  
✅ Rate Limiting (DDoS 방어)  
✅ 계정 잠금 (브루트포스 방어)  
✅ 감사 로그 (보안 이벤트 기록)  
✅ 다국어 지원 (한국어/영어)  

### 보안 기능
- ✅ **비밀번호 해싱**: bcrypt (12 rounds)
- ✅ **세션 관리**: iron-session (암호화된 쿠키)
- ✅ **입력 검증**: Zod 스키마
- ✅ **비밀번호 강도 체크**: 8자 이상, 대소문자/숫자/특수문자 포함
- ✅ **Rate Limiting**: 엔드포인트별 요청 제한
- ✅ **계정 잠금**: 5회 로그인 실패 시 1시간 잠금
- ✅ **감사 로그**: 모든 보안 이벤트 기록
- ✅ **이메일 인증**: 보안 토큰 기반
- ✅ **CSRF 방어**: SameSite 쿠키

---

## 🧪 API 테스트

### 회원가입
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

### 로그인
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }' \
  -c cookies.txt  # 쿠키 저장
```

### 현재 사용자 정보
```bash
curl http://localhost:3000/api/auth/me \
  -b cookies.txt  # 저장된 쿠키 사용
```

### 프로필 업데이트
```bash
curl -X PUT http://localhost:3000/api/auth/profile \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "Updated Name"
  }'
```

### 비밀번호 변경
```bash
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "currentPassword": "SecurePass123!",
    "newPassword": "NewSecurePass456!"
  }'
```

### 로그아웃
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

---

## 🗄️ 데이터베이스 관리

### Prisma Studio (GUI)
```bash
# 데이터베이스 GUI 실행
npx prisma studio
```
브라우저에서 http://localhost:5555 접속하여 데이터 확인/수정

### 마이그레이션 생성
```bash
# 스키마 변경 후 마이그레이션 생성
npx prisma migrate dev --name add_new_field

# 프로덕션 배포 시 마이그레이션 적용
npx prisma migrate deploy
```

### 데이터베이스 초기화 (주의!)
```bash
# 모든 데이터 삭제하고 재생성
npx prisma migrate reset
```

### 시드 데이터 추가 (선택사항)
```bash
# prisma/seed.ts 파일 생성 후
npx prisma db seed
```

---

## 🔧 개발 워크플로우

### 1. 기능 개발
```bash
# 새 브랜치 생성
git checkout -b feature/new-feature

# 코드 작성 및 테스트
npm run dev

# 타입 체크
npm run build
```

### 2. 데이터베이스 변경
```bash
# 1. prisma/schema.prisma 수정
# 2. 마이그레이션 생성
npx prisma migrate dev --name describe_change

# 3. Prisma Client 재생성
npx prisma generate
```

### 3. 커밋 및 푸시
```bash
git add .
git commit -m "feat: Add new feature"
git push origin feature/new-feature
```

### 4. 프로덕션 배포
```bash
# main 브랜치에 머지 후
git checkout main
git pull origin main
git push origin main

# 서버에서 자동 배포 또는 수동 배포
```

---

## 🐛 디버깅

### 로그 확인
```bash
# 개발 서버 로그는 터미널에 출력됨
# 추가 로그를 보려면:
DEBUG=* npm run dev
```

### 데이터베이스 연결 확인
```bash
# PostgreSQL 연결 테스트
psql -U radiant -d radiant_dev -h localhost -p 5432

# Docker 컨테이너 로그
docker logs radiant-postgres-dev
docker logs radiant-redis-dev
```

### Prisma 디버그
```bash
# Prisma 쿼리 로그 출력
# .env.local에 추가:
# DATABASE_URL="postgresql://...?schema=public&connection_limit=10&pool_timeout=10"
```

---

## 📦 빌드 및 배포

### 로컬 프로덕션 빌드 테스트
```bash
# 프로덕션 빌드
npm run build

# 프로덕션 모드로 시작
npm start
```

### Docker 빌드 (로컬 테스트)
```bash
# 프로덕션 이미지 빌드
docker build -t radiant:latest .

# 실행
docker compose up -d
```

---

## ⚠️ 주의사항

1. **`.env.local`은 절대 커밋하지 마세요**
   - `.gitignore`에 이미 포함되어 있음

2. **개발용 비밀번호는 프로덕션에서 절대 사용 금지**
   - `devpassword123`, `devredis123` 등

3. **Prisma 마이그레이션은 항상 버전 관리**
   - `prisma/migrations/` 폴더를 Git에 커밋

4. **이메일 기능 테스트 시**
   - RESEND_API_KEY 없으면 콘솔에 이메일 내용 출력됨
   - 무료 계정: https://resend.com

---

## 🆘 문제 해결

### "DATABASE_URL not found" 에러
```bash
# .env.local 파일이 있는지 확인
ls -la .env.local

# 없으면 생성
cp .env.local.example .env.local
```

### "Port 5432 already in use" 에러
```bash
# 기존 PostgreSQL 프로세스 종료
brew services stop postgresql

# 또는 다른 포트 사용
# docker-compose.dev.yml에서 포트 변경: "5433:5432"
```

### Prisma Client 에러
```bash
# Prisma Client 재생성
npx prisma generate

# 캐시 삭제
rm -rf node_modules/.prisma
npm install
```

---

## 📚 추가 리소스

- [Next.js 문서](https://nextjs.org/docs)
- [Prisma 문서](https://www.prisma.io/docs)
- [iron-session 문서](https://github.com/vvo/iron-session)
- [Zod 문서](https://zod.dev)
- [Resend 문서](https://resend.com/docs)

---

**Happy Coding! 🎉**
