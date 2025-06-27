import { db } from '../lib/db';

async function testBlockUser() {
  try {
    // Find a test user (not admin)
    const testUser = await db.user.findFirst({
      where: { 
        role: 'USER',
        status: 'ACTIVE'
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        role: true
      }
    });

    if (!testUser) {
      console.log('No test user found to block');
      return;
    }

    console.log('Found test user:', testUser);

    // Block the user
    console.log('\n🔒 Blocking user...');
    const blockedUser = await db.user.update({
      where: { id: testUser.id },
      data: {
        status: 'BLOCKED',
        blockedAt: new Date(),
        blockedBy: 'test-script'
      },
      select: {
        id: true,
        email: true,
        status: true,
        blockedAt: true
      }
    });

    console.log('User blocked successfully:', blockedUser);

    // Delete active sessions
    console.log('\n🚫 Deleting active sessions...');
    const deletedSessions = await db.session.deleteMany({
      where: { userId: testUser.id }
    });

    console.log(`Deleted ${deletedSessions.count} active sessions`);

    // Wait a moment then unblock for testing
    console.log('\n⏳ Waiting 5 seconds before unblocking...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Unblock the user
    console.log('\n🔓 Unblocking user...');
    const unblockedUser = await db.user.update({
      where: { id: testUser.id },
      data: {
        status: 'ACTIVE',
        blockedAt: null,
        blockedBy: null
      },
      select: {
        id: true,
        email: true,
        status: true,
        blockedAt: true
      }
    });

    console.log('User unblocked successfully:', unblockedUser);
    console.log('\n✅ Block/unblock test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing block functionality:', error);
  } finally {
    await db.$disconnect();
  }
}

testBlockUser(); 