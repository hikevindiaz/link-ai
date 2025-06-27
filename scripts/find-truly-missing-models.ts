/**
 * Find truly missing models by comparing remote tables with existing Prisma models
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function findTrulyMissingModels() {
  console.log('🔍 Finding Truly Missing Models');
  console.log('================================\n');

  try {
    // Get all remote tables
    const remoteTables = await prisma.$queryRaw<Array<{table_name: string}>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;

    // Read current Prisma schema to see what models exist
    const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8');
    
    // Extract model names from schema
    const modelMatches = schemaContent.match(/model\s+(\w+)\s*{/g);
    const existingModels = modelMatches ? modelMatches.map(match => 
      match.replace(/model\s+/, '').replace(/\s*{/, '')
    ) : [];

    console.log('📋 Existing Prisma models:', existingModels.length);
    existingModels.forEach(model => console.log(`  - ${model}`));

    // Create mapping of table names to model names
    const tableToModelMap = new Map();
    
    // Extract @@map directives to understand table mappings
    const mapMatches = schemaContent.match(/@@map\("([^"]+)"\)/g);
    if (mapMatches) {
      mapMatches.forEach(match => {
        const tableName = match.match(/"([^"]+)"/)?.[1];
        if (tableName) {
          // Find the model this belongs to by looking backwards
          const modelMatch = schemaContent.substring(0, schemaContent.indexOf(match))
            .match(/model\s+(\w+)\s*{[^}]*$/)?.[1];
          if (modelMatch) {
            tableToModelMap.set(tableName, modelMatch);
          }
        }
      });
    }

    console.log('\n🔗 Table → Model mappings:');
    tableToModelMap.forEach((model, table) => {
      console.log(`  ${table} → ${model}`);
    });

    // Find truly missing tables
    const missingTables = remoteTables
      .filter(t => !t.table_name.startsWith('_') && !t.table_name.includes('auth'))
      .filter(t => t.table_name !== 'embedding_queue_fallback') // We want to remove this
      .filter(t => {
        // Check if this table is mapped to an existing model
        const mappedModel = tableToModelMap.get(t.table_name);
        if (mappedModel && existingModels.includes(mappedModel)) {
          return false; // Not missing
        }
        
        // Check if there's a model with similar name (case variations)
        const pascalCase = toPascalCase(t.table_name);
        const camelCase = toCamelCase(t.table_name);
        
        return !existingModels.some(model => 
          model.toLowerCase() === t.table_name.toLowerCase() ||
          model === pascalCase ||
          model === camelCase ||
          model.toLowerCase() === t.table_name.replace(/_/g, '').toLowerCase()
        );
      });

    console.log('\n⚠️  Truly missing tables (need Prisma models):');
    if (missingTables.length === 0) {
      console.log('✅ No missing tables! Your Prisma schema is complete.');
    } else {
      missingTables.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
    }

    return missingTables;

  } catch (error) {
    console.error('❌ Error:', error);
    return [];
  } finally {
    await prisma.$disconnect();
  }
}

function toPascalCase(str: string): string {
  return str.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join('');
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

findTrulyMissingModels().catch(console.error); 