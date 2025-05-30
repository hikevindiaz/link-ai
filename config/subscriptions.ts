import { SubscriptionPlan } from "@/types"

// NEW PRICING STRATEGY BASED ON THE PROVIDED PRICING TABLE

export const starterPlan: SubscriptionPlan = {
    name: "STARTER",
    description: "Perfect for individuals and small teams getting started with AI agents.",
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || "",

    // Core limits from pricing table
    maxChatbots: 1, // 1 Agent
    maxCrawlers: 10, // Keep existing for compatibility
    maxFiles: 1, // 1 Document
    
    // Message limits
    unlimitedMessages: false,
    maxMessagesPerMonth: 2000, // 2000 Messages Included
    
    // SMS limits
    maxSMSPerMonth: 50, // 50 SMS Messages Included
    
    // New features from pricing table
    maxWebSearchesPerMonth: 100, // 100 Web Searches Included
    maxConversationSummariesPerMonth: 50, // 50 Conversation Summaries Included
    maxWhatsAppConversationsPerMonth: 50, // 50 WhatsApp Conversations Included
    maxVoiceMinutesPerMonth: 0, // 0 Voice Minutes Included
    maxVoices: 1, // 1 Voice
    maxOrders: 10, // 10 Orders
    maxForms: 1, // 1 Form
    maxSchedulingAppointments: 10, // 10 Scheduling/Appointments
    maxCustomerTickets: 0, // 0 Customer Tickets
    
    // Support and branding
    basicCustomization: true,
    userInquiries: true,
    brandingCustomization: false, // "Link AI" branding
    premiumSupport: false, // Standard support
    chatFileAttachments: true,

    price: 69, // $69/month

    // Overage pricing (per unit when limits exceeded)
    overagePricing: {
        messagesPerUnit: 0.03, // $0.03/message
        webSearchesPerUnit: 0.10, // $0.10/search
        summariesPerUnit: 0.05, // $0.05/summary
        whatsAppConversationsPerUnit: 0.07, // $0.07/conversation
        voiceMinutesPerUnit: 0.15, // $0.15/minute
        smsPerUnit: 0.08, // $0.08/SMS
    }
}

export const growthPlan: SubscriptionPlan = {
    name: "GROWTH",
    description: "Ideal for growing businesses that need more agents and advanced features.",
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID || "",

    // Core limits from pricing table
    maxChatbots: 5, // 5 Agents
    maxCrawlers: 20, // Keep existing for compatibility
    maxFiles: 3, // 3 Documents
    
    // Message limits
    unlimitedMessages: false,
    maxMessagesPerMonth: 12000, // 12000 Messages Included
    
    // SMS limits
    maxSMSPerMonth: 150, // 150 SMS Messages Included
    
    // New features from pricing table
    maxWebSearchesPerMonth: 500, // 500 Web Searches Included
    maxConversationSummariesPerMonth: 400, // 400 Conversation Summaries Included
    maxWhatsAppConversationsPerMonth: 200, // 200 WhatsApp Conversations Included
    maxVoiceMinutesPerMonth: 50, // 50 Voice Minutes Included
    maxVoices: 3, // 3 Voices
    maxOrders: -1, // Unlimited Orders
    maxForms: 10, // 10 Forms
    maxSchedulingAppointments: -1, // Unlimited Scheduling/Appointments
    maxCustomerTickets: -1, // Unlimited Customer Tickets
    
    // Support and branding
    basicCustomization: true,
    userInquiries: true,
    brandingCustomization: false, // "Minimal" branding
    premiumSupport: true, // Priority support
    chatFileAttachments: true,

    price: 199, // $199/month

    // Overage pricing (per unit when limits exceeded)
    overagePricing: {
        messagesPerUnit: 0.03, // $0.03/message
        webSearchesPerUnit: 0.08, // $0.08/search
        summariesPerUnit: 0.04, // $0.04/summary
        whatsAppConversationsPerUnit: 0.06, // $0.06/conversation
        voiceMinutesPerUnit: 0.12, // $0.12/minute
        smsPerUnit: 0.08, // $0.08/SMS
    }
}

export const scalePlan: SubscriptionPlan = {
    name: "SCALE",
    description: "Perfect for enterprises and teams that need maximum capacity and features.",
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID || "",

    // Core limits from pricing table
    maxChatbots: 10, // 10 Agents
    maxCrawlers: 50, // Keep existing for compatibility
    maxFiles: 10, // 10 Documents
    
    // Message limits
    unlimitedMessages: false,
    maxMessagesPerMonth: 25000, // 25000 Messages Included
    
    // SMS limits
    maxSMSPerMonth: 400, // 400 SMS Messages Included
    
    // New features from pricing table
    maxWebSearchesPerMonth: 1000, // 1000 Web Searches Included
    maxConversationSummariesPerMonth: 1000, // 1000 Conversation Summaries Included
    maxWhatsAppConversationsPerMonth: 500, // 500 WhatsApp Conversations Included
    maxVoiceMinutesPerMonth: 150, // 150 Voice Minutes Included
    maxVoices: 6, // 6 Voices
    maxOrders: -1, // Unlimited Orders
    maxForms: 40, // 40 Forms
    maxSchedulingAppointments: -1, // Unlimited Scheduling/Appointments
    maxCustomerTickets: -1, // Unlimited Customer Tickets
    
    // Support and branding
    basicCustomization: true,
    userInquiries: true,
    brandingCustomization: true, // "No Branding"
    premiumSupport: true, // Dedicated support
    chatFileAttachments: true,

    price: 499, // $499/month

    // Overage pricing (per unit when limits exceeded)
    overagePricing: {
        messagesPerUnit: 0.02, // $0.02/message
        webSearchesPerUnit: 0.06, // $0.06/search
        summariesPerUnit: 0.03, // $0.03/summary
        whatsAppConversationsPerUnit: 0.05, // $0.05/conversation
        voiceMinutesPerUnit: 0.10, // $0.10/minute
        smsPerUnit: 0.06, // $0.06/SMS
    }
}

// Legacy plans for backward compatibility
export const freePlan: SubscriptionPlan = {
    name: "FREE",
    description: "The FREE plan is limited to 1 chatbot, 1 crawler, 3 files and 500 messages per month.",
    stripePriceId: "",

    maxChatbots: 10,
    maxCrawlers: 10,
    maxFiles: 30,
    unlimitedMessages: false,
    maxMessagesPerMonth: 5000,
    basicCustomization: true,
    userInquiries: true,

    brandingCustomization: true,

    chatFileAttachments: true,

    price: 0,
}

export const hobbyPlan: SubscriptionPlan = {
    name: "HOBBY",
    description: "The HOBBY plan is limited 3 chatbot, 3 crawler and 9 files and unlimited messages.",
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_HOBBY_PRICE_ID || "",

    maxChatbots: 3,
    maxCrawlers: 3,
    maxFiles: 9,
    unlimitedMessages: true,
    maxMessagesPerMonth: undefined,
    basicCustomization: true,
    userInquiries: false,

    brandingCustomization: true,
    chatFileAttachments: false,

    price: 3,
}

export const basicPlan: SubscriptionPlan = {
    name: "BASIC",
    description: "The BASIC plan has 9 chatbots, 9 crawlers and 27 files and unlimited messages.",
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID || "",

    maxChatbots: 9,
    maxCrawlers: 9,
    maxFiles: 27,
    unlimitedMessages: true,
    maxMessagesPerMonth: undefined,
    basicCustomization: true,
    userInquiries: true,

    chatFileAttachments: false,
    brandingCustomization: false,
    premiumSupport: true,

    price: 9,
}

export const legacyBasicPlan: SubscriptionPlan = {
    name: "BASIC",
    description: "The BASIC plan has 9 chatbots, 9 crawlers and 27 files and unlimited messages.",
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID || "",

    maxChatbots: 9,
    maxCrawlers: 9,
    maxFiles: 27,
    unlimitedMessages: true,
    maxMessagesPerMonth: undefined,
    basicCustomization: true,
    userInquiries: true,

    chatFileAttachments: false,
    brandingCustomization: true,
    premiumSupport: true,

    price: 9,
}

export const proPlan: SubscriptionPlan = {
    name: "PRO",
    description: "The PRO plan has 27 chatbots, 27 crawlers and 81 files and unlimited messages.",
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || "",

    maxChatbots: 27,
    maxCrawlers: 27,
    maxFiles: 81,
    unlimitedMessages: true,
    maxMessagesPerMonth: undefined,
    basicCustomization: true,
    userInquiries: true,

    premiumSupport: true,
    chatFileAttachments: true,
    brandingCustomization: true,

    price: 27,
}

// Helper function to get plan by name
export function getPlanByName(planName: string): SubscriptionPlan | null {
    switch (planName.toUpperCase()) {
        case 'STARTER':
            return starterPlan;
        case 'GROWTH':
            return growthPlan;
        case 'SCALE':
            return scalePlan;
        case 'FREE':
            return freePlan;
        case 'HOBBY':
            return hobbyPlan;
        case 'BASIC':
            return basicPlan;
        case 'PRO':
            return proPlan;
        default:
            return null;
    }
}

// Helper function to get all active plans (new pricing structure)
export function getActivePlans(): SubscriptionPlan[] {
    return [starterPlan, growthPlan, scalePlan];
}

// Helper function to get legacy plans for migration
export function getLegacyPlans(): SubscriptionPlan[] {
    return [freePlan, hobbyPlan, basicPlan, proPlan];
}