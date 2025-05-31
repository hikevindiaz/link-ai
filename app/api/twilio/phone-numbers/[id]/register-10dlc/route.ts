import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';
import twilio from 'twilio';

// Helper function to create or get Trust Hub profile
async function createOrGetTrustHubProfile(
  twilioClient: twilio.Twilio,
  user: any
): Promise<string | null> {
  try {
    // Check if user already has a Trust Hub profile ID stored
    const existingProfileId = (user as any).trustHubProfileSid;
    if (existingProfileId) {
      // Verify it still exists
      try {
        await twilioClient.trusthub.v1.customerProfiles(existingProfileId).fetch();
        return existingProfileId;
      } catch (error) {
        console.log('[10DLC] Existing Trust Hub profile not found, creating new one');
      }
    }

    // Create a new Primary Customer Profile
    const customerProfile = await twilioClient.trusthub.v1.customerProfiles.create({
      friendlyName: user.companyName || 'Business Profile',
      email: user.email,
      policySid: 'RNdfbf3fae0e1107f8aded0e7cead80bf5' // Primary Customer Profile policy
    });

    // Create End User entity
    const endUser = await twilioClient.trusthub.v1
      .customerProfiles(customerProfile.sid)
      .customerProfilesEntityAssignments.create({
        objectSid: await createEndUserEntity(twilioClient, user)
      });

    // Submit for review
    await twilioClient.trusthub.v1
      .customerProfiles(customerProfile.sid)
      .update({ status: 'pending-review' });

    // Store the profile ID for future use
    await prisma.user.update({
      where: { id: user.id },
      data: { trustHubProfileSid: customerProfile.sid } as any
    });

    return customerProfile.sid;
  } catch (error) {
    console.error('[10DLC] Error creating Trust Hub profile:', error);
    return null;
  }
}

// Helper function to create End User entity
async function createEndUserEntity(twilioClient: twilio.Twilio, user: any): Promise<string> {
  const endUser = await twilioClient.trusthub.v1.endUsers.create({
    friendlyName: user.companyName || 'Business',
    type: 'business',
    attributes: {
      business_name: user.companyName || 'Business',
      business_registration_number: user.businessRegistrationNumber || '',
      website_url: user.businessWebsite || '',
      business_regions_of_operation: ['US'],
      social_media_profile_urls: []
    }
  });
  
  return endUser.sid;
}

// Helper function to create or get A2P profile
async function createOrGetA2PProfile(
  twilioClient: twilio.Twilio,
  user: any,
  customerProfileSid: string
): Promise<string | null> {
  try {
    // Check if user already has an A2P profile
    const existingA2PProfileId = (user as any).a2pProfileBundleSid;
    if (existingA2PProfileId) {
      try {
        await twilioClient.trusthub.v1.trustProducts(existingA2PProfileId).fetch();
        return existingA2PProfileId;
      } catch (error) {
        console.log('[10DLC] Existing A2P profile not found, creating new one');
      }
    }

    // Create A2P Messaging Profile
    const a2pProfile = await twilioClient.trusthub.v1.trustProducts.create({
      friendlyName: `${user.companyName || 'Business'} A2P Profile`,
      email: user.email,
      policySid: 'RN2d12b1005c5e67d4e6a5916e6b50e5a85' // US A2P Brand policy
    });

    // Attach Customer Profile to A2P Profile
    await twilioClient.trusthub.v1
      .trustProducts(a2pProfile.sid)
      .trustProductsEntityAssignments.create({
        objectSid: customerProfileSid
      });

    // Create and attach supporting documents
    const supportingDoc = await twilioClient.trusthub.v1.supportingDocuments.create({
      friendlyName: 'Business Registration',
      type: 'business_registration',
      attributes: {
        business_name: user.companyName || 'Business',
        address_sids: []
      }
    });

    await twilioClient.trusthub.v1
      .trustProducts(a2pProfile.sid)
      .trustProductsEntityAssignments.create({
        objectSid: supportingDoc.sid
      });

    // Submit for review
    await twilioClient.trusthub.v1
      .trustProducts(a2pProfile.sid)
      .update({ status: 'pending-review' });

    // Store the A2P profile ID
    await prisma.user.update({
      where: { id: user.id },
      data: { a2pProfileBundleSid: a2pProfile.sid } as any
    });

    return a2pProfile.sid;
  } catch (error) {
    console.error('[10DLC] Error creating A2P profile:', error);
    return null;
  }
}

