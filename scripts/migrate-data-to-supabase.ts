import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const sourcePrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.SOURCE_DATABASE_URL
    }
  }
});

const targetPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Add this at the top of the file to inspect available models
console.log('Available models in target client:', Object.keys(targetPrisma).filter(key => !key.startsWith('$')));

const MODEL_MAPPINGS = {
  user: 'user',
  chatbotModel: 'chatbotModel',
  form: 'form',
  file: 'file',
  chatbot: 'chatbot',
  formField: 'formField',
  formSubmission: 'formSubmission',
  formFieldValue: 'formFieldValue',
  chatbotFiles: 'chatbotFiles',
  chatbotForm: 'chatbotForm',
  message: 'message',
  clientInquiries: 'clientInquiries',
  knowledgeSource: 'knowledgeSource',
  catalogContent: 'catalogContent',
  twilioPhoneNumber: 'twilioPhoneNumber',
  conversationSummary: 'conversationSummary'
};

async function migrateModel(modelName: string, sourceData: any[], targetClient: any) {
  console.log(`Migrating ${modelName}...`);
  console.log(`Found ${sourceData.length} records in ${modelName}`);
  
  const targetModelName = MODEL_MAPPINGS[modelName] || modelName;
  
  try {
    let successCount = 0;
    for (const record of sourceData) {
      try {
        // Remove any fields that might cause issues
        const { updatedAt, created_at, updated_at, ...cleanRecord } = record;
        
        // Handle date fields
        if (record.createdAt) {
          cleanRecord.createdAt = new Date(record.createdAt);
        }
        
        // Log the data we're trying to insert for debugging
        console.log(`Attempting to upsert record into ${targetModelName}:`, cleanRecord);
        
        await targetClient[targetModelName].upsert({
          where: { id: record.id },
          create: cleanRecord,
          update: cleanRecord
        });
        successCount++;
        console.log(`Successfully upserted record ${successCount}`);
      } catch (individualError) {
        console.error(`Error migrating individual record in ${modelName}:`, {
          error: individualError.message,
          record: record
        });
      }
    }
    console.log(`Migrated ${successCount}/${sourceData.length} records for ${modelName} using individual upserts`);
    return successCount;
  } catch (error) {
    console.error(`Error in migrateModel for ${modelName}:`, error);
    return 0;
  }
}

async function migrateData() {
  try {
    // Step 1: Migrate base models first (no dependencies)
    const users = await sourcePrisma.user.findMany();
    await migrateModel('user', users, targetPrisma);

    const chatbotModels = await sourcePrisma.chatbotModel.findMany();
    await migrateModel('chatbotModel', chatbotModels, targetPrisma);

    const forms = await sourcePrisma.form.findMany();
    await migrateModel('form', forms, targetPrisma);

    const files = await sourcePrisma.file.findMany();
    await migrateModel('file', files, targetPrisma);

    const chatbots = await sourcePrisma.chatbot.findMany();
    await migrateModel('chatbot', chatbots, targetPrisma);

    // Step 2: Migrate models with single dependencies
    const formFields = await sourcePrisma.formField.findMany();
    await migrateModel('formField', formFields, targetPrisma);

    // Step 3: Migrate models with multiple dependencies
    const formSubmissions = await sourcePrisma.formSubmission.findMany();
    await migrateModel('formSubmission', formSubmissions, targetPrisma);

    const formFieldValues = await sourcePrisma.formFieldValue.findMany();
    await migrateModel('formFieldValue', formFieldValues, targetPrisma);

    const chatbotFiles = await sourcePrisma.chatbotFiles.findMany();
    await migrateModel('chatbotFiles', chatbotFiles, targetPrisma);

    const chatbotForms = await sourcePrisma.chatbotForm.findMany();
    await migrateModel('chatbotForm', chatbotForms, targetPrisma);

    // Step 4: Migrate remaining models
    const messages = await sourcePrisma.message.findMany();
    await migrateModel('message', messages, targetPrisma);

    const clientInquiries = await sourcePrisma.clientInquiries.findMany();
    await migrateModel('clientInquiries', clientInquiries, targetPrisma);

    const knowledgeSources = await sourcePrisma.knowledgeSource.findMany();
    await migrateModel('knowledgeSource', knowledgeSources, targetPrisma);

    const catalogContent = await sourcePrisma.catalogContent.findMany();
    await migrateModel('catalogContent', catalogContent, targetPrisma);

    const twilioPhoneNumbers = await sourcePrisma.twilioPhoneNumber.findMany();
    await migrateModel('twilioPhoneNumber', twilioPhoneNumbers, targetPrisma);

    console.log('🎉 Migration complete! Your data is now in Supabase.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sourcePrisma.$disconnect();
    await targetPrisma.$disconnect();
  }
}

// Run the migration
migrateData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  }); 