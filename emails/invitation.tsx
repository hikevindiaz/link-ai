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

interface InvitationEmailProps {
  invitedByName?: string;
  invitedByEmail?: string;
  role?: string;
  inviteUrl?: string;
  expiresAt?: Date;
}

const InvitationEmail = (props: InvitationEmailProps) => {
  const {
    invitedByName = 'Admin',
    invitedByEmail = '',
    role = 'User',
    inviteUrl = '',
    expiresAt = new Date(),
  } = props;
  
  const expiryDate = expiresAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const roleDescription = role === 'ADMIN' 
    ? 'full administrative access to manage users and system settings'
    : 'access to create and manage agents';
  
  return (
    <Html lang="en" dir="ltr">
      <Tailwind>
        <Head />
        <Preview>You've been invited to join Link AI - Accept your invitation</Preview>
        <Body className="bg-gray-100 font-sans py-[40px]">
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
                  You're invited to joinLink AI! 🎉
                </Text>
                <Text className="text-[16px] text-gray-600 leading-[1.6] mb-[16px]">
                  Hi there,
                </Text>
                <Text className="text-[16px] text-gray-600 leading-[1.6] mb-[16px]">
                  <strong>{invitedByName}</strong> {invitedByEmail && `(${invitedByEmail})`} has invited you to join Link AI with {roleDescription}.
                </Text>
                <Text className="text-[16px] text-gray-600 leading-[1.6] mb-[16px]">
                  Link AI helps businesses transform how they connect with customers through intelligent agents that sound genuinely human. You'll have access to our powerful platform to create, manage, and deploy AI agents.
                </Text>
              </Section>

              {/* Role Information */}
              <Section className="mb-[32px] bg-indigo-50 p-[24px] rounded-[8px]">
                <Text style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: '#1f2937', 
                  marginBottom: '16px', 
                  margin: '0 0 16px 0',
                  lineHeight: '1.3'
                }}>
                  Your Role: {role === 'ADMIN' ? 'Administrator' : 'User'}
                </Text>
                <Text className="text-[14px] text-gray-700 leading-[1.6]">
                  {role === 'ADMIN' 
                    ? 'As an administrator, you\'ll have full access to manage users, create agents, access all workspace features, and configure system settings.'
                    : 'As a user, you\'ll be able to create and manage your own AI agents, upload knowledge sources, and access all core platform features.'
                  }
                </Text>
              </Section>

              {/* Call-to-Action */}
              <Section className="text-center mb-[32px]">
                <Button
                  href={inviteUrl}
                  className="bg-indigo-600 text-white px-[32px] py-[16px] rounded-[8px] text-[16px] font-semibold no-underline inline-block mb-[16px] box-border hover:bg-indigo-700"
                >
                  Accept Invitation
                </Button>
                <Text className="text-[14px] text-gray-500 mb-[16px]">
                  This invitation expires on {expiryDate}
                </Text>
                <Text className="text-[12px] text-gray-400 leading-[1.4]">
                  Can't click the button? Copy and paste this link into your browser:<br />
                  <Link href={inviteUrl} className="text-indigo-600 break-all">
                    {inviteUrl}
                  </Link>
                </Text>
              </Section>

              {/* What to Expect */}
              <Section className="mb-[32px] bg-gray-50 p-[24px] rounded-[8px]">
                <Text style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: '#1f2937', 
                  marginBottom: '16px', 
                  margin: '0 0 16px 0',
                  lineHeight: '1.3'
                }}>
                  What happens next?
                </Text>
                
                <Text className="text-[14px] text-gray-700 mb-[12px] leading-[1.6]">
                  <strong>1. Accept this invitation</strong> - Click the button above to get started
                </Text>
                
                <Text className="text-[14px] text-gray-700 mb-[12px] leading-[1.6]">
                  <strong>2. Complete your profile</strong> - Set up your account with basic information
                </Text>

                <Text className="text-[14px] text-gray-700 mb-[12px] leading-[1.6]">
                  <strong>3. Explore Link AI</strong> - Start creating your first AI agent
                </Text>

                <Text className="text-[14px] text-gray-700 leading-[1.6]">
                  <strong>4. Follow us on Instagram</strong> - Get tips and tutorials at{' '}
                  <Link 
                    href="https://www.instagram.com/getlinkai/" 
                    className="text-indigo-600 no-underline"
                  >
                    @getlinkai
                  </Link>
                </Text>
              </Section>

              {/* Closing Message */}
              <Section className="mb-[32px]">
                <Text className="text-[16px] text-gray-600 leading-[1.6] mb-[16px]">
                  We're excited to have you join the Link AI community. If you have any questions, don't hesitate to reach out to our support team.
                </Text>
                <Text className="text-[16px] text-gray-600 leading-[1.6] mb-[16px]">
                  Welcome to the future of AI for business!
                </Text>
                <Text className="text-[16px] text-gray-700 leading-[1.6] font-semibold">
                  Best regards,<br />
                  The Link AI Team<br />
                  <span className="text-[14px] text-gray-500 font-normal">Link AI</span>
                </Text>
              </Section>

              {/* Footer */}
              <Section className="border-t border-gray-200 pt-[24px]">
                <Text className="text-[14px] text-gray-500 text-center mb-[16px]">
                  Didn't expect this invitation?{' '}
                  <Link 
                    href="mailto:support@getlinkai.com" 
                    className="text-indigo-600 no-underline"
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
                <Text className="text-[12px] text-gray-400 text-center mb-[8px] m-0">
                  Link AI - A service from EVERMEDIA CORP.
                </Text>
                <Text className="text-[12px] text-gray-400 text-center mb-[8px] m-0">
                  PO BOX 1964, Guayama, PR, 00785
                </Text>
                <Text className="text-[12px] text-gray-400 text-center m-0">
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

InvitationEmail.PreviewProps = {
  invitedByName: 'Kevin Díaz',
  invitedByEmail: 'kevin@getlinkai.com',
  role: 'USER',
  inviteUrl: 'https://dashboard.getlinkai.com/login?invite=abc123',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
};

export default InvitationEmail; 