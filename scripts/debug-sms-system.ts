import { PrismaClient } from '@prisma/client';
import { sendAppointmentSMS } from '../lib/calendar-sms';
import { twilio } from '../lib/twilio';

const prisma = new PrismaClient();

interface DebugResult {
  step: string;
  success: boolean;
  data?: any;
  error?: string;
}

async function debugSMSSystem(): Promise<DebugResult[]> {
  const results: DebugResult[] = [];

  console.log('🔍 Starting SMS System Debug...\n');

  // Step 1: Check environment variables
  results.push({
    step: '1. Environment Variables',
    success: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    data: {
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? 'Set' : 'Missing',
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? 'Set' : 'Missing',
    }
  });

  // Step 2: Test Twilio client connection
  try {
    const account = await twilio.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    results.push({
      step: '2. Twilio Client Connection',
      success: true,
      data: { accountSid: account.sid, status: account.status }
    });
  } catch (error) {
    results.push({
      step: '2. Twilio Client Connection',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Step 3: Check database connections and relationships
  try {
    const calendarsWithChatbots = await prisma.calendar.findMany({
      include: {
        chatbots: {
          include: {
            twilioPhoneNumber: true
          }
        },
        appointments: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          },
          take: 5
        }
      }
    });

    results.push({
      step: '3. Database Relationships',
      success: true,
      data: {
        totalCalendars: calendarsWithChatbots.length,
        calendarsWithChatbots: calendarsWithChatbots.filter(c => c.chatbots.length > 0).length,
        calendarsWithPhoneNumbers: calendarsWithChatbots.filter(c => 
          c.chatbots.some(cb => cb.twilioPhoneNumber)
        ).length,
        recentAppointments: calendarsWithChatbots.reduce((acc, c) => acc + c.appointments.length, 0)
      }
    });

    // Step 4: Check specific calendar SMS settings
    for (const calendar of calendarsWithChatbots) {
      if (calendar.appointments.length > 0) {
        const chatbotsWithPhone = calendar.chatbots.filter(cb => cb.twilioPhoneNumber);
        
        results.push({
          step: `4. Calendar "${calendar.name}" SMS Configuration`,
          success: true,
          data: {
            calendarId: calendar.id,
            notificationSmsEnabled: calendar.notificationSmsEnabled,
            smsReminderEnabled: calendar.smsReminderEnabled,
            chatbotsCount: calendar.chatbots.length,
            chatbotsWithPhoneNumber: chatbotsWithPhone.length,
            phoneNumbers: chatbotsWithPhone.map(cb => ({
              chatbotName: cb.name,
              phoneNumber: cb.twilioPhoneNumber?.phoneNumber
            })),
            recentAppointments: calendar.appointments.length
          }
        });
      }
    }
  } catch (error) {
    results.push({
      step: '3. Database Relationships',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Step 5: Test a recent appointment SMS sending
  try {
    const recentAppointment = await prisma.appointment.findFirst({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        },
        clientPhoneNumber: {
          not: null
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

    if (recentAppointment) {
      console.log(`\n📅 Testing SMS for recent appointment: ${recentAppointment.id}`);
      console.log(`Client: ${recentAppointment.clientName}`);
      console.log(`Phone: ${recentAppointment.clientPhoneNumber}`);
      console.log(`Calendar SMS Enabled: ${recentAppointment.calendar.notificationSmsEnabled}`);
      
      const chatbotsWithPhone = recentAppointment.calendar.chatbots.filter(cb => cb.twilioPhoneNumber);
      console.log(`Chatbots with phone numbers: ${chatbotsWithPhone.length}`);
      
      if (chatbotsWithPhone.length > 0) {
        const phoneNumber = chatbotsWithPhone[0].twilioPhoneNumber;
        const subaccountSid = phoneNumber?.user?.twilioSubaccountSid;
        
        console.log(`From phone number: ${phoneNumber?.phoneNumber}`);
        console.log(`Subaccount SID: ${subaccountSid || 'None (using main account)'}`);
        
        // Test the SMS sending function
        const smsResult = await sendAppointmentSMS(recentAppointment.id, 'confirmation');
        
        results.push({
          step: '5. Test SMS Sending',
          success: smsResult,
          data: {
            appointmentId: recentAppointment.id,
            clientPhone: recentAppointment.clientPhoneNumber,
            fromPhone: phoneNumber?.phoneNumber,
            subaccountSid: subaccountSid,
            calendarSmsEnabled: recentAppointment.calendar.notificationSmsEnabled
          }
        });
      } else {
        results.push({
          step: '5. Test SMS Sending',
          success: false,
          error: 'No chatbots with phone numbers found for this appointment\'s calendar'
        });
      }
    } else {
      results.push({
        step: '5. Test SMS Sending',
        success: false,
        error: 'No recent appointments with phone numbers found to test'
      });
    }
  } catch (error) {
    results.push({
      step: '5. Test SMS Sending',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Step 6: Check Twilio phone number configurations
  try {
    const phoneNumbers = await prisma.twilioPhoneNumber.findMany({
      include: {
        chatbot: {
          include: {
            calendar: true
          }
        },
        user: {
          select: {
            twilioSubaccountSid: true
          }
        }
      }
    });

    for (const phoneNumber of phoneNumbers) {
      try {
        // Determine which Twilio client to use
        let twilioClient = twilio; // Default to main account
        const subaccountSid = phoneNumber.user?.twilioSubaccountSid;
        
        if (subaccountSid) {
          twilioClient = require('twilio')(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN,
            { accountSid: subaccountSid }
          );
        }
        
        // Check Twilio phone number configuration
        const twilioNumber = await twilioClient.incomingPhoneNumbers(phoneNumber.twilioSid).fetch();
        
        results.push({
          step: `6. Twilio Phone Number ${phoneNumber.phoneNumber}`,
          success: true,
          data: {
            phoneNumber: phoneNumber.phoneNumber,
            twilioSid: phoneNumber.twilioSid,
            status: phoneNumber.status,
            assignedToChatbot: !!phoneNumber.chatbotId,
            chatbotName: phoneNumber.chatbot?.name,
            calendarEnabled: phoneNumber.chatbot?.calendarEnabled,
            subaccountSid: subaccountSid,
            twilioSmsUrl: twilioNumber.smsUrl,
            twilioVoiceUrl: twilioNumber.voiceUrl
          }
        });
      } catch (twilioError) {
        results.push({
          step: `6. Twilio Phone Number ${phoneNumber.phoneNumber}`,
          success: false,
          error: twilioError instanceof Error ? twilioError.message : 'Unknown Twilio error'
        });
      }
    }
  } catch (error) {
    results.push({
      step: '6. Twilio Phone Numbers',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  return results;
}

// Main execution function
async function main() {
  try {
    const results = await debugSMSSystem();
    
    console.log('\n📊 DEBUG RESULTS SUMMARY\n');
    console.log('='.repeat(50));
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const result of results) {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.step}`);
      
      if (result.success) {
        successCount++;
        if (result.data) {
          console.log(`   Data:`, JSON.stringify(result.data, null, 2));
        }
      } else {
        failureCount++;
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
      }
      console.log('');
    }
    
    console.log('='.repeat(50));
    console.log(`📈 Summary: ${successCount} passed, ${failureCount} failed`);
    
    if (failureCount > 0) {
      console.log('\n🔧 RECOMMENDED FIXES:');
      
      // Analyze results and provide specific recommendations
      const failedSteps = results.filter(r => !r.success);
      
      for (const failed of failedSteps) {
        console.log(`\n• ${failed.step}:`);
        
        if (failed.step.includes('Environment Variables')) {
          console.log('  - Check that TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are set in your .env file');
          console.log('  - Verify the credentials are correct in your Twilio dashboard');
        }
        
        if (failed.step.includes('Twilio Client Connection')) {
          console.log('  - Verify Twilio credentials are correct');
          console.log('  - Check if your Twilio account is active and not suspended');
        }
        
        if (failed.step.includes('Database Relationships')) {
          console.log('  - Ensure calendars are properly connected to chatbots');
          console.log('  - Verify chatbots have phone numbers assigned');
        }
        
        if (failed.step.includes('SMS Sending')) {
          console.log('  - Check that notificationSmsEnabled is true in calendar settings');
          console.log('  - Ensure the chatbot has a valid phone number assigned');
          console.log('  - Verify the appointment has a valid client phone number');
        }
        
        if (failed.step.includes('Twilio Phone Number')) {
          console.log('  - Verify the phone number exists in Twilio');
          console.log('  - Check that SMS webhooks are properly configured');
          console.log('  - Ensure the phone number is assigned to a chatbot');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Debug script failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug script
if (require.main === module) {
  main().catch(console.error);
}

export { debugSMSSystem }; 