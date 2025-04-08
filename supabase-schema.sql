-- Table: open_a_i_config
CREATE TABLE IF NOT EXISTS open_a_i_config (
  id TEXT,
  userId TEXT,
  user TEXT
);

-- Table: chatbot_files
CREATE TABLE IF NOT EXISTS chatbot_files (
  id TEXT,
  assignedAt TIMESTAMP WITH TIME ZONE,
  chatbotId TEXT,
  fileId TEXT,
  chatbot TEXT,
  file TEXT
);

-- Table: chatbot_messages_export
CREATE TABLE IF NOT EXISTS chatbot_messages_export (
  id TEXT,
  createdAt TIMESTAMP WITH TIME ZONE,
  blobUrl TEXT,
  blobDownloadUrl TEXT,
  lastXDays INTEGER,
  chatbotId TEXT,
  chatbot TEXT
);

-- Table: chatbot_errors
CREATE TABLE IF NOT EXISTS chatbot_errors (
  id TEXT,
  createdAt TIMESTAMP WITH TIME ZONE,
  errorMessage TEXT,
  threadId TEXT,
  chatbotId TEXT,
  chatbot TEXT
);

-- Table: chatbot
CREATE TABLE IF NOT EXISTS chatbot (
  id TEXT,
  name TEXT,
  userId TEXT,
  openaiId TEXT,
  createdAt TIMESTAMP WITH TIME ZONE,
  openaiKey TEXT,
  modelId TEXT,
  prompt TEXT,
  You TEXT,
  a TEXT,
  welcomeMessage TEXT,
  How TEXT,
  I TEXT,
  you TEXT,
  chatbotErrorMessage TEXT,
  m TEXT,
  I TEXT,
  an TEXT,
  Please TEXT,
  again TEXT,
  isImported BOOLEAN,
  chatTitle TEXT,
  chatMessagePlaceHolder TEXT,
  rightToLeftLanguage BOOLEAN,
  bubbleColor TEXT,
  bubbleTextColor TEXT,
  chatHeaderBackgroundColor TEXT,
  chatHeaderTextColor TEXT,
  chatbotReplyBackgroundColor TEXT,
  chatbotReplyTextColor TEXT,
  userReplyBackgroundColor TEXT,
  userReplyTextColor TEXT,
  chatbotLogoURL TEXT,
  chatInputStyle TEXT,
  inquiryEnabled BOOLEAN,
  inquiryLinkText TEXT,
  inquiryTitle TEXT,
  inquirySubtitle TEXT,
  inquiryEmailLabel TEXT,
  inquiryMessageLabel TEXT,
  inquirySendButtonText TEXT,
  inquiryAutomaticReplyText TEXT,
  inquiryDisplayLinkAfterXMessage INTEGER,
  chatHistoryEnabled BOOLEAN,
  displayBranding BOOLEAN,
  chatFileAttachementEnabled BOOLEAN,
  maxCompletionTokens INTEGER,
  maxPromptTokens INTEGER,
  bannedIps TEXT[],
  allowEveryone BOOLEAN,
  allowedIpRanges TEXT[],
  chatBackgroundColor TEXT,
  callTimeout INTEGER,
  checkUserPresence BOOLEAN,
  hangUpMessage TEXT,
  language TEXT,
  phoneNumber TEXT,
  presenceMessage TEXT,
  presenceMessageDelay INTEGER,
  responseRate TEXT,
  secondLanguage TEXT,
  silenceTimeout INTEGER,
  temperature DECIMAL,
  voice TEXT,
  lastTrainedAt TIMESTAMP WITH TIME ZONE,
  trainingMessage TEXT,
  trainingStatus TEXT,
  ChatbotErrors TEXT,
  ChatbotFiles TEXT,
  ChatbotMessagesExport TEXT,
  ClientInquiries TEXT,
  forms TEXT,
  model TEXT,
  formSubmissions TEXT,
  knowledgeSources TEXT,
  user TEXT,
  twilioPhoneNumber TEXT,
  assistantSettings TEXT
);

-- Table: file
CREATE TABLE IF NOT EXISTS file (
  id TEXT,
  userId TEXT,
  name TEXT,
  openAIFileId TEXT,
  blobUrl TEXT,
  Keep TEXT,
  backward TEXT,
  storageUrl TEXT,
  Optional TEXT,
  to TEXT,
  file TEXT,
  Supabase TEXT,
  storageProvider TEXT,
  crawlerId TEXT,
  knowledgeSourceId TEXT,
  ChatbotFiles TEXT,
  CatalogContent TEXT,
  crawler TEXT,
  knowledgeSource TEXT,
  user TEXT
);

-- Table: chatbot_model
CREATE TABLE IF NOT EXISTS chatbot_model (
  id TEXT,
  name TEXT,
  Chatbot TEXT
);

-- Table: client_inquiries
CREATE TABLE IF NOT EXISTS client_inquiries (
  id TEXT,
  createdAt TIMESTAMP WITH TIME ZONE,
  threadId TEXT,
  email TEXT,
  inquiry TEXT,
  chatbotId TEXT,
  deletedAt TIMESTAMP WITH TIME ZONE,
  chatbot TEXT
);

