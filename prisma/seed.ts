import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ADMIN 계정 생성
  const adminEmail = 'admin@yurasis.com';
  const adminPassword = await bcrypt.hash('Admin@2026!Secure', 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: 'ADMIN',
    },
    create: {
      email: adminEmail,
      name: 'System Administrator',
      password: adminPassword,
      role: 'ADMIN',
      emailVerified: true,
    },
  });

  console.log('✅ ADMIN 계정 생성/업데이트 완료');
  console.log(`   이메일: ${admin.email}`);
  console.log(`   역할: ${admin.role}`);
  console.log('');
  console.log('🔐 초기 로그인 정보:');
  console.log(`   이메일: ${adminEmail}`);
  console.log(`   비밀번호: Admin@2026!Secure`);
  console.log('');
  console.log('⚠️  로그인 후 반드시 비밀번호를 변경하세요!');
}

main()
  .catch((e) => {
    console.error('❌ Seed 실행 중 오류:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
