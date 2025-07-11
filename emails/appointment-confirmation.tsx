import React from "react";
import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Text,
    Tailwind,
    Section,
    Link,
    Hr,
    Img,
    Row,
    Column,
} from "@react-email/components";
import { siteConfig } from "@/config/site";

// Hosted logo URLs from Supabase
const LOGO_URLS = {
    darkLogo: "https://ugnyocjdcpdlneirkfiq.supabase.co/storage/v1/object/public/brand-assets/logos/link-ai-logo-dark.png",
    lightLogo: "https://ugnyocjdcpdlneirkfiq.supabase.co/storage/v1/object/public/brand-assets/logos/link-ai-logo-light.png",
    darkIcon: "https://ugnyocjdcpdlneirkfiq.supabase.co/storage/v1/object/public/brand-assets/logos/link-ai-icon-dark.png",
    lightIcon: "https://ugnyocjdcpdlneirkfiq.supabase.co/storage/v1/object/public/brand-assets/logos/link-ai-icon-light.png",
};

interface AppointmentConfirmationEmailProps {
    appointmentTitle: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentDateTime?: string; // ISO string for calendar link generation
    appointmentLocation?: string;
    appointmentNotes?: string;
    clientName: string;
    clientEmail: string;
    clientPhoneNumber?: string;
    businessName?: string;
    businessWebsite?: string;
    calendarOwnerName?: string;
    calendarOwnerEmail?: string;
    chatbotName?: string;
    bookedOn?: string;
    reminderDate?: string;
    isDarkMode?: boolean;
}

