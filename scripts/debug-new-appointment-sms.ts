import { PrismaClient } from '@prisma/client';
import { sendAppointmentSMS } from '../lib/calendar-sms';

const prisma = new PrismaClient();

async function debugNewAppointmentFlow() {
  console.log('🔍 Debugging New Appointment SMS Flow...\n');

  try {
    // Step 1: Check recent appointments created in the last hour
    const recentAppointments = await prisma.appointment.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      },
      include: {
        calendar: {
          include: {
            chatbots: {
              include: {
                twilioPhoneNumber: {
                  include: {
                    user: {
                      select: {
                        twilioSubaccountSid: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Found ${recentAppointments.length} appointments created in the last hour\n`);

    if (recentAppointments.length === 0) {
      console.log('❌ No recent appointments found. Create a new appointment and run this again.');
      return;
    }

    // Step 2: Analyze each recent appointment
    for (const appointment of recentAppointments) {
      console.log(`\n📅 Appointment: ${appointment.id}`);
      console.log(`   Client: ${appointment.clientName}`);
      console.log(`   Phone: ${appointment.clientPhoneNumber || 'NO PHONE'}`);
      console.log(`   Status: ${appointment.status}`);
      console.log(`   Created: ${appointment.createdAt.toISOString()}`);
      console.log(`   Source: ${appointment.source || 'Not specified'}`);
      
      // Check calendar SMS settings
      console.log(`\n   📋 Calendar: ${appointment.calendar.name}`);
      console.log(`   SMS Notifications Enabled: ${appointment.calendar.notificationSmsEnabled}`);
      console.log(`   SMS Reminders Enabled: ${appointment.calendar.smsReminderEnabled}`);
      console.log(`   Chatbots connected: ${appointment.calendar.chatbots.length}`);
      
      // Check chatbot phone numbers
      const chatbotsWithPhone = appointment.calendar.chatbots.filter(cb => cb.twilioPhoneNumber);
      console.log(`   Chatbots with phone numbers: ${chatbotsWithPhone.length}`);
      
      if (chatbotsWithPhone.length > 0) {
        const phoneNumber = chatbotsWithPhone[0].twilioPhoneNumber;
        console.log(`   Agent phone number: ${phoneNumber?.phoneNumber}`);
        console.log(`   Subaccount: ${phoneNumber?.user?.twilioSubaccountSid || 'Main account'}`);
      }

      // Step 3: Check if SMS should have been sent
      const shouldSendSMS = appointment.calendar.notificationSmsEnabled && 
                          appointment.clientPhoneNumber && 
                          chatbotsWithPhone.length > 0;
      
      console.log(`\n   🤔 Should SMS be sent? ${shouldSendSMS ? 'YES' : 'NO'}`);
      
      if (!shouldSendSMS) {
        if (!appointment.calendar.notificationSmsEnabled) {
          console.log('   ❌ SMS notifications are disabled for this calendar');
        }
        if (!appointment.clientPhoneNumber) {
          console.log('   ❌ No client phone number provided');
        }
        if (chatbotsWithPhone.length === 0) {
          console.log('   ❌ No chatbots with phone numbers assigned to calendar');
        }
      }

      // Step 4: Test SMS sending manually for this appointment
      if (shouldSendSMS) {
        console.log(`\n   📱 Testing SMS sending for appointment ${appointment.id}...`);
        try {
          const smsResult = await sendAppointmentSMS(appointment.id, 'confirmation');
          console.log(`   SMS Result: ${smsResult ? 'SUCCESS' : 'FAILED'}`);
        } catch (error) {
          console.log(`   SMS Error: ${error}`);
        }
      }

      console.log('\n' + '='.repeat(60));
    }

    // Step 5: Check for SMS logs in the messages table
    console.log('\n📨 Checking for SMS logs in messages table...');
    const smsMessages = await prisma.message.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        },
        message: {
          contains: 'SMS'
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Found ${smsMessages.length} SMS-related messages in the last hour:`);
    for (const msg of smsMessages) {
      console.log(`  - ${msg.createdAt.toISOString()}: ${msg.message}`);
    }

  } catch (error) {
    console.error('❌ Error during debug:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
if (require.main === module) {
  debugNewAppointmentFlow().catch(console.error);
}

export { debugNewAppointmentFlow }; 