import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  
  console.log(`\n📊 Total users: ${users.length}\n`);
  
  users.forEach(user => {
    console.log(`${user.email} - ${user.name || 'No name'} - Created: ${user.createdAt.toLocaleDateString()}`);
  });
  
  // Check if role field exists
  const userWithRole = await prisma.user.findFirst();
  if (userWithRole && 'role' in userWithRole) {
    console.log('\n✅ Role field exists in database');
  } else {
    console.log('\n❌ Role field not found in database');
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