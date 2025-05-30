-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "OpenAIConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "globalAPIKey" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpenAIConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatbotFiles" (
    "id" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chatbotId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,

    CONSTRAINT "ChatbotFiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatbotMessagesExport" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blobUrl" TEXT NOT NULL,
    "blobDownloadUrl" TEXT NOT NULL,
    "lastXDays" INTEGER NOT NULL,
    "chatbotId" TEXT NOT NULL,

    CONSTRAINT "ChatbotMessagesExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatbotErrors" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "errorMessage" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "chatbotId" TEXT NOT NULL,

    CONSTRAINT "ChatbotErrors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatbots" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "openaiId" TEXT DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openaiKey" TEXT DEFAULT '',
    "modelId" TEXT,
    "prompt" TEXT DEFAULT 'You are a helpful assistant.',
    "welcomeMessage" TEXT DEFAULT 'Hello! How can I help you today?',
    "chatbotErrorMessage" TEXT DEFAULT 'I''m sorry, I encountered an error. Please try again later.',
    "isImported" BOOLEAN NOT NULL DEFAULT false,
    "chatTitle" TEXT NOT NULL DEFAULT '2',
    "chatMessagePlaceHolder" TEXT NOT NULL DEFAULT 'Type a message...',
    "rightToLeftLanguage" BOOLEAN NOT NULL DEFAULT false,
    "bubbleColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "bubbleTextColor" TEXT NOT NULL DEFAULT '#000000',
    "riveOrbColor" INTEGER,
    "borderGradientColors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "chatHeaderBackgroundColor" TEXT NOT NULL DEFAULT 'FFFFFF',
    "chatHeaderTextColor" TEXT NOT NULL DEFAULT '#000000',
    "chatbotReplyBackgroundColor" TEXT NOT NULL DEFAULT '#e4e4e7',
    "chatbotReplyTextColor" TEXT NOT NULL DEFAULT '#000000',
    "userReplyBackgroundColor" TEXT NOT NULL DEFAULT '#e4e4e7',
    "userReplyTextColor" TEXT NOT NULL DEFAULT '#000000',
    "chatbotLogoURL" TEXT,
    "chatInputStyle" TEXT NOT NULL DEFAULT 'default',
    "inquiryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "inquiryLinkText" TEXT NOT NULL DEFAULT 'Contact our support team',
    "inquiryTitle" TEXT NOT NULL DEFAULT 'Contact our support team',
    "inquirySubtitle" TEXT NOT NULL DEFAULT 'Our team is here to help you with any questions you may have. Please provide us with your email and a brief message so we can assist you.',
    "inquiryEmailLabel" TEXT NOT NULL DEFAULT 'Email',
    "inquiryMessageLabel" TEXT NOT NULL DEFAULT 'Message',
    "inquirySendButtonText" TEXT NOT NULL DEFAULT 'Send message',
    "inquiryAutomaticReplyText" TEXT NOT NULL DEFAULT 'Your inquiry has been sent. Our team will get back to you shortly.',
    "inquiryDisplayLinkAfterXMessage" INTEGER NOT NULL DEFAULT 1,
    "chatHistoryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "displayBranding" BOOLEAN NOT NULL DEFAULT true,
    "chatFileAttachementEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maxCompletionTokens" INTEGER NOT NULL DEFAULT 1200,
    "maxPromptTokens" INTEGER NOT NULL DEFAULT 1200,
    "bannedIps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowEveryone" BOOLEAN NOT NULL DEFAULT true,
    "allowedIpRanges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "chatBackgroundColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "buttonTheme" TEXT NOT NULL DEFAULT 'light',
    "websiteEnabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "messengerEnabled" BOOLEAN NOT NULL DEFAULT false,
    "instagramEnabled" BOOLEAN NOT NULL DEFAULT false,
    "callTimeout" INTEGER,
    "checkUserPresence" BOOLEAN DEFAULT false,
    "hangUpMessage" TEXT,
    "language" TEXT DEFAULT 'en',
    "phoneNumber" TEXT,
    "presenceMessage" TEXT,
    "presenceMessageDelay" INTEGER,
    "responseRate" TEXT,
    "secondLanguage" TEXT,
    "silenceTimeout" INTEGER,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "voice" TEXT,
    "lastTrainedAt" TIMESTAMP(3),
    "trainingMessage" TEXT,
    "trainingStatus" TEXT NOT NULL DEFAULT 'idle',
    "iconType" TEXT DEFAULT 'orb',
    "calendarEnabled" BOOLEAN NOT NULL DEFAULT false,
    "calendarId" TEXT,

    CONSTRAINT "chatbots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "openAIFileId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blobUrl" TEXT NOT NULL,
    "crawlerId" TEXT,
    "knowledgeSourceId" TEXT,
    "storageProvider" TEXT NOT NULL DEFAULT 'vercel',
    "storageUrl" TEXT,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "models" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientInquiries" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "threadId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "inquiry" TEXT NOT NULL,
    "chatbotId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ClientInquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "response" TEXT NOT NULL,
    "threadId" TEXT NOT NULL DEFAULT '',
    "from" TEXT NOT NULL DEFAULT 'unknown',
    "userIP" TEXT,
    "userId" TEXT NOT NULL,
    "chatbotId" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversationSummary" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "conversationSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawlers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "crawlUrl" TEXT NOT NULL,
    "urlMatch" TEXT NOT NULL,
    "selector" TEXT NOT NULL,
    "maxPagesToCrawl" INTEGER NOT NULL,

    CONSTRAINT "crawlers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "id_token" TEXT,
    "provider" TEXT NOT NULL,
    "refresh_token" TEXT,
    "scope" TEXT,
    "session_state" TEXT,
    "token_type" TEXT,
    "type" TEXT NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "sessionToken" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inquiryEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "marketingEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "stripeSubscriptionStatus" TEXT,
    "stripe_current_period_end" TIMESTAMP(3),
    "stripe_customer_id" TEXT,
    "stripe_price_id" TEXT,
    "stripe_subscription_id" TEXT,
    "twilio_subaccount_sid" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "businessTasks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "businessWebsite" TEXT,
    "city" TEXT,
    "communicationChannels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "companyName" TEXT,
    "companySize" TEXT,
    "country" TEXT,
    "industryType" TEXT,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "postalCode" TEXT,
    "state" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "knowledge_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "catalogMode" TEXT,
    "vectorStoreId" TEXT,
    "vectorStoreUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "knowledge_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "text_contents" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "knowledgeSourceId" TEXT NOT NULL,
    "openAIFileId" TEXT,

    CONSTRAINT "text_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_contents" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "knowledgeSourceId" TEXT NOT NULL,
    "searchType" TEXT NOT NULL DEFAULT 'crawl',
    "instructions" TEXT,

    CONSTRAINT "website_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qa_contents" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "knowledgeSourceId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "openAIFileId" TEXT,

    CONSTRAINT "qa_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_contents" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "instructions" TEXT,
    "knowledgeSourceId" TEXT NOT NULL,
    "fileId" TEXT,
    "extracted_content" TEXT,
    "openAIFileId" TEXT,

    CONSTRAINT "catalog_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL,
    "categories" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "catalogContentId" TEXT NOT NULL,
    "imageUrl" TEXT,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_fields" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT[],
    "position" INTEGER NOT NULL,
    "formId" TEXT NOT NULL,

    CONSTRAINT "form_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_submissions" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "threadId" TEXT,
    "formId" TEXT NOT NULL,
    "chatbotId" TEXT NOT NULL,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_field_values" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,

    CONSTRAINT "form_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chatbot_forms" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "formId" TEXT NOT NULL,
    "chatbotId" TEXT NOT NULL,

    CONSTRAINT "chatbot_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "stripePaymentMethodId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "expMonth" INTEGER NOT NULL,
    "expYear" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "twilio_phone_numbers" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "twilioSid" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "monthlyPrice" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "renewalDate" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "chatbotId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "twilio_phone_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_voices" (
    "id" TEXT NOT NULL,
    "voiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT,
    "labels" JSONB,
    "addedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_voices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "stripeInvoiceId" TEXT,
    "stripePaymentIntentId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "twilioPhoneNumberId" TEXT,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistantSettings" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "chatbotId" TEXT NOT NULL,
    "openaiAssistantId" TEXT,
    "openaiThreadId" TEXT,
    "instructions" TEXT DEFAULT 'You are a helpful AI assistant.',
    "tools" JSONB DEFAULT '[]',
    "retrievalSettings" JSONB DEFAULT '{}',

    CONSTRAINT "AssistantSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendars" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workingHoursStart" TEXT NOT NULL DEFAULT '09:00',
    "workingHoursEnd" TEXT NOT NULL DEFAULT '17:00',
    "includeSaturday" BOOLEAN NOT NULL DEFAULT true,
    "includeSunday" BOOLEAN NOT NULL DEFAULT false,
    "notificationEmail" TEXT,
    "notificationEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsReminderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderTimeMinutes" INTEGER NOT NULL DEFAULT 30,
    "askForDuration" BOOLEAN NOT NULL DEFAULT true,
    "askForNotes" BOOLEAN NOT NULL DEFAULT true,
    "defaultDuration" INTEGER NOT NULL DEFAULT 30,
    "bufferBetweenAppointments" INTEGER NOT NULL DEFAULT 15,
    "maxBookingsPerSlot" INTEGER NOT NULL DEFAULT 1,
    "minimumAdvanceNotice" INTEGER NOT NULL DEFAULT 60,
    "requirePhoneNumber" BOOLEAN NOT NULL DEFAULT true,
    "defaultLocation" TEXT,
    "bookingPrompt" TEXT,
    "confirmationMessage" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "bookedByUserId" TEXT,
    "clientName" TEXT NOT NULL,
    "clientPhoneNumber" TEXT,
    "description" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "color" TEXT NOT NULL DEFAULT 'indigo',
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_integration_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "configuredAt" TIMESTAMP(3),

    CONSTRAINT "user_integration_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ChatbotToKnowledgeSource" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "OpenAIConfig_userId_key" ON "OpenAIConfig"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "files_openAIFileId_key" ON "files"("openAIFileId");

-- CreateIndex
CREATE UNIQUE INDEX "conversationSummary_threadId_key" ON "conversationSummary"("threadId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripe_customer_id_key" ON "User"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripe_subscription_id_key" ON "User"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_twilio_subaccount_sid_key" ON "User"("twilio_subaccount_sid");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "chatbot_forms_formId_chatbotId_key" ON "chatbot_forms"("formId", "chatbotId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_stripePaymentMethodId_key" ON "payment_methods"("stripePaymentMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "twilio_phone_numbers_phoneNumber_key" ON "twilio_phone_numbers"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "twilio_phone_numbers_twilioSid_key" ON "twilio_phone_numbers"("twilioSid");

-- CreateIndex
CREATE UNIQUE INDEX "twilio_phone_numbers_chatbotId_key" ON "twilio_phone_numbers"("chatbotId");

-- CreateIndex
CREATE UNIQUE INDEX "user_voices_userId_voiceId_key" ON "user_voices"("userId", "voiceId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_stripeInvoiceId_key" ON "invoices"("stripeInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "AssistantSettings_chatbotId_key" ON "AssistantSettings"("chatbotId");

-- CreateIndex
CREATE INDEX "appointments_calendarId_startTime_endTime_idx" ON "appointments"("calendarId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "appointments_bookedByUserId_idx" ON "appointments"("bookedByUserId");

-- CreateIndex
CREATE INDEX "user_integration_settings_userId_idx" ON "user_integration_settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_integration_settings_userId_integrationId_key" ON "user_integration_settings"("userId", "integrationId");

-- CreateIndex
CREATE UNIQUE INDEX "_ChatbotToKnowledgeSource_AB_unique" ON "_ChatbotToKnowledgeSource"("A", "B");

-- CreateIndex
CREATE INDEX "_ChatbotToKnowledgeSource_B_index" ON "_ChatbotToKnowledgeSource"("B");

-- AddForeignKey
ALTER TABLE "OpenAIConfig" ADD CONSTRAINT "OpenAIConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatbotFiles" ADD CONSTRAINT "ChatbotFiles_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatbotFiles" ADD CONSTRAINT "ChatbotFiles_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatbotMessagesExport" ADD CONSTRAINT "ChatbotMessagesExport_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatbotErrors" ADD CONSTRAINT "ChatbotErrors_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbots" ADD CONSTRAINT "chatbots_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "calendars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbots" ADD CONSTRAINT "chatbots_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbots" ADD CONSTRAINT "chatbots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_crawlerId_fkey" FOREIGN KEY ("crawlerId") REFERENCES "crawlers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_knowledgeSourceId_fkey" FOREIGN KEY ("knowledgeSourceId") REFERENCES "knowledge_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientInquiries" ADD CONSTRAINT "ClientInquiries_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversationSummary" ADD CONSTRAINT "conversationSummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crawlers" ADD CONSTRAINT "crawlers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_sources" ADD CONSTRAINT "knowledge_sources_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "text_contents" ADD CONSTRAINT "text_contents_knowledgeSourceId_fkey" FOREIGN KEY ("knowledgeSourceId") REFERENCES "knowledge_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_contents" ADD CONSTRAINT "website_contents_knowledgeSourceId_fkey" FOREIGN KEY ("knowledgeSourceId") REFERENCES "knowledge_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qa_contents" ADD CONSTRAINT "qa_contents_knowledgeSourceId_fkey" FOREIGN KEY ("knowledgeSourceId") REFERENCES "knowledge_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_contents" ADD CONSTRAINT "catalog_contents_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_contents" ADD CONSTRAINT "catalog_contents_knowledgeSourceId_fkey" FOREIGN KEY ("knowledgeSourceId") REFERENCES "knowledge_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_catalogContentId_fkey" FOREIGN KEY ("catalogContentId") REFERENCES "catalog_contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_formId_fkey" FOREIGN KEY ("formId") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_formId_fkey" FOREIGN KEY ("formId") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_field_values" ADD CONSTRAINT "form_field_values_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "form_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_field_values" ADD CONSTRAINT "form_field_values_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "form_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_forms" ADD CONSTRAINT "chatbot_forms_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chatbot_forms" ADD CONSTRAINT "chatbot_forms_formId_fkey" FOREIGN KEY ("formId") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "twilio_phone_numbers" ADD CONSTRAINT "twilio_phone_numbers_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "twilio_phone_numbers" ADD CONSTRAINT "twilio_phone_numbers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_voices" ADD CONSTRAINT "user_voices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_twilioPhoneNumberId_fkey" FOREIGN KEY ("twilioPhoneNumberId") REFERENCES "twilio_phone_numbers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantSettings" ADD CONSTRAINT "AssistantSettings_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendars" ADD CONSTRAINT "calendars_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_bookedByUserId_fkey" FOREIGN KEY ("bookedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_integration_settings" ADD CONSTRAINT "user_integration_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChatbotToKnowledgeSource" ADD CONSTRAINT "_ChatbotToKnowledgeSource_A_fkey" FOREIGN KEY ("A") REFERENCES "chatbots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChatbotToKnowledgeSource" ADD CONSTRAINT "_ChatbotToKnowledgeSource_B_fkey" FOREIGN KEY ("B") REFERENCES "knowledge_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