-- Table: message
CREATE TABLE IF NOT EXISTS message (
  id TEXT,
  message TEXT,
  createdAt TIMESTAMP WITH TIME ZONE,
  response TEXT,
  threadId TEXT,
  from TEXT,
  userIP TEXT,
  userId TEXT,
  chatbotId TEXT,
  read BOOLEAN,
  user TEXT
);

-- Table: conversation_summary
CREATE TABLE IF NOT EXISTS conversation_summary (
  id TEXT,
  threadId TEXT,
  userId TEXT,
  user TEXT
);

-- Table: crawler
CREATE TABLE IF NOT EXISTS crawler (
  id TEXT,
  name TEXT,
  createdAt TIMESTAMP WITH TIME ZONE,
  userId TEXT,
  crawlUrl TEXT,
  urlMatch TEXT,
  selector TEXT,
  maxPagesToCrawl INTEGER,
  File TEXT,
  user TEXT
);

-- Table: account
CREATE TABLE IF NOT EXISTS account (
  id TEXT,
  userId TEXT,
  providerAccountId TEXT,
  access_token TEXT,
  expires_at INTEGER,
  id_token TEXT,
  provider TEXT,
  refresh_token TEXT,
  scope TEXT,
  session_state TEXT,
  token_type TEXT,
  type TEXT,
  user TEXT
);

-- Table: session
CREATE TABLE IF NOT EXISTS session (
  id TEXT,
  userId TEXT,
  expires TIMESTAMP WITH TIME ZONE,
  sessionToken TEXT
);

-- Table: user
CREATE TABLE IF NOT EXISTS user (
  id TEXT,
  name TEXT,
  email TEXT,
  unique TEXT,
  image TEXT,
  createdAt TIMESTAMP WITH TIME ZONE,
  Add TEXT,
  fields TEXT,
  onboarding TEXT,
  addressLine2 TEXT,
  city TEXT,
  state TEXT,
  postalCode TEXT,
  country TEXT,
  Company TEXT,
  companyName TEXT,
  companySize TEXT,
  businessWebsite TEXT,
  industryType TEXT,
  businessTasks TEXT[],
  communicationChannels TEXT[],
  Onboarding TEXT,
  onboardingCompleted BOOLEAN,
  Existing TEXT,
  inquiryEmailEnabled BOOLEAN,
  marketingEmailEnabled BOOLEAN,
  stripeSubscriptionStatus TEXT,
  stripeCurrentPeriodEnd TIMESTAMP WITH TIME ZONE,
  stripeCustomerId TEXT,
  stripePriceId TEXT,
  stripeSubscriptionId TEXT,
  twilioSubaccountSid TEXT,
  Relations TEXT,
  sessions TEXT,
  chatbots TEXT,
  crawlers TEXT,
  files TEXT,
  messages TEXT,
  conversationSummaries TEXT,
  openAIConfig TEXT,
  forms TEXT,
  knowledgeSources TEXT,
  paymentMethods TEXT,
  phoneNumbers TEXT,
  invoices TEXT,
  voices TEXT
);

-- Table: verification_token
CREATE TABLE IF NOT EXISTS verification_token (
  identifier TEXT,
  token TEXT
);

-- Table: knowledge_source
CREATE TABLE IF NOT EXISTS knowledge_source (
  id TEXT,
  name TEXT,
  description TEXT,
  createdAt TIMESTAMP WITH TIME ZONE,
  updatedAt TIMESTAMP WITH TIME ZONE,
  userId TEXT,
  catalogMode TEXT,
  vectorStoreId TEXT,
  OpenAI TEXT,
  Store TEXT,
  vectorStoreUpdatedAt TIMESTAMP WITH TIME ZONE,
  Last TEXT,
  the TEXT,
  store TEXT,
  updated TEXT,
  files TEXT,
  qaContents TEXT,
  textContents TEXT,
  websiteContents TEXT,
  chatbots TEXT,
  user TEXT
);

-- Table: text_content
CREATE TABLE IF NOT EXISTS text_content (
  id TEXT,
  content TEXT,
  openAIFileId TEXT,
  Add TEXT,
  field TEXT,
  track TEXT,
  file TEXT,
  in TEXT,
  vector TEXT,
  createdAt TIMESTAMP WITH TIME ZONE,
  updatedAt TIMESTAMP WITH TIME ZONE,
  knowledgeSourceId TEXT,
  knowledgeSource TEXT
);

-- Table: website_content
CREATE TABLE IF NOT EXISTS website_content (
  id TEXT,
  url TEXT,
  createdAt TIMESTAMP WITH TIME ZONE,
  updatedAt TIMESTAMP WITH TIME ZONE,
  knowledgeSourceId TEXT,
  searchType TEXT,
  instructions TEXT,
  Instructions TEXT,
  when TEXT,
  agent TEXT,
  use TEXT,
  URL TEXT
);

