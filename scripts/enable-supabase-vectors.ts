import prisma from '@/lib/prisma';

async function enableSupabaseVectors() {
  console.log('🔄 Enabling Supabase vectors for knowledge sources...\n');

  try {
    // Get all knowledge sources
    const knowledgeSources = await prisma.knowledgeSource.findMany({
      select: {
        id: true,
        name: true,
        supabaseVectorEnabled: true,
        _count: {
          select: {
            textContents: true,
            qaContents: true,
            files: true
          }
        }
      }
    });

    if (knowledgeSources.length === 0) {
      console.log('❌ No knowledge sources found');
      console.log('💡 Create a knowledge source first in your application');
      return;
    }

    console.log('Found knowledge sources:');
    knowledgeSources.forEach((ks, index) => {
      console.log(`${index + 1}. ${ks.name}`);
      console.log(`   ID: ${ks.id}`);
      console.log(`   Supabase Enabled: ${ks.supabaseVectorEnabled}`);
      console.log(`   Content: ${ks._count.textContents} text, ${ks._count.qaContents} Q&A, ${ks._count.files} files`);
      console.log('');
    });

    // Find the first knowledge source with content
    const sourceWithContent = knowledgeSources.find(ks => 
      ks._count.textContents > 0 || ks._count.qaContents > 0 || ks._count.files > 0
    );

    if (!sourceWithContent) {
      console.log('⚠️  No knowledge sources have content yet');
      console.log('💡 Add some content to a knowledge source first');
      return;
    }

    // Enable Supabase vectors for this source
    console.log(`\n🎯 Enabling Supabase vectors for: ${sourceWithContent.name}`);
    
    const updated = await prisma.knowledgeSource.update({
      where: { id: sourceWithContent.id },
      data: {
        supabaseVectorEnabled: true,
        embeddingProvider: 'gte-small',
        embeddingModel: 'Supabase/gte-small',
        embeddingDimensions: 384
      }
    });

    console.log('\n✅ Successfully enabled Supabase vectors!');
    console.log('Configuration:');
    console.log(`- Provider: ${updated.embeddingProvider}`);
    console.log(`- Model: ${updated.embeddingModel}`);
    console.log(`- Dimensions: ${updated.embeddingDimensions}`);
    console.log(`- Enabled: ${updated.supabaseVectorEnabled}`);

    console.log('\n📝 Next steps:');
    console.log('1. Add new content to this knowledge source');
    console.log('2. The content will use Supabase embeddings instead of OpenAI');
    console.log('3. Test search functionality with the new embeddings');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
enableSupabaseVectors(); 