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

const FounderWelcomeEmail = (props: { name?: string | null; theme?: 'light' | 'dark' }) => {
  const { name, theme = 'light' } = props;
  const userName = name || 'there';
  
  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Preview>Kevin sent you a direct message: Your Link AI journey starts here 🚀</Preview>
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
              {/* Welcome Heading */}
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
                  Welcome to Link AI, {userName}! 👋
                </Text>
                <Text className="text-[16px] text-neutral-600 leading-[1.6] mb-[16px]">
                  Hi {userName},
                </Text>
                <Text className="text-[16px] text-neutral-600 leading-[1.6] mb-[16px]">
                  I'm Kevin Díaz, the founder of Link AI, and I wanted to personally welcome you to our platform. Thank you for trusting us to help transform how your business connects with customers.
                </Text>
                <Text className="text-[16px] text-neutral-600 leading-[1.6] mb-[16px]">
                  Our team has worked incredibly hard to create something special - agents that are not only fast and accurate but sound genuinely human. I'm excited for you to experience what we've built.
                </Text>
              </Section>

              {/* Recommendations Section */}
              <Section className="mb-[32px] bg-neutral-50 p-[24px] rounded-[8px]">
                <Text style={{ 
                  fontSize: '20px', 
                  fontWeight: 'bold', 
                  color: '#1f2937', 
                  marginBottom: '20px', 
                  margin: '0 0 20px 0',
                  lineHeight: '1.3'
                }}>
                  My recommendations to get started:
                </Text>
                
                <Text className="text-[16px] text-neutral-700 mb-[16px] leading-[1.6]">
                  <strong>1. Create a test agent first</strong> 🧪
                </Text>
                <Text className="text-[14px] text-neutral-600 mb-[20px] leading-[1.6] pl-[16px]">
                  Before doing a full integration, I highly recommend creating a test agent and interacting with it. We've put countless hours into making our agents as fast, accurate, and human-sounding as possible. You'll be amazed at how natural the conversations feel.
                </Text>

                <Text className="text-[16px] text-neutral-700 mb-[16px] leading-[1.6]">
                  <strong>2. Try our custom voice creator</strong> 🎤
                </Text>
                <Text className="text-[14px] text-neutral-600 mb-[20px] leading-[1.6] pl-[16px]">
                  One of my favorite features is our voice creator. You can create unique voices that match your brand perfectly. For example, you could create a Puerto Rican woman with a strong Puerto Rican accent who speaks very upbeat - the possibilities are endless!
                </Text>

                <Text className="text-[16px] text-neutral-700 mb-[16px] leading-[1.6]">
                  <strong>3. Follow us on Instagram</strong> 📱
                </Text>
                <Text className="text-[14px] text-neutral-600 mb-[16px] leading-[1.6] pl-[16px]">
                  We'll be posting tutorials constantly on 
                  <Link 
                    href="https://www.instagram.com/getlinkai/" 
                    className="text-blue-600 no-underline ml-[4px] mr-[4px]"
                  >
                    @getlinkai
                  </Link>
                  to help you unlock all of your agent's capabilities. Trust me, there's so much more than meets the eye!
                </Text>
              </Section>

              {/* Call-to-Action */}
              <Section className="text-center mb-[32px]">
                <Button
                  href="https://dashboard.getlinkai.com/dashboard"
                  className="bg-black text-white px-[32px] py-[16px] rounded-[8px] text-[16px] font-semibold no-underline inline-block mb-[16px] box-border hover:bg-neutral-800"
                >
                  Start Building Your Agent
                </Button>
                <Text className="text-[14px] text-neutral-500 mb-[24px]">
                  Your intelligent first contact agent awaits
                </Text>
              </Section>

              {/* Closing Message */}
              <Section className="mb-[32px]">
                <Text className="text-[16px] text-neutral-600 leading-[1.6] mb-[16px]">
                  I'm genuinely excited to see what you'll create with Link AI. If you have any questions or feedback, don't hesitate to reach out. We're here to support you every step of the way.
                </Text>
                <Text className="text-[16px] text-neutral-600 leading-[1.6] mb-[16px]">
                  Welcome to the future of customer interactions!
                </Text>
                <Text className="text-[16px] text-neutral-700 leading-[1.6] font-semibold">
                  Best regards,<br />
                  Kevin Díaz<br />
                  <span className="text-[14px] text-neutral-500 font-normal">Founder, Link AI</span>
                </Text>
              </Section>

              {/* Footer */}
              <Section className="border-t border-neutral-200 pt-[24px]">
                <Text className="text-[14px] text-neutral-500 text-center mb-[16px]">
                  Want to customize your experience? 
                  <Link 
                    href="https://dashboard.getlinkai.com/dashboard/settings" 
                    className="text-blue-600 no-underline ml-[4px]"
                  >
                    Manage your communication preferences
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

FounderWelcomeEmail.PreviewProps = {
  name: 'Alex',
  theme: 'light',
};

export default FounderWelcomeEmail;