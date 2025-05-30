const twilio = require('twilio');

// Initialize Twilio client using subaccount
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const subaccountClient = twilio(
  process.env.TWILIO_SUBACCOUNT_SID,
  process.env.TWILIO_SUBACCOUNT_AUTH_TOKEN
);

async function cleanupPhoneNumber() {
  try {
    console.log('Checking phone numbers in Twilio subaccount...');
    
    // List all phone numbers in the subaccount
    const phoneNumbers = await subaccountClient.incomingPhoneNumbers.list();
    
    console.log(`Found ${phoneNumbers.length} phone numbers:`);
    phoneNumbers.forEach(pn => {
      console.log(`- ${pn.phoneNumber} (SID: ${pn.sid})`);
    });
    
    // Look for the specific phone number +17875923650
    const targetNumber = '+17875923650';
    const targetPhoneNumber = phoneNumbers.find(pn => pn.phoneNumber === targetNumber);
    
    if (targetPhoneNumber) {
      console.log(`\nFound target phone number ${targetNumber} with SID: ${targetPhoneNumber.sid}`);
      console.log('Deleting from Twilio...');
      
      await subaccountClient.incomingPhoneNumbers(targetPhoneNumber.sid).remove();
      console.log('✓ Successfully deleted phone number from Twilio');
    } else {
      console.log(`\nPhone number ${targetNumber} not found in Twilio subaccount`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

cleanupPhoneNumber(); 