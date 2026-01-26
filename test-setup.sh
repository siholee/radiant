#!/bin/bash

# Blog Creator 로컬 테스트 환경 설정 스크립트

set -e

echo "🚀 Blog Creator 로컬 테스트 환경 설정"
echo "======================================"

# 1. Docker 확인
echo "1️⃣  Docker 설치 확인..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker가 설치되어 있지 않습니다."
    echo "   다음 방법으로 설치하세요:"
    echo "   - Homebrew: brew install --cask docker"
    echo "   - 직접 다운로드: https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌ Docker가 실행되고 있지 않습니다."
    echo "   Docker Desktop을 실행한 후 다시 시도하세요."
    exit 1
fi

echo "✅ Docker 확인 완료"

# 2. 환경변수 파일 생성
echo ""
echo "2️⃣  환경변수 파일 확인..."
if [ ! -f .env.local ]; then
    echo "❌ .env.local 파일이 없습니다."
    echo "   다음 명령어로 생성하세요:"
    echo "   cp .env.local.template .env.local"
    echo "   vi .env.local  # OpenAI API 키 등 실제 값으로 수정"
    exit 1
fi

# OpenAI API 키 확인
if ! grep -q "sk-" .env.local; then
    echo "⚠️  OpenAI API 키가 설정되지 않았습니다."
    echo "   .env.local에서 OPENAI_API_KEY를 설정하세요."
    echo "   https://platform.openai.com/api-keys"
fi

# Encryption 키 생성 확인
if grep -q "dev-encryption-key" .env.local; then
    echo "⚠️  Encryption 키가 기본값입니다. 보안을 위해 새로 생성하세요:"
    echo "   openssl rand -hex 32"
fi

echo "✅ 환경변수 파일 확인 완료"

# 3. Docker Compose 실행
echo ""
echo "3️⃣  Docker 컨테이너 시작..."
docker compose up -d

echo ""
echo "⏳ PostgreSQL과 Redis가 시작될 때까지 10초 대기..."
sleep 10

# 4. Prisma 마이그레이션
echo ""
echo "4️⃣  Prisma 마이그레이션 실행..."
npx prisma migrate dev --name add_blog_creator

# 5. Prisma Client 생성
echo ""
echo "5️⃣  Prisma Client 재생성..."
npx prisma generate

# 6. 상태 확인
echo ""
echo "6️⃣  컨테이너 상태 확인..."
docker compose ps

echo ""
echo "✅ 설정 완료!"
echo ""
echo "======================================"
echo "📝 다음 단계:"
echo "======================================"
echo "1. OpenAI API 키 설정 (필수):"
echo "   vi .env.local  # OPENAI_API_KEY 수정"
echo ""
echo "2. 보안 키 생성 (권장):"
echo "   openssl rand -hex 32  # ENCRYPTION_KEY_V1 교체"
echo ""
echo "3. 개발 서버 실행:"
echo "   npm run dev"
echo ""
echo "3. 테스트 실행:"
echo "   npm test"
echo ""
echo "4. Docker 로그 확인:"
echo "   docker compose logs -f"
echo ""
echo "5. Docker 중지:"
echo "   docker compose down"
echo ""
echo "6. 전체 삭제 (데이터 포함):"
echo "   docker compose down -v"
echo "======================================"
