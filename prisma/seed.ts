import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const prisma = new PrismaClient();

async function seedBadges() {
  console.log('🏅 Seeding badges...');
  
  const badges = [
    {
      name: 'First Green Step',
      description: 'First successful event check-in',
      pointThreshold: 0,
      iconUrl: '/badges/first-step.png',
    },
    {
      name: 'Green Beginner',
      description: 'Earned 100 points',
      pointThreshold: 100,
      iconUrl: '/badges/beginner.png',
    },
    {
      name: 'Eco Enthusiast',
      description: 'Earned 250 points',
      pointThreshold: 250,
      iconUrl: '/badges/enthusiast.png',
    },
    {
      name: 'Green Champion',
      description: 'Earned 500 points',
      pointThreshold: 500,
      iconUrl: '/badges/champion.png',
    },
  ];

  for (const badge of badges) {
    const existing = await prisma.badge.findUnique({
      where: { name: badge.name },
    });

    if (!existing) {
      await prisma.badge.create({
        data: badge,
      });
      console.log(`✅ Created badge: ${badge.name}`);
    } else {
      console.log(`⏭️  Badge already exists: ${badge.name}`);
    }
  }
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@greengrass.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminFullName = process.env.ADMIN_FULL_NAME || 'System Admin';

  // Seed badges first
  await seedBadges();

  // Kiểm tra đã có admin nào chưa
  const existingAdmin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN },
  });

  if (existingAdmin) {
    console.log(`Admin already exists: ${existingAdmin.email}`);
    return;
  }

  // Tạo admin account
  const hash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.create({
    data: {
      email: adminEmail,
      fullName: adminFullName,
      password: hash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  console.log(`✅ Admin created successfully:`);
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log(`   Role: ADMIN`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
