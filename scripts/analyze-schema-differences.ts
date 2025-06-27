/**
 * SAFE Schema Analysis - Read-only comparison
 * This script analyzes what exists remotely vs locally without making changes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeSchemas() {
  console.log('🔍 SAFE SCHEMA ANALYSIS - Read Only');
  console.log('=====================================\n');

  try {
    // Check what tables exist in the remote database
    console.log('📋 REMOTE DATABASE TABLES:');
    const remoteTables = await prisma.$queryRaw<Array<{table_name: string, table_schema: string}>>`
      SELECT table_name, table_schema 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;

    remoteTables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });

    console.log('\n🔄 CHECKING FOR EMBEDDING-RELATED TRIGGERS:');
    const triggers = await prisma.$queryRaw<Array<{trigger_name: string, event_object_table: string}>>`
      SELECT trigger_name, event_object_table, action_statement
      FROM information_schema.triggers 
      WHERE trigger_name ILIKE '%embed%' 
         OR action_statement ILIKE '%embedding%' 
         OR action_statement ILIKE '%pgmq%'
      ORDER BY event_object_table;
    `;

    if (triggers.length > 0) {
      console.log('⚠️  PROBLEMATIC TRIGGERS FOUND:');
      triggers.forEach(trigger => {
        console.log(`  - ${trigger.trigger_name} on ${trigger.event_object_table}`);
      });
    } else {
      console.log('✅ No problematic embedding triggers found');
    }

    console.log('\n📊 CHECKING FOR EMBEDDING-RELATED TABLES:');
    const embeddingTables = remoteTables.filter(t => 
      t.table_name.includes('embedding') || 
      t.table_name.includes('vector') ||
      t.table_name.includes('pgmq')
    );

    if (embeddingTables.length > 0) {
      console.log('📋 Embedding-related tables:');
      embeddingTables.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
    }

    console.log('\n🎯 TABLES NOT IN PRISMA SCHEMA:');
    // List of tables that should exist based on Prisma schema
    const prismaExpectedTables = [
      'users', 'knowledge_sources', 'text_contents', 'qa_contents', 
      'files', 'website_contents', 'catalog_contents', 'chatbots',
      'embedding_jobs', 'vector_documents', 'appointments', 'calendars'
    ];

    const unexpectedTables = remoteTables
      .filter(t => !prismaExpectedTables.includes(t.table_name))
      .filter(t => !t.table_name.startsWith('_') && !t.table_name.includes('auth'));

    if (unexpectedTables.length > 0) {
      console.log('⚠️  Tables in remote DB but NOT in Prisma schema:');
      unexpectedTables.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
    } else {
      console.log('✅ All remote tables are expected in Prisma schema');
    }

  } catch (error) {
    console.error('❌ Error analyzing schemas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run analysis
analyzeSchemas().catch(console.error); 