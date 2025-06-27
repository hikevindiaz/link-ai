/**
 * Test the complete user flow for vector embeddings
 * This simulates what happens when a user adds content to a knowledge source
 */

import prisma from '@/lib/prisma';

async function testUserFlow() {
  console.log('🧪 Testing User Flow for Vector Embeddings\n');

  try {
    // 1. Find a real user first
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('❌ No users found. Please create a user account first.');
      return;
    }
    console.log('✅ Using user:', user.email);

    // 2. Find or create a knowledge source
    let knowledgeSource = await prisma.knowledgeSource.findFirst({
      where: { name: 'Test Knowledge Base' }
    });

    if (!knowledgeSource) {
      console.log('📚 Creating test knowledge source...');
      knowledgeSource = await prisma.knowledgeSource.create({
        data: {
          name: 'Test Knowledge Base',
          description: 'A test knowledge base for vector embeddings',
          userId: user.id
        }
      });
      console.log('✅ Created knowledge source:', knowledgeSource.name);
    } else {
      console.log('✅ Found existing knowledge source:', knowledgeSource.name);
    }

    // 2. Add some text content (simulating user adding content via UI)
    console.log('\n📝 Adding text content...');
    
    const response = await fetch(`http://localhost:3000/api/knowledge-sources/${knowledgeSource.id}/text-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: 'LinkAI provides intelligent AI assistants that can handle customer support, sales inquiries, and appointment scheduling. Our platform integrates with popular tools like Slack, WhatsApp, and email.'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to add text content: ${error}`);
    }

    const textContent = await response.json();
    console.log('✅ Added text content with ID:', textContent.id);

    // 3. Check if vector document was created
    console.log('\n🔍 Checking for vector embeddings...');
    
    // Wait a bit for async processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    const vectorDoc = await prisma.$queryRaw`
      SELECT * FROM vector_documents 
      WHERE content_id = ${textContent.id} 
      AND content_type = 'text'
      LIMIT 1
    `;

    if (Array.isArray(vectorDoc) && vectorDoc.length > 0) {
      console.log('✅ Vector document created!');
      console.log('- Document ID:', vectorDoc[0].id);
      console.log('- Embedding created:', !!vectorDoc[0].embedding);
      
      // Check embedding quality
      if (vectorDoc[0].embedding) {
        const embedding = vectorDoc[0].embedding;
        console.log('- Embedding type:', typeof embedding);
        console.log('- Embedding sample:', Array.isArray(embedding) ? embedding.slice(0, 3) : 'Not an array');
      }
    } else {
      console.log('⚠️  No vector document found yet');
      
      // Check embedding jobs
      const jobs = await prisma.$queryRaw`
        SELECT * FROM embedding_jobs 
        WHERE content_id = ${textContent.id}
        LIMIT 1
      `;
      
      if (Array.isArray(jobs) && jobs.length > 0) {
        console.log('📋 Embedding job status:', jobs[0].status);
        if (jobs[0].error) {
          console.log('❌ Job error:', jobs[0].error);
        }
      }
    }

    // 4. Test adding Q&A content
    console.log('\n❓ Adding Q&A content...');
    
    const qaResponse = await fetch(`http://localhost:3000/api/knowledge-sources/${knowledgeSource.id}/qa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        qaItems: [{
          question: 'What is LinkAI?',
          answer: 'LinkAI is an AI-powered platform that helps businesses automate customer interactions through intelligent assistants.'
        }]
      })
    });

    if (!qaResponse.ok) {
      const error = await qaResponse.text();
      console.log('⚠️  Failed to add Q&A content:', error);
    } else {
      const qaContent = await qaResponse.json();
      console.log('✅ Added Q&A content');
    }

    // 5. Summary
    console.log('\n📊 Test Summary:');
    console.log('- Knowledge source created/found ✅');
    console.log('- Text content added via API ✅');
    console.log('- Vector embedding generation:', Array.isArray(vectorDoc) && vectorDoc.length > 0 ? '✅' : '⚠️  Check Edge Function logs');
    console.log('\n💡 Next steps:');
    console.log('1. Check Supabase Edge Function logs for any errors');
    console.log('2. Visit /dashboard/admin/manage and click Vector Store tab');
    console.log('3. Try adding more content through the UI');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testUserFlow(); 