// Helper function to create or get brand registration
async function createOrGetBrandRegistration(
  twilioClient: twilio.Twilio,
  user: any,
  customerProfileSid: string,
  a2pProfileSid: string
): Promise<{ brandSid: string; brandStatus: string } | null> {
  try {
    // Check if phone number already has a brand SID
    const existingBrandSid = (user as any).a2pBrandSid;
    if (existingBrandSid) {
      try {
        const brand = await (twilioClient.messaging.v1 as any).a2p.brandRegistrations(existingBrandSid).fetch();
        console.log('[10DLC] Found existing brand:', brand.sid, 'Status:', brand.status);
        return { brandSid: brand.sid, brandStatus: brand.status };
      } catch (error) {
        console.log('[10DLC] Existing brand not found, creating new one');
      }
    }

    // Create brand registration
    console.log('[10DLC] Creating brand registration for:', user.companyName);
    
    const brandData = {
      customerProfileBundleSid: customerProfileSid,
      a2PProfileBundleSid: a2pProfileSid,
      brandType: user.companyType === 'sole_proprietor' ? 'SOLE_PROPRIETOR' : 'LOW_VOLUME_STANDARD',
      skipAutomaticSecVet: true // Skip secondary vetting for Low Volume Standard
    };

    console.log('[10DLC] Brand registration data:', brandData);
    
    const brand = await (twilioClient.messaging.v1 as any).a2p.brandRegistrations.create(brandData);

    console.log('[10DLC] Brand created:', brand.sid, 'Status:', brand.status);

    // Store brand SID in user record
    await prisma.user.update({
      where: { id: user.id },
      data: { a2pBrandSid: brand.sid } as any
    });

    return { brandSid: brand.sid, brandStatus: brand.status };
  } catch (error: any) {
    console.error('[10DLC] Error creating brand registration:', error);
    console.error('[10DLC] Error details:', error.response?.data || error.message);
    return null;
  }
}

// Helper function to create campaign
async function createCampaign(
  twilioClient: twilio.Twilio,
  brandSid: string,
  messagingServiceSid: string,
  phoneNumberId: string
): Promise<string | null> {
  try {
    console.log('[10DLC] Creating campaign for brand:', brandSid);
    
    // Campaign data for appointment reminders/notifications use case
    const campaign = await (twilioClient.messaging.v1 as any).a2p.usAppToPerson.create({
      brandRegistrationSid: brandSid,
      messagingServiceSid: messagingServiceSid,
      description: 'AI agent for appointment reminders and customer notifications',
      messageSamples: [
        'Hi [Name], this is a reminder about your appointment tomorrow at 2:00 PM. Reply CONFIRM to confirm or CANCEL to cancel.',
        'Your order #12345 has been shipped and will arrive by Friday. Track your package: [link]',
        'Hi [Name], thank you for your recent purchase! How was your experience? Reply 1-5 to rate.',
        'Reminder: Your subscription renews in 3 days. Visit [link] to manage your subscription.',
        'Your appointment has been confirmed for [Date] at [Time]. We\'ll send you a reminder the day before.'
      ],
      usAppToPersonUsecase: 'MIXED',
      hasEmbeddedLinks: true,
      hasEmbeddedPhone: false
    });

    console.log('[10DLC] Campaign created:', campaign.sid, 'Status:', campaign.campaignStatus);

    // Store campaign SID with phone number
    await prisma.twilioPhoneNumber.update({
      where: { id: phoneNumberId },
      data: {
        ...({ a2pCampaignSid: campaign.sid } as any)
      }
    });

    return campaign.sid;
  } catch (error: any) {
    console.error('[10DLC] Error creating campaign:', error);
    console.error('[10DLC] Error details:', error.response?.data || error.message);
    return null;
  }
}

// Helper function to create or get messaging service
async function createOrGetMessagingService(
  twilioClient: twilio.Twilio,
  phoneNumber: any
): Promise<string | null> {
  try {
    // Check if phone number already has a messaging service
    const existingServiceSid = (phoneNumber as any).messagingServiceSid;
    if (existingServiceSid) {
      try {
        await twilioClient.messaging.v1.services(existingServiceSid).fetch();
        return existingServiceSid;
      } catch (error) {
        console.log('[10DLC] Existing messaging service not found, creating new one');
      }
    }

    // Create a new messaging service
    const service = await twilioClient.messaging.v1.services.create({
      friendlyName: `Service for ${phoneNumber.phoneNumber}`,
      inboundRequestUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/webhook/sms`,
      inboundMethod: 'POST',
      usecase: 'mixed',
      stickySender: true
    });

    // Add phone number to messaging service
    await twilioClient.messaging.v1
      .services(service.sid)
      .phoneNumbers.create({
        phoneNumberSid: phoneNumber.twilioSid
      });

    // Update phone number record with messaging service SID
    await prisma.twilioPhoneNumber.update({
      where: { id: phoneNumber.id },
      data: { 
        ...({ messagingServiceSid: service.sid } as any)
      }
    });

    return service.sid;
  } catch (error) {
    console.error('[10DLC] Error creating messaging service:', error);
    return null;
  }
}

// POST /api/twilio/phone-numbers/[id]/register-10dlc - Submit 10DLC registration
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const phoneNumberId = params.id;
    
    // Get phone number and verify ownership
    const phoneNumber = await prisma.twilioPhoneNumber.findUnique({
      where: { id: phoneNumberId },
      include: { user: true }
    });

    if (!phoneNumber) {
      return NextResponse.json({ success: false, error: 'Phone number not found' }, { status: 404 });
    }

    if (phoneNumber.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Check if already registered
    const phoneNumberData = phoneNumber as any;
    const a2pStatus = phoneNumberData.a2pRegistrationStatus || 'not_started';
    if (a2pStatus === 'approved') {
      return NextResponse.json({ 
        success: false, 
        error: 'Phone number is already verified' 
      }, { status: 400 });
    }

    if (a2pStatus === 'pending') {
      return NextResponse.json({ 
        success: false, 
        error: 'Registration is already in progress' 
      }, { status: 400 });
    }

    // Verify user has required business information
    if (!phoneNumber.user.companyName || !phoneNumber.user.addressLine1 || 
        !phoneNumber.user.city || !phoneNumber.user.state || !phoneNumber.user.postalCode) {
      return NextResponse.json({ 
        success: false, 
        error: 'Please complete your business information before submitting verification' 
      }, { status: 400 });
    }

    try {
      // Create Twilio client
      let twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID as string,
        process.env.TWILIO_AUTH_TOKEN as string
      );
      
      // For subaccounts, we should use the parent account for 10DLC registration
      // The Campaign Registry requires registrations to be done at the parent account level
      
      console.log('[10DLC] Starting registration process for phone number:', phoneNumber.phoneNumber);
      
      // Update phone number status to pending
      await prisma.twilioPhoneNumber.update({
        where: { id: phoneNumberId },
        data: {
          ...({ a2pRegistrationStatus: 'pending' } as any),
          updatedAt: new Date()
        }
      });

      // Step 1: Create or get Trust Hub Customer Profile
      console.log('[10DLC] Step 1: Creating/getting Trust Hub profile');
      const customerProfileSid = await createOrGetTrustHubProfile(twilioClient, phoneNumber.user);
      
      if (!customerProfileSid) {
        throw new Error('Failed to create Trust Hub profile');
      }

      // Step 2: Create or get A2P Profile
      console.log('[10DLC] Step 2: Creating/getting A2P profile');
      const a2pProfileSid = await createOrGetA2PProfile(twilioClient, phoneNumber.user, customerProfileSid);
      
      if (!a2pProfileSid) {
        throw new Error('Failed to create A2P profile');
      }

      // Step 3: Create or get Brand Registration
      console.log('[10DLC] Step 3: Creating/getting brand registration');
      const brandResult = await createOrGetBrandRegistration(
        twilioClient, 
        phoneNumber.user,
        customerProfileSid,
        a2pProfileSid
      );
      
      if (!brandResult) {
        throw new Error('Failed to create brand registration');
      }

      // Store brand SID with phone number
      await prisma.twilioPhoneNumber.update({
        where: { id: phoneNumberId },
        data: {
          ...({ a2pBrandSid: brandResult.brandSid } as any),
          updatedAt: new Date()
        }
      });

      // Check if brand is approved before creating campaign
      if (brandResult.brandStatus !== 'APPROVED') {
        console.log('[10DLC] Brand is not yet approved. Status:', brandResult.brandStatus);
        
        // Set up webhook to monitor brand status
        // In production, you would set up Event Streams to monitor brand status changes
        
        return NextResponse.json({
          success: true,
          message: 'Brand registration submitted. You will be notified once it\'s approved and the campaign is created.',
          status: 'pending',
          brandStatus: brandResult.brandStatus,
          brandSid: brandResult.brandSid
        });
      }

      // Step 4: Create or get Messaging Service
      console.log('[10DLC] Step 4: Creating/getting messaging service');
      const messagingServiceSid = await createOrGetMessagingService(twilioClient, phoneNumber);
      
      if (!messagingServiceSid) {
        throw new Error('Failed to create messaging service');
      }

      // Step 5: Create Campaign (only if brand is approved)
      console.log('[10DLC] Step 5: Creating campaign');
      const campaignSid = await createCampaign(
        twilioClient,
        brandResult.brandSid,
        messagingServiceSid,
        phoneNumberId
      );

      if (!campaignSid) {
        throw new Error('Failed to create campaign');
      }

      // Update phone number status to approved
      await prisma.twilioPhoneNumber.update({
        where: { id: phoneNumberId },
        data: {
          ...({ 
            a2pRegistrationStatus: 'approved',
            a2pRegisteredAt: new Date(),
            a2pCampaignSid: campaignSid
          } as any),
          updatedAt: new Date()
        }
      });

      console.log('[10DLC] Registration completed successfully');

      return NextResponse.json({
        success: true,
        message: 'Phone number verification completed successfully!',
        status: 'approved',
        brandSid: brandResult.brandSid,
        campaignSid: campaignSid
      });

    } catch (twilioError: any) {
      console.error('[10DLC] Twilio error during registration:', twilioError);
      console.error('[10DLC] Error details:', twilioError.response?.data || twilioError.message);
      
      // Update status to requires_attention with error
      await prisma.twilioPhoneNumber.update({
        where: { id: phoneNumberId },
        data: {
          ...({ 
            a2pRegistrationStatus: 'requires_attention',
            a2pRegistrationError: twilioError.message || 'Registration failed'
          } as any),
          updatedAt: new Date()
        }
      });

      return NextResponse.json({ 
        success: false, 
        error: 'Failed to submit verification. Please try again.',
        details: twilioError.message
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[10DLC] Error in registration endpoint:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process registration request' 
    }, { status: 500 });
  }
}

// GET /api/twilio/phone-numbers/[id]/register-10dlc - Check registration status
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const phoneNumberId = params.id;
    
    // Get phone number and verify ownership
    const phoneNumber = await prisma.twilioPhoneNumber.findUnique({
      where: { id: phoneNumberId },
      include: { user: true }
    });

    if (!phoneNumber) {
      return NextResponse.json({ success: false, error: 'Phone number not found' }, { status: 404 });
    }

    if (phoneNumber.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const phoneNumberData = phoneNumber as any;

    // If we have a brand SID, check its current status
    if (phoneNumberData.a2pBrandSid) {
      try {
        const twilioClient = twilio(
          process.env.TWILIO_ACCOUNT_SID as string,
          process.env.TWILIO_AUTH_TOKEN as string
        );
        
        const brand = await (twilioClient.messaging.v1 as any).a2p
          .brandRegistrations(phoneNumberData.a2pBrandSid)
          .fetch();
        
        console.log('[10DLC] Current brand status:', brand.status);
        
        // Update local status if brand is now approved
        if (brand.status === 'APPROVED' && phoneNumberData.a2pRegistrationStatus === 'pending') {
          // Check if we need to create the campaign
          if (!phoneNumberData.a2pCampaignSid) {
            console.log('[10DLC] Brand approved, creating campaign');
            
            // Get or create messaging service
            const messagingServiceSid = await createOrGetMessagingService(twilioClient, phoneNumber);
            
            if (messagingServiceSid) {
              // Create campaign
              const campaignSid = await createCampaign(
                twilioClient,
                brand.sid,
                messagingServiceSid,
                phoneNumberId
              );
              
              if (campaignSid) {
                // Update status to approved
                await prisma.twilioPhoneNumber.update({
                  where: { id: phoneNumberId },
                  data: {
                    ...({
                      a2pRegistrationStatus: 'approved',
                      a2pRegisteredAt: new Date(),
                      a2pCampaignSid: campaignSid
                    } as any),
                    updatedAt: new Date()
                  }
                });
                
                phoneNumberData.a2pRegistrationStatus = 'approved';
                phoneNumberData.a2pCampaignSid = campaignSid;
              }
            }
          }
        }
      } catch (error) {
        console.error('[10DLC] Error checking brand status:', error);
      }
    }

    return NextResponse.json({
      success: true,
      registration: {
        status: phoneNumberData.a2pRegistrationStatus || 'not_started',
        error: phoneNumberData.a2pRegistrationError,
        registeredAt: phoneNumberData.a2pRegisteredAt,
        campaignSid: phoneNumberData.a2pCampaignSid,
        brandSid: phoneNumberData.a2pBrandSid
      }
    });

  } catch (error) {
    console.error('[10DLC] Error checking registration status:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to check registration status' 
    }, { status: 500 });
  }
} 