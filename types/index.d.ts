import { User, Message } from "@prisma/client"
import type { Icon } from "lucide-react"

import { Icons } from "@/components/icons"


export type InquiryMessages = {
  id: string
  inquiry: string
  createdAt: Date
  chatbotId: string
  threadId: string
  email: string
  deletedAt: Date | null
  messages: Message[]
}

export type NavItem = {
  title: string
  href: string
  disabled?: boolean
}

export type MainNavItem = NavItem

export type SidebarNavItem = {
  title: string
  disabled?: boolean
  external?: boolean
  icon?: keyof typeof Icons
} & (
    | {
      href: string
      items?: never
    }
    | {
      href?: string
      items: NavLink[]
    }
  )


export type DashboardConfig = {
  mainNav: MainNavItem[]
  sidebarNav: SidebarNavItem[]
}

export type DocsConfig = {
  mainNav: MainNavItem[]
  sidebarNav: SidebarNavItem[]
}

export type SiteConfig = {
  name: string
  description: string
  url: string
  ogImage: string
  links: {
    twitter: string
    github: string
    productHunt: string
  }
}

export type UserSubscriptionPlan = SubscriptionPlan &
  Pick<User, "stripeCustomerId" | "stripeSubscriptionId"> & {
    stripeCurrentPeriodEnd: number
  }

export type ChatbotConfig = {
  id: number
  welcomeMessage: string
  displayBranding: boolean
  chatTitle: string
  chatMessagePlaceHolder: string
  bubbleColor: string
  bubbleTextColor: string
  chatHeaderBackgroundColor: string
  chatHeaderTextColor: string
  chatbotReplyBackgroundColor: string
  chatbotReplyTextColor: string
  userReplyBackgroundColor: string
  userReplyTextColor: string
  inquiryEnabled: boolean,
  inquiryLinkText: string,
  inquiryTitle: string,
  inquirySubtitle: string,
  inquiryMessageLabel: string,
  inquiryEmailLabel: string,
  inquirySendButtonText: string,
  inquiryAutomaticReplyText: string,
  inquiryDisplayLinkAfterXMessage: number,
}


export type MarketingConfig = {
  mainNav: MainNavItem[]
}

export type CrawlerPublishedFile = {
  crawlerFileId: string
  openAIFileId: string
  name: string
}

export type UploadPublishedFile = {
  uploadFileId: string
  openAIFileId: string
  name: string
}

export type SubscriptionPlan = {
  name: string
  description: string
  stripePriceId: string

  // Core Specs (existing)
  maxChatbots: number
  unlimitedMessages: boolean
  maxMessagesPerMonth: number | undefined
  maxFiles: number
  maxCrawlers: number

  // New Usage Limits for Pricing Strategy
  maxSMSPerMonth?: number
  maxWebSearchesPerMonth?: number
  maxConversationSummariesPerMonth?: number
  maxWhatsAppConversationsPerMonth?: number
  maxVoiceMinutesPerMonth?: number
  maxVoices?: number
  maxOrders?: number // -1 for unlimited
  maxForms?: number
  maxSchedulingAppointments?: number // -1 for unlimited
  maxCustomerTickets?: number // -1 for unlimited

  // Features (existing)
  premiumSupport?: boolean
  basicCustomization: boolean
  brandingCustomization: boolean
  userInquiries: boolean
  chatFileAttachments: boolean

  // Pricing
  price: number | undefined

  // Overage Pricing Structure
  overagePricing?: {
    messagesPerUnit?: number
    webSearchesPerUnit?: number
    summariesPerUnit?: number
    whatsAppConversationsPerUnit?: number
    voiceMinutesPerUnit?: number
    smsPerUnit?: number
  }
}

export type UserSubscriptionPlan = SubscriptionPlan &
  Pick<User, "stripeCustomerId" | "stripeSubscriptionId"> & {
    stripeCurrentPeriodEnd: number
    isPro: boolean
  }