-- Table: q_a_content
CREATE TABLE IF NOT EXISTS q_a_content (
  id TEXT,
  createdAt TIMESTAMP WITH TIME ZONE,
  updatedAt TIMESTAMP WITH TIME ZONE,
  knowledgeSourceId TEXT,
  openAIFileId TEXT,
  Add TEXT,
  field TEXT,
  track TEXT,
  file TEXT,
  in TEXT,
  vector TEXT,
  answer TEXT,
  question TEXT,
  knowledgeSource TEXT
);

-- Table: catalog_content
CREATE TABLE IF NOT EXISTS catalog_content (
  id TEXT,
  createdAt TIMESTAMP WITH TIME ZONE,
  updatedAt TIMESTAMP WITH TIME ZONE,
  instructions TEXT,
  extractedContent TEXT,
  Text TEXT,
  String TEXT,
  file TEXT,
  knowledgeSource TEXT,
  products TEXT
);

-- Table: product
CREATE TABLE IF NOT EXISTS product (
  id TEXT,
  title TEXT,
  description TEXT,
  price DECIMAL,
  taxRate DECIMAL,
  categories TEXT[],
  imageUrl TEXT,
  URL TEXT,
  the TEXT,
  image TEXT,
  Supabase TEXT,
  createdAt TIMESTAMP WITH TIME ZONE,
  updatedAt TIMESTAMP WITH TIME ZONE,
  catalogContentId TEXT,
  catalogContent TEXT
);

-- Table: form
CREATE TABLE IF NOT EXISTS form (
  id TEXT,
  name TEXT,
  description TEXT,
  status TEXT,
  createdAt TIMESTAMP WITH TIME ZONE,
  updatedAt TIMESTAMP WITH TIME ZONE
);

-- Table: form_field
CREATE TABLE IF NOT EXISTS form_field (
  id TEXT,
  name TEXT,
  description TEXT,
  type TEXT,
  required BOOLEAN,
  options TEXT[],
  position INTEGER,
  formId TEXT,
  fieldValues TEXT,
  form TEXT
);

-- Table: form_submission
CREATE TABLE IF NOT EXISTS form_submission (
  id TEXT,
  createdAt TIMESTAMP WITH TIME ZONE,
  threadId TEXT,
  formId TEXT,
  chatbotId TEXT,
  fieldValues TEXT,
  chatbot TEXT,
  form TEXT
);

-- Table: form_field_value
CREATE TABLE IF NOT EXISTS form_field_value (
  id TEXT,
  value TEXT,
  fieldId TEXT,
  submissionId TEXT,
  field TEXT,
  submission TEXT
);

-- Table: chatbot_form
CREATE TABLE IF NOT EXISTS chatbot_form (
  id TEXT,
  createdAt TIMESTAMP WITH TIME ZONE,
  formId TEXT,
  chatbotId TEXT,
  chatbot TEXT,
  form TEXT
);

-- Table: payment_method
CREATE TABLE IF NOT EXISTS payment_method (
  id TEXT,
  stripePaymentMethodId TEXT,
  userId TEXT,
  user TEXT,
  createdAt TIMESTAMP WITH TIME ZONE,
  updatedAt TIMESTAMP WITH TIME ZONE
);

-- Table: twilio_phone_number
CREATE TABLE IF NOT EXISTS twilio_phone_number (
  id TEXT,
  phoneNumber TEXT,
  status TEXT,
  suspended TEXT,
  renewalDate TIMESTAMP WITH TIME ZONE,
  userId TEXT,
  chatbotId TEXT,
  unique TEXT,
  chatbot TEXT,
  createdAt TIMESTAMP WITH TIME ZONE,
  updatedAt TIMESTAMP WITH TIME ZONE
);

-- Table: user_voice
CREATE TABLE IF NOT EXISTS user_voice (
  id TEXT,
  voiceId TEXT,
  ElevenLabs TEXT,
  ID TEXT,
  String TEXT,
  labels JSONB,
  Store TEXT,
  as TEXT,
  addedOn TIMESTAMP WITH TIME ZONE,
  userId TEXT,
  user TEXT,
  createdAt TIMESTAMP WITH TIME ZONE,
  updatedAt TIMESTAMP WITH TIME ZONE
);

-- Table: invoice
CREATE TABLE IF NOT EXISTS invoice (
  id TEXT,
  stripeInvoiceId TEXT,
  unique TEXT,
  amount TEXT,
  status TEXT,
  failed TEXT,
  String TEXT,
  subscription TEXT,
  String TEXT,
  pdfUrl TEXT,
  createdAt TIMESTAMP WITH TIME ZONE,
  updatedAt TIMESTAMP WITH TIME ZONE,
  twilioPhoneNumber TEXT
);

-- Table: assistant_settings
CREATE TABLE IF NOT EXISTS assistant_settings (
  id TEXT,
  createdAt TIMESTAMP WITH TIME ZONE,
  updatedAt TIMESTAMP WITH TIME ZONE,
  tools JSONB,
  retrievalSettings JSONB
);

