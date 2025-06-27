import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Starting user roles migration...');
  
  try {
    // Get admin emails from environment variable
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').filter(email => email.trim());
    
    if (adminEmails.length === 0) {
      console.warn('⚠️  No ADMIN_EMAILS found in environment variables');
      console.warn('⚠️  To set admin users, add ADMIN_EMAILS=email1@example.com,email2@example.com to your .env file');
    } else {
      console.log(`📧 Found ${adminEmails.length} admin emails to process`);
      
      // Update users with admin emails to have ADMIN role
      for (const email of adminEmails) {
        const trimmedEmail = email.trim();
        try {
          const result = await prisma.user.updateMany({
            where: {
              email: trimmedEmail,
            },
            data: {
              role: 'ADMIN',
            },
          });
          
          if (result.count > 0) {
            console.log(`✅ Set user with email ${trimmedEmail} as ADMIN`);
          } else {
            console.log(`⚠️  No user found with email ${trimmedEmail}`);
          }
        } catch (error) {
          console.error(`❌ Error updating user ${trimmedEmail}:`, error);
        }
      }
    }
    
    // Get statistics
    const stats = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true,
      },
    });
    
    console.log('\n📊 User role statistics:');
    stats.forEach(stat => {
      console.log(`   ${stat.role}: ${stat._count.role} users`);
    });
    
    // Show total users
    const totalUsers = await prisma.user.count();
    console.log(`   Total: ${totalUsers} users`);
    
    console.log('\n✅ User roles migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
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