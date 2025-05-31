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

interface AppointmentReminderEmailProps {
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
    reminderTime: string; // e.g., "30 minutes", "1 hour", "1 day"
    bookingId?: string;
    isDarkMode?: boolean;
}

export default function AppointmentReminderEmail({
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
    reminderTime,
    bookingId,
    isDarkMode = false,
}: AppointmentReminderEmailProps) {
    const previewText = `Reminder: Your appointment is in ${reminderTime}`;
    // Use light logo for dark header frame, dark logo for white sections
    const headerLogoUrl = LOGO_URLS.lightLogo; // Always light for dark header
    const footerIconUrl = LOGO_URLS.lightIcon; // Light icon for black footer background
    
    // Generate booking ID if not provided
    const finalBookingId = bookingId || `LK-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

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
            details: `Appointment with ${businessName || calendarOwnerName}\n\n${appointmentNotes ? `Notes: ${appointmentNotes}\n\n` : ''}Booking ID: ${finalBookingId}\n\nThis appointment was scheduled through Link AI.`,
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
                <Body className="bg-gray-100 font-sans py-[40px]">
                    <Container className="bg-black mx-auto rounded-[8px] max-w-[600px] overflow-hidden border border-gray-800">
                        {/* Top Powered By Frame */}
                        <Section className="bg-black text-center py-[8px] px-[20px] border-b border-gray-800">
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

                        {/* Header with Amber Background (Reminder Theme) */}
                        <Section className="bg-amber-50 text-center py-[40px] px-[40px] border-b-4 border-amber-400">
                            <Text className="text-[14px] font-medium text-amber-600 bg-amber-100 border border-amber-300 rounded-full px-4 py-2 inline-block mb-4">
                                ⏰ Appointment Reminder
                            </Text>
                            <Text className="text-[14px] font-medium text-amber-700 mb-[8px] m-0">
                                {businessName || calendarOwnerName || "Your Business"}
                            </Text>
                            <Heading className="text-[28px] font-bold text-amber-900 mb-[8px] m-0">
                                Your appointment is in {reminderTime}
                            </Heading>
                            <Text className="text-[16px] text-amber-700 font-semibold m-0">
                                Don't miss your upcoming booking!
                            </Text>
                        </Section>

                        {/* Main Content with Black Background */}
                        <Section className="bg-black px-[40px] py-[40px]">
                            {/* Urgent Reminder Notice */}
                            <Section className="bg-amber-900 border-l-[4px] border-amber-400 p-[20px] mb-[32px] rounded-[4px]">
                                <Heading className="text-[18px] font-bold text-amber-200 mb-[8px] m-0">
                                    ⏰ Don't Miss Your Appointment!
                                </Heading>
                                <Text className="text-[14px] text-amber-100 m-0">
                                    Your appointment with {businessName || calendarOwnerName} is coming up soon. Please make sure you're prepared and arrive on time.
                                </Text>
                            </Section>

                            {/* Appointment Details */}
                            <Section className="mb-[32px]">
                                <Heading className="text-[20px] font-bold text-white mb-[16px] m-0">
                                    Appointment Details
                                </Heading>
                                
                                <Row className="mb-[12px]">
                                    <Column>
                                        <Text className="text-[14px] text-gray-400 m-0 font-semibold">Service:</Text>
                                    </Column>
                                    <Column>
                                        <Text className="text-[14px] text-white m-0 font-medium">{appointmentTitle}</Text>
                                    </Column>
                                </Row>

                                <Row className="mb-[12px]">
                                    <Column>
                                        <Text className="text-[14px] text-gray-400 m-0 font-semibold">Date & Time:</Text>
                                    </Column>
                                    <Column>
                                        <Text className="text-[14px] text-amber-300 m-0 font-bold">{appointmentDate} at {appointmentTime}</Text>
                                    </Column>
                                </Row>

                                {/* AI Agent row moved here */}
                                {chatbotName && (
                                    <Row className="mb-[12px]">
                                        <Column>
                                            <Text className="text-[14px] text-gray-400 m-0 font-semibold">AI Agent:</Text>
                                        </Column>
                                        <Column>
                                            <Text className="text-[14px] text-white m-0">{chatbotName}</Text>
                                        </Column>
                                    </Row>
                                )}

                                {appointmentLocation && (
                                    <Row className="mb-[12px]">
                                        <Column>
                                            <Text className="text-[14px] text-gray-400 m-0 font-semibold">Location:</Text>
                                        </Column>
                                        <Column>
                                            <Text className="text-[14px] text-white m-0">{appointmentLocation}</Text>
                                        </Column>
                                    </Row>
                                )}

                                {appointmentNotes && (
                                    <Row>
                                        <Column>
                                            <Text className="text-[14px] text-gray-400 m-0 font-semibold">Notes:</Text>
                                        </Column>
                                        <Column>
                                            <Text className="text-[14px] text-white m-0">{appointmentNotes}</Text>
                                        </Column>
                                    </Row>
                                )}
                            </Section>

                            {/* Booking ID Reference */}
                            <Section className="bg-gray-900 p-[20px] rounded-[8px] mb-[32px] border border-gray-800">
                                <Text className="text-[14px] text-white mb-[4px] m-0">
                                    <strong>Booking ID:</strong> {finalBookingId}
                                </Text>
                                <Text className="text-[12px] text-gray-400 m-0">
                                    Reference this ID if you need to make changes
                                </Text>
                            </Section>

                            {/* Customer Information */}
                            <Section className="mb-[32px]">
                                <Heading className="text-[20px] font-bold text-white mb-[16px] m-0">
                                    Your Information
                                </Heading>
                                
                                <Row className="mb-[12px]">
                                    <Column>
                                        <Text className="text-[14px] text-gray-400 m-0 font-semibold">Name:</Text>
                                    </Column>
                                    <Column>
                                        <Text className="text-[14px] text-white m-0">{clientName}</Text>
                                    </Column>
                                </Row>

                                <Row className="mb-[12px]">
                                    <Column>
                                        <Text className="text-[14px] text-gray-400 m-0 font-semibold">Email:</Text>
                                    </Column>
                                    <Column>
                                        <Text className="text-[14px] text-white m-0">{clientEmail}</Text>
                                    </Column>
                                </Row>

                                {clientPhoneNumber && (
                                    <Row>
                                        <Column>
                                            <Text className="text-[14px] text-gray-400 m-0 font-semibold">Phone:</Text>
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
                                    className="bg-amber-500 hover:bg-amber-600 text-black px-[32px] py-[16px] rounded-[8px] text-[16px] font-semibold box-border no-underline inline-block"
                                >
                                    📅 Add to Calendar
                                </Button>
                                
                                <Text className="text-[12px] text-gray-400 mt-[12px] m-0">
                                    Ensure you don't miss your appointment by adding it to your calendar
                                </Text>
                            </Section>

                            {/* Preparation Tips */}
                            <Section className="bg-blue-900 border-l-[4px] border-blue-400 p-[20px] mb-[32px] rounded-[4px]">
                                <Heading className="text-[16px] font-bold text-blue-200 mb-[12px] m-0">
                                    💡 Preparation Tips
                                </Heading>
                                <Text className="text-[14px] text-blue-100 mb-[8px] m-0">
                                    • Arrive 5-10 minutes early
                                </Text>
                                <Text className="text-[14px] text-blue-100 mb-[8px] m-0">
                                    • Bring any required documents or ID
                                </Text>
                                <Text className="text-[14px] text-blue-100 m-0">
                                    • Contact us immediately if you need to reschedule
                                </Text>
                            </Section>

                            {/* Instructions */}
                            <Section className="bg-gray-900 border-l-[4px] border-gray-600 p-[20px] mb-[32px] rounded-[4px]">
                                <Heading className="text-[16px] font-bold text-white mb-[12px] m-0">
                                    Need to Make Changes?
                                </Heading>
                                <Text className="text-[14px] text-gray-300 m-0">
                                    To reschedule, cancel, or modify your appointment, please contact us with your booking ID: <strong className="text-white">{finalBookingId}</strong>
                                </Text>
                            </Section>

                            <Hr className="border-gray-700 my-[32px]" />

                            {/* Footer */}
                            <Section className="text-center">
                                <Text className="text-[12px] text-white mb-[8px] m-0 font-semibold">
                                    {businessName || calendarOwnerName}
                                </Text>
                                {businessWebsite && (
                                    <Text className="text-[12px] text-gray-400 mb-[4px] m-0">
                                        <Link href={businessWebsite} className="text-gray-400 no-underline">
                                            {businessWebsite}
                                        </Link>
                                    </Text>
                                )}
                                {calendarOwnerEmail && (
                                    <Text className="text-[12px] text-gray-400 mb-[4px] m-0">
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