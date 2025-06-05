import prisma from '../lib/prisma';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

async function updatePhoneSubaccountToken() {
  console.log('📱 Update Phone Number with Subaccount Auth Token\n');
  
  try {
    // List all phone numbers
    const phoneNumbers = await prisma.twilioPhoneNumber.findMany({
      include: { 
        chatbot: true,
        user: true
      }
    });
    
    if (phoneNumbers.length === 0) {
      console.log('No phone numbers found in database.');
      return;
    }
    
    console.log('Available phone numbers:');
    phoneNumbers.forEach((phone, index) => {
      console.log(`${index + 1}. ${phone.phoneNumber}`);
      console.log(`   Owner: ${phone.user.email}`);
      console.log(`   Agent: ${phone.chatbot?.name || 'Not assigned'}`);
      console.log(`   Has Subaccount Token: ${phone.subaccountAuthToken ? 'Yes' : 'No'}`);
      console.log('');
    });
    
    const phoneIndex = await question('\nEnter the number (1, 2, etc) of the phone to update: ');
    const selectedPhone = phoneNumbers[parseInt(phoneIndex) - 1];
    
    if (!selectedPhone) {
      console.log('Invalid selection.');
      return;
    }
    
    console.log(`\nSelected: ${selectedPhone.phoneNumber}`);
    console.log('\n📋 To get the subaccount auth token:');
    console.log('1. Log into Twilio Console');
    console.log('2. Switch to the subaccount that owns this phone number');
    console.log('3. Go to Account → API keys & tokens');
    console.log('4. Copy the Auth Token\n');
    
    const authToken = await question('Enter the subaccount auth token: ');
    const subaccountSid = await question('Enter the subaccount SID (optional, press Enter to skip): ');
    
    // Update the phone number
    const updated = await prisma.twilioPhoneNumber.update({
      where: { id: selectedPhone.id },
      data: {
        subaccountAuthToken: authToken,
        ...(subaccountSid && { subaccountSid })
      }
    });
    
    console.log('\n✅ Phone number updated successfully!');
    console.log(`   Phone: ${updated.phoneNumber}`);
    console.log(`   Subaccount Token: ${authToken.substring(0, 10)}...`);
    if (subaccountSid) {
      console.log(`   Subaccount SID: ${subaccountSid}`);
    }
    
    console.log('\n🎉 Your phone calls should now work with proper signature validation!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

// Run the script
updatePhoneSubaccountToken(); 