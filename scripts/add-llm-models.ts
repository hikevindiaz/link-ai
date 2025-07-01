import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addLLMModels() {
  console.log('🚀 Adding LLM models to database...');

  try {
    // Define the models to add
    const modelsToAdd = [
      // OpenAI Models
      {
        id: 'openai-gpt-4',
        name: 'GPT-4'
      },
      {
        id: 'openai-gpt-4-turbo',
        name: 'GPT-4 Turbo'
      },
      {
        id: 'openai-gpt-4-mini',
        name: 'GPT-4 Mini'
      },
      {
        id: 'openai-gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo'
      },
      {
        id: 'openai-gpt-3.5',
        name: 'GPT-3.5'
      },

      // Gemini Models
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro'
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash'
      },
      {
        id: 'gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash (Experimental)'
      },
      {
        id: 'gemini-2.0-flash-thinking-exp',
        name: 'Gemini 2.0 Flash Thinking (Experimental)'
      },
      {
        id: 'gemini-2.5-flash-lite-preview',
        name: 'Gemini 2.5 Flash-Lite Preview'
      },
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash'
      },
      {
        id: 'gpt-4.1-nano-2025-04-14',
        name: 'GPT-4.1 Nano'
      },
      {
        id: 'o4-mini-2025-04-16',
        name: 'O4 Mini'
      },
      {
        id: 'gpt-4o-mini-2024-07-18',
        name: 'GPT-4o Mini'
      },
      
      // Legacy/Generic names for backward compatibility
      {
        id: 'gpt-4',
        name: 'GPT-4 (Legacy)'
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo (Legacy)'
      },
      {
        id: 'gemini-pro',
        name: 'Gemini Pro (Legacy)'
      },
      {
        id: 'gemini-flash',
        name: 'Gemini Flash (Legacy)'
      }
    ];

    // Add each model, skipping if it already exists
    const results = {
      added: 0,
      skipped: 0,
      errors: 0
    };

    for (const model of modelsToAdd) {
      try {
        // Check if model already exists
        const existingModel = await prisma.chatbotModel.findUnique({
          where: { id: model.id }
        });

        if (existingModel) {
          console.log(`⏭️  Skipped: ${model.name} (already exists)`);
          results.skipped++;
          continue;
        }

        // Create the model
        await prisma.chatbotModel.create({
          data: {
            id: model.id,
            name: model.name
          }
        });

        console.log(`✅ Added: ${model.name}`);
        results.added++;

      } catch (error) {
        console.error(`❌ Error adding ${model.name}:`, error.message);
        results.errors++;
      }
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`✅ Added: ${results.added} models`);
    console.log(`⏭️  Skipped: ${results.skipped} models (already existed)`);
    console.log(`❌ Errors: ${results.errors} models`);

    if (results.added > 0) {
      console.log('\n🎉 Models added successfully! Users can now select from OpenAI and Gemini models.');
      console.log('\n💡 Next steps:');
      console.log('1. Set your GOOGLE_AI_API_KEY environment variable');
      console.log('2. Users can now select Gemini models in the chatbot configuration');
      console.log('3. The system will automatically route to the appropriate AI provider');
    }

  } catch (error) {
    console.error('💥 Failed to add models:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Check if we're running directly
if (require.main === module) {
  addLLMModels()
    .catch(console.error);
}

export { addLLMModels }; 