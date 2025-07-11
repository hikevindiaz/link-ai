#!/usr/bin/env tsx

/**
 * Migration script to transition from OpenAI voices to ElevenLabs voices
 * 
 * This script will:
 * 1. Add the new elevenLabsVoiceId column
 * 2. Map existing OpenAI voices to ElevenLabs equivalents
 * 3. Drop the old openaiVoice column
 * 
 * Run with: npx tsx scripts/migrate-voices-to-elevenlabs.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapping from OpenAI voices to ElevenLabs voices
const VOICE_MAPPING = {
  'alloy': 'pNInz6obpgDQGcFmaJgB',    // Adam (male, deep)
  'echo': 'VR6AewLTigWG4xSOukaG',     // Arnold (male, crisp)
  'fable': 'ErXwobaYiN019PkySvjV',    // Antoni (male, well-rounded)
  'onyx': 'yoZ06aMxZJJ28mfd3POQ',     // Sam (male, raspy)
  'nova': 'EXAVITQu4vr4xnSDxMaL',    // Bella (female, expressive)
  'shimmer': 'MF3mGyEYCl7XYWbV9V6O', // Elli (female, emotional)
  'coral': '21m00Tcm4TlvDq8ikWAM',   // Rachel (female, warm)
  'sage': 'TxGEqnHWrfWFTfGW9XjX',    // Josh (male, serious)
  'ash': 'AZnzlk1XvdvUeBnXmlld',     // Domi (female, strong)
  'ballad': 'oWAxZDx7w5VEj9dCyTzz', // Grace (female, upbeat)
  'verse': 'ErXwobaYiN019PkySvjV',   // Antoni (backup mapping)
};

async function migrateVoices() {
  try {
    console.log('🚀 Starting OpenAI to ElevenLabs voice migration...');
    
    // Step 1: Add the new column (this should be done via Prisma migration first)
    console.log('⚠️  Make sure you have run: npx prisma db push');
    console.log('   This adds the elevenLabsVoiceId column to the database');
    
    // Step 2: Update existing user voices
    console.log('📊 Fetching existing user voices...');
    const existingVoices = await prisma.$queryRaw`
      SELECT id, "openaiVoice", name FROM user_voices 
      WHERE "openaiVoice" IS NOT NULL
    ` as Array<{ id: string; openaiVoice: string; name: string }>;
    
    console.log(`Found ${existingVoices.length} voices to migrate`);
    
    if (existingVoices.length === 0) {
      console.log('✅ No voices to migrate');
      return;
    }
    
    // Step 3: Map and update each voice
    const updatePromises = existingVoices.map(async (voice) => {
      const elevenLabsVoiceId = VOICE_MAPPING[voice.openaiVoice as keyof typeof VOICE_MAPPING];
      
      if (!elevenLabsVoiceId) {
        console.log(`⚠️  No mapping found for OpenAI voice "${voice.openaiVoice}" (voice: ${voice.name})`);
        // Use a default voice (Rachel)
        return prisma.$executeRaw`
          UPDATE user_voices 
          SET eleven_labs_voice_id = '21m00Tcm4TlvDq8ikWAM'
          WHERE id = ${voice.id}
        `;
      }
      
      console.log(`✨ Mapping ${voice.name}: ${voice.openaiVoice} → ${elevenLabsVoiceId}`);
      return prisma.$executeRaw`
        UPDATE user_voices 
        SET eleven_labs_voice_id = ${elevenLabsVoiceId}
        WHERE id = ${voice.id}
      `;
    });
    
    await Promise.all(updatePromises);
    
    console.log('✅ All voices migrated successfully');
    
    // Step 4: Verify migration
    const migratedCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM user_voices 
      WHERE eleven_labs_voice_id IS NOT NULL
    ` as Array<{ count: bigint }>;
    
    console.log(`✅ Verified: ${migratedCount[0].count} voices now have ElevenLabs IDs`);
    
    console.log('🎉 Migration completed successfully!');
    console.log('📝 Next steps:');
    console.log('   1. Deploy the updated API endpoints');
    console.log('   2. Update the frontend to use ElevenLabs voices');
    console.log('   3. Test voice functionality');
    console.log('   4. Once confirmed working, drop the openaiVoice column');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  migrateVoices().catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

export { migrateVoices }; 