import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  
  if (!email) {
    console.error('❌ Please provide an email address as an argument');
    console.log('Usage: npx tsx scripts/set-admin-user.ts user@example.com');
    process.exit(1);
  }
  
  console.log(`Setting ${email} as ADMIN...`);
  
  try {
    const user = await prisma.user.update({
      where: {
        email: email,
      },
      data: {
        role: 'ADMIN',
      },
    });
    
    console.log(`✅ Successfully set ${user.email} (${user.name}) as ADMIN`);
    
    // Show current admin users
    const adminUsers = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
      },
      select: {
        email: true,
        name: true,
      },
    });
    
    console.log('\n👥 Current admin users:');
    adminUsers.forEach(admin => {
      console.log(`   - ${admin.email} (${admin.name || 'No name'})`);
    });
    
  } catch (error: any) {
    if (error.code === 'P2025') {
      console.error(`❌ No user found with email: ${email}`);
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 