export default function AppointmentConfirmationEmail({
    appointmentTitle,
    appointmentDate,
    appointmentTime,
    appointmentDateTime,
    appointmentLocation,
    appointmentNotes,
    clientName,
    clientEmail,
    clientPhoneNumber,
    businessName,
    businessWebsite,
    calendarOwnerName,
    calendarOwnerEmail,
    chatbotName,
    bookedOn,
    reminderDate,
    isDarkMode = false,
}: AppointmentConfirmationEmailProps) {
    const previewText = `Booking Confirmed - ${appointmentTitle}`;
    // Use light logo for dark header frame, dark logo for white sections
    const headerLogoUrl = LOGO_URLS.lightLogo; // Always light for dark header
    const footerIconUrl = LOGO_URLS.lightIcon; // Light icon for black footer background
    
    // Generate booking ID (you might want to pass this as a prop instead)
    const bookingId = `LK-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    
    // Format dates
    const currentDate = new Date();
    const bookingCreatedOn = bookedOn || currentDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
    
    const reminderDateTime = reminderDate || new Date(new Date(appointmentDate).getTime() - 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    // Create Google Calendar link
    const createCalendarLink = () => {
        let appointmentStart: Date;
        
        if (appointmentDateTime) {
            // Use the provided ISO string
            appointmentStart = new Date(appointmentDateTime);
        } else {
            // Fallback: parse the appointment date and time
            appointmentStart = new Date(`${appointmentDate} ${appointmentTime}`);
        }
        
        const appointmentEnd = new Date(appointmentStart.getTime() + 60 * 60 * 1000); // Add 1 hour
        
        const startTime = appointmentStart.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const endTime = appointmentEnd.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        
        const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: appointmentTitle,
            dates: `${startTime}/${endTime}`,
            details: `Appointment with ${businessName || calendarOwnerName}\n\n${appointmentNotes ? `Notes: ${appointmentNotes}\n\n` : ''}Booking ID: ${bookingId}\n\nThis appointment was scheduled through Link AI.`,
            location: appointmentLocation || '',
            sf: 'true',
            output: 'xml'
        });
        
        return `https://calendar.google.com/calendar/render?${params.toString()}`;
    };

    return (
        <Html lang="en" dir="ltr">
            <Tailwind>
                <Head />
                <Preview>{previewText}</Preview>
                <Body className="bg-neutral-100 font-sans py-[40px]">
                    <Container className="bg-black mx-auto rounded-[8px] max-w-[600px] overflow-hidden border border-neutral-800">
                        {/* Top Powered By Frame */}
                        <Section className="bg-black text-center py-[8px] px-[20px] border-b border-neutral-800">
                            <Text className="text-[12px] text-white m-0">
                                Powered by{' '}
                                <Link
                                    href={siteConfig.url}
                                    className="text-white no-underline font-semibold"
                                >
                                    <Img
                                        src={headerLogoUrl}
                                        width="60"
                                        height="20"
                                        alt="Link AI"
                                        className="inline-block align-middle ml-1"
                                    />
                                </Link>
                            </Text>
                        </Section>

                        {/* Header with White Background */}
                        <Section className="bg-white text-center py-[40px] px-[40px]">
                            <Text className="text-[14px] font-medium text-neutral-600 mb-[8px] m-0">
                                {businessName || calendarOwnerName || "Your Business"}
                            </Text>
                            <Heading className="text-[32px] font-bold text-black mb-[16px] m-0">
                                Appointment Confirmed
                            </Heading>
                            <Text className="text-[18px] text-neutral-700 font-semibold m-0">
                                ✅ All set! Your booking is confirmed
                            </Text>
                        </Section>

                        {/* Main Content with Black Background */}
                        <Section className="bg-black px-[40px] py-[40px]">
                            {/* Booking ID */}
                            <Section className="bg-neutral-900 p-[24px] rounded-[8px] mb-[32px] border border-neutral-800">
                                <Text className="text-[16px] text-white mb-[8px] m-0">
                                    <strong>Booking ID:</strong> {bookingId}
                                </Text>
                                <Text className="text-[14px] text-neutral-400 m-0">
                                    Please save this ID for future reference
                                </Text>
                            </Section>

                            {/* Timeline Section */}
                            <Section className="mb-[32px]">
                                <Heading className="text-[20px] font-bold text-white mb-[24px] m-0">
                                    Booking Timeline
                                </Heading>
                                
                                {/* Timeline Item 1 - Booking Confirmed */}
                                <Row className="mb-[24px]">
                                    <Column className="w-[40px]">
                                        <div className="w-[24px] h-[24px] bg-green-500 rounded-full flex items-center justify-center">
                                            <Text className="text-[12px] text-white font-bold m-0">✓</Text>
                                        </div>
                                    </Column>
                                    <Column className="pl-[16px]">
                                        <Text className="text-[16px] font-bold text-white mb-[4px] m-0">
                                            Appointment Confirmed
                                        </Text>
                                        <Text className="text-[14px] text-neutral-400 mb-[4px] m-0">
                                            {bookingCreatedOn}
                                        </Text>
                                        <Text className="text-[12px] text-green-400 m-0">
                                            ✅ Completed
                                        </Text>
                                    </Column>
                                </Row>

                                {/* Timeline Connector */}
                                <Row className="mb-[24px]">
                                    <Column className="w-[40px]">
                                        <div className="w-[2px] h-[32px] bg-neutral-700 ml-[11px]"></div>
                                    </Column>
                                    <Column></Column>
                                </Row>

                                {/* Timeline Item 2 - Reminder */}
                                <Row className="mb-[24px]">
                                    <Column className="w-[40px]">
                                        <div className="w-[24px] h-[24px] bg-blue-500 rounded-full flex items-center justify-center">
                                            <Text className="text-[12px] text-white font-bold m-0">🔔</Text>
                                        </div>
                                    </Column>
                                    <Column className="pl-[16px]">
                                        <Text className="text-[16px] font-bold text-white mb-[4px] m-0">
                                            Appointment Reminder
                                        </Text>
                                        <Text className="text-[14px] text-neutral-400 mb-[4px] m-0">
                                            {reminderDateTime}
                                        </Text>
                                        <Text className="text-[12px] text-blue-400 m-0">
                                            📧 Email reminder will be sent
                                        </Text>
                                    </Column>
                                </Row>

                                {/* Timeline Connector */}
                                <Row className="mb-[24px]">
                                    <Column className="w-[40px]">
                                        <div className="w-[2px] h-[32px] bg-neutral-700 ml-[11px]"></div>
                                    </Column>
                                    <Column></Column>
                                </Row>

                                {/* Timeline Item 3 - Appointment */}
                                <Row>
                                    <Column className="w-[40px]">
                                        <div className="w-[24px] h-[24px] bg-neutral-500 rounded-full flex items-center justify-center">
                                            <Text className="text-[12px] text-white font-bold m-0">📅</Text>
                                        </div>
                                    </Column>
                                    <Column className="pl-[16px]">
                                        <Text className="text-[16px] font-bold text-white mb-[4px] m-0">
                                            Your Appointment
                                        </Text>
                                        <Text className="text-[14px] text-neutral-400 mb-[4px] m-0">
                                            {appointmentDate} at {appointmentTime}
                                        </Text>
                                        {appointmentLocation && (
                                            <Text className="text-[12px] text-neutral-400 m-0">
                                                📍 {appointmentLocation}
                                            </Text>
                                        )}
                                    </Column>
                                </Row>
                            </Section>

                            {/* Appointment Details */}
                            <Section className="mb-[32px]">
                                <Heading className="text-[20px] font-bold text-white mb-[16px] m-0">
                                    Appointment Details
                                </Heading>
                                
                                <Row className="mb-[12px]">
                                    <Column>
                                        <Text className="text-[14px] text-neutral-400 m-0 font-semibold">Service:</Text>
                                    </Column>
                                    <Column>
                                        <Text className="text-[14px] text-white m-0">{appointmentTitle}</Text>
                                    </Column>
                                </Row>

                                <Row className="mb-[12px]">
                                    <Column>
                                        <Text className="text-[14px] text-neutral-400 m-0 font-semibold">Date & Time:</Text>
                                    </Column>
                                    <Column>
                                        <Text className="text-[14px] text-white m-0">{appointmentDate} at {appointmentTime}</Text>
                                    </Column>
                                </Row>

                                {/* AI Agent row moved here */}
                                {chatbotName && (
                                    <Row className="mb-[12px]">
                                        <Column>
                                            <Text className="text-[14px] text-neutral-400 m-0 font-semibold">AI Agent:</Text>
                                        </Column>
                                        <Column>
                                            <Text className="text-[14px] text-white m-0">{chatbotName}</Text>
                                        </Column>
                                    </Row>
                                )}

                                {appointmentLocation && (
                                    <Row className="mb-[12px]">
                                        <Column>
                                            <Text className="text-[14px] text-neutral-400 m-0 font-semibold">Location:</Text>
                                        </Column>
                                        <Column>
                                            <Text className="text-[14px] text-white m-0">{appointmentLocation}</Text>
                                        </Column>
                                    </Row>
                                )}

                                {appointmentNotes && (
                                    <Row>
                                        <Column>
                                            <Text className="text-[14px] text-neutral-400 m-0 font-semibold">Notes:</Text>
                                        </Column>
                                        <Column>
                                            <Text className="text-[14px] text-white m-0">{appointmentNotes}</Text>
                                        </Column>
                                    </Row>
                                )}
                            </Section>

                            {/* Customer Information */}
                            <Section className="mb-[32px]">
                                <Heading className="text-[20px] font-bold text-white mb-[16px] m-0">
                                    Customer Information
                                </Heading>
                                
                                <Row className="mb-[12px]">
                                    <Column>
                                        <Text className="text-[14px] text-neutral-400 m-0 font-semibold">Name:</Text>
                                    </Column>
                                    <Column>
                                        <Text className="text-[14px] text-white m-0">{clientName}</Text>
                                    </Column>
                                </Row>

                                <Row className="mb-[12px]">
                                    <Column>
                                        <Text className="text-[14px] text-neutral-400 m-0 font-semibold">Email:</Text>
                                    </Column>
                                    <Column>
                                        <Text className="text-[14px] text-white m-0">{clientEmail}</Text>
                                    </Column>
                                </Row>

                                {clientPhoneNumber && (
                                    <Row>
                                        <Column>
                                            <Text className="text-[14px] text-neutral-400 m-0 font-semibold">Phone:</Text>
                                        </Column>
                                        <Column>
                                            <Text className="text-[14px] text-white m-0">{clientPhoneNumber}</Text>
                                        </Column>
                                    </Row>
                                )}
                            </Section>

                            {/* Add to Calendar Button */}
                            <Section className="text-center mb-[32px]">
                                <Heading className="text-[18px] font-bold text-white mb-[16px] m-0">
                                    Add to Your Calendar
                                </Heading>
                                
                                <Button
                                    href={createCalendarLink()}
                                    className="bg-neutral-600 hover:bg-neutral-700 text-white px-[32px] py-[16px] rounded-[8px] text-[16px] font-semibold box-border no-underline inline-block"
                                >
                                    📅 Add to Calendar
                                </Button>
                                
                                <Text className="text-[12px] text-neutral-400 mt-[12px] m-0">
                                    Click the button above to add this appointment to Google Calendar, Outlook, or your default calendar app
                                </Text>
                            </Section>

                            {/* Instructions */}
                            <Section className="bg-neutral-900 border-l-[4px] border-neutral-600 p-[20px] mb-[32px] rounded-[4px]">
                                <Heading className="text-[16px] font-bold text-white mb-[12px] m-0">
                                    Need to Make Changes?
                                </Heading>
                                <Text className="text-[14px] text-neutral-300 m-0">
                                    To reschedule, cancel, or modify your appointment, please contact us with your booking ID: <strong className="text-white">{bookingId}</strong>
                                </Text>
                            </Section>

                            <Hr className="border-neutral-700 my-[32px]" />

                            {/* Footer */}
                            <Section className="text-center">
                                <Text className="text-[12px] text-white mb-[8px] m-0 font-semibold">
                                    {businessName || calendarOwnerName}
                                </Text>
                                {businessWebsite && (
                                    <Text className="text-[12px] text-neutral-400 mb-[4px] m-0">
                                        <Link href={businessWebsite} className="text-neutral-400 no-underline">
                                            {businessWebsite}
                                        </Link>
                                    </Text>
                                )}
                                {calendarOwnerEmail && (
                                    <Text className="text-[12px] text-neutral-400 mb-[4px] m-0">
                                        Email: {calendarOwnerEmail}
                                    </Text>
                                )}
                                
                                {/* Link AI Icon at the bottom */}
                                <Section className="mt-[16px]">
                                    <Link href={siteConfig.url} className="no-underline">
                                        <Img
                                            src={footerIconUrl}
                                            width="24"
                                            height="auto"
                                            alt="Link AI"
                                            className="mx-auto"
                                        />
                                    </Link>
                                </Section>
                            </Section>
                        </Section>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
} 