import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Testing auth role field...\n');
  
  // Check admin user
  const adminUser = await prisma.user.findFirst({
    where: { email: 'hello@getlinkai.com' },
    select: { 
      id: true, 
      email: true, 
      name: true, 
      role: true 
    }
  });
  
  if (adminUser) {
    console.log('✅ Admin user found:');
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Name: ${adminUser.name}`);
    console.log(`   Role: ${adminUser.role || 'NOT SET'}`);
  } else {
    console.log('❌ Admin user not found');
  }
  
  // Check all users with roles
  const usersWithRoles = await prisma.user.findMany({
    where: {
      role: {
        not: null
      }
    },
    select: {
      email: true,
      role: true
    }
  });
  
  console.log('\n📊 Users with roles:');
  usersWithRoles.forEach(user => {
    console.log(`   ${user.email} - Role: ${user.role}`);
  });
  
  // Check if TypeScript recognizes the role field
  const testUser = await prisma.user.findFirst();
  if (testUser) {
    console.log('\n✅ TypeScript type test:');
    console.log(`   Role field exists: ${'role' in testUser}`);
    console.log(`   Role type: ${typeof testUser.role}`);
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 