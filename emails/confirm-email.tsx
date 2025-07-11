import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from '@react-email/components';

const EmailConfirmationEmail = (props: { confirmationCode?: string; theme?: 'light' | 'dark' }) => {
  const { confirmationCode = '123456', theme = 'light' } = props;
  
  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Preview>Your Link AI confirmation code: {confirmationCode}</Preview>
        <Body className="bg-neutral-100 font-sans py-[40px]">
          <Container className="bg-white rounded-[8px] shadow-lg max-w-[600px] mx-auto overflow-hidden">
            {/* Top Frame with Light Logo */}
            <Section className="bg-black w-full py-[12px] text-center">
              <Img
                src="https://ugnyocjdcpdlneirkfiq.supabase.co/storage/v1/object/public/brand-assets/logos/link-ai-logo-light.png"
                alt="Link AI"
                className="w-full h-auto object-cover max-w-[60px] mx-auto"
              />
            </Section>

            {/* Main Content */}
            <Section className="p-[40px]">
              {/* Confirmation Heading */}
              <Section className="mb-[32px]">
                <Text style={{ 
                  fontSize: '32px', 
                  fontWeight: 'bold', 
                  color: '#1f2937', 
                  textAlign: 'center', 
                  marginBottom: '24px', 
                  margin: '0 0 24px 0',
                  lineHeight: '1.2'
                }}>
                  Confirm Your Email ✉️
                </Text>
                <Text className="text-[16px] text-neutral-600 leading-[1.6] mb-[16px]">
                  Thanks for signing up! We're excited to have you on board and can't wait for you to start building intelligent agents that transform customer interactions.
                </Text>
                <Text className="text-[16px] text-neutral-600 leading-[1.6] mb-[16px]">
                  For your security and to complete your account setup, please verify your email address using the confirmation code below.
                </Text>
              </Section>

              {/* Confirmation Code */}
              <Section className="text-center mb-[32px]">
                <Text className="text-[16px] text-neutral-700 mb-[16px] font-semibold">
                  Your confirmation code:
                </Text>
                <Section className="bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-[8px] py-[24px] px-[32px] mb-[16px]">
                  <Text className="text-[36px] font-bold text-neutral-900 text-center m-0 letter-spacing-[8px] font-mono">
                    {confirmationCode}
                  </Text>
                </Section>
                <Text className="text-[14px] text-neutral-500 mb-[24px]">
                  This code will expire in 10 minutes for security
                </Text>
              </Section>

              {/* Instructions Section */}
              <Section className="mb-[32px] bg-blue-50 p-[24px] rounded-[8px] border-l-4 border-blue-400">
                <Text style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: '#1e3a8a', 
                  marginBottom: '16px', 
                  margin: '0 0 16px 0',
                  lineHeight: '1.3'
                }}>
                  📋 How to use this code:
                </Text>
                <Text className="text-[14px] text-blue-800 leading-[1.6] mb-[8px]">
                  1. Return to the Link AI verification screen
                </Text>
                <Text className="text-[14px] text-blue-800 leading-[1.6] mb-[8px]">
                  2. Copy and paste the 6-digit code above
                </Text>
                <Text className="text-[14px] text-blue-800 leading-[1.6] mb-[16px]">
                  3. Click "Verify Email" to complete your setup
                </Text>
              </Section>

              {/* Features Preview */}
              <Section className="mb-[32px]">
                <Text className="text-[16px] text-neutral-600 leading-[1.6] mb-[16px]">
                  Once your email is confirmed, you'll have full access to:
                </Text>
                <Text className="text-[14px] text-neutral-600 leading-[1.6] mb-[8px] pl-[16px]">
                  • Create and customize intelligent agents
                </Text>
                <Text className="text-[14px] text-neutral-600 leading-[1.6] mb-[8px] pl-[16px]">
                  • Access our custom voice creator
                </Text>
                <Text className="text-[14px] text-neutral-600 leading-[1.6] mb-[8px] pl-[16px]">
                  • Integrate agents with your existing systems
                </Text>
                <Text className="text-[14px] text-neutral-600 leading-[1.6] mb-[16px] pl-[16px]">
                  • Monitor performance and analytics
                </Text>
              </Section>

              {/* Security Notice */}
              <Section className="mb-[32px] border-l-4 border-yellow-400 pl-[16px] bg-yellow-50 py-[16px] pr-[16px] rounded-r-[4px]">
                <Text className="text-[14px] text-neutral-700 leading-[1.6] mb-[8px] font-semibold">
                  🔒 Security Notice
                </Text>
                <Text className="text-[14px] text-neutral-600 leading-[1.6]">
                  If you didn't create a Link AI account, you can safely ignore this email. Never share this confirmation code with anyone else.
                </Text>
              </Section>

              {/* Closing Message */}
              <Section className="mb-[32px]">
                <Text className="text-[16px] text-neutral-600 leading-[1.6] mb-[16px]">
                  We're here to help you every step of the way. If you have any questions or need assistance, don't hesitate to reach out to our support team.
                </Text>
                <Text className="text-[16px] text-neutral-700 leading-[1.6] font-semibold">
                  Welcome to Link AI!<br />
                  <span className="text-[14px] text-neutral-500 font-normal">The Link AI Team</span>
                </Text>
              </Section>

              {/* Footer */}
              <Section className="border-t border-neutral-200 pt-[24px]">
                <Text className="text-[14px] text-neutral-500 text-center mb-[16px]">
                  Need help? 
                  <Link 
                    href="https://support.getlinkai.com" 
                    className="text-blue-600 no-underline ml-[4px]"
                  >
                    Contact our support team
                  </Link>
                </Text>
                <Section className="text-center mb-[16px]">
                  <Img
                    src="https://ugnyocjdcpdlneirkfiq.supabase.co/storage/v1/object/public/brand-assets/logos/link-ai-icon-dark.png"
                    alt="Link AI Icon"
                    className="w-full h-auto object-cover max-w-[20px] mx-auto"
                  />
                </Section>
                <Text className="text-[12px] text-neutral-400 text-center mb-[8px] m-0">
                  Link AI - A service from EVERMEDIA CORP.
                </Text>
                <Text className="text-[12px] text-neutral-400 text-center mb-[8px] m-0">
                  PO BOX 1964, Guayama, PR, 00785
                </Text>
                <Text className="text-[12px] text-neutral-400 text-center m-0">
                  © 2025 EVERMEDIA CORP. All rights reserved.
                </Text>
              </Section>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

EmailConfirmationEmail.PreviewProps = {
  confirmationCode: '847293',
  theme: 'light',
};

export default EmailConfirmationEmail; 