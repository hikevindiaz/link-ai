/**
 * Generate Prisma models for missing tables in remote database
 * This helps reconcile schema drift safely
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateMissingModels() {
  console.log('🔧 Generating Missing Prisma Models');
  console.log('===================================\n');

  try {
    // Get all tables not in Prisma schema
    const allTables = await prisma.$queryRaw<Array<{table_name: string}>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;

    const prismaExpectedTables = [
      'users', 'knowledge_sources', 'text_contents', 'qa_contents', 
      'files', 'website_contents', 'catalog_contents', 'chatbots',
      'embedding_jobs', 'vector_documents', 'appointments', 'calendars'
    ];

    const missingTables = allTables
      .filter(t => !prismaExpectedTables.includes(t.table_name))
      .filter(t => !t.table_name.startsWith('_') && !t.table_name.includes('auth'))
      .filter(t => t.table_name !== 'embedding_queue_fallback'); // We want to remove this one

    console.log('📋 Missing tables to add to Prisma schema:');
    missingTables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });

    console.log('\n🏗️  Generating model definitions...\n');

    for (const table of missingTables) {
      const tableName = table.table_name;
      
      // Get column information
      const columns = await prisma.$queryRaw<Array<{
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string | null;
      }>>`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = ${tableName} AND table_schema = 'public'
        ORDER BY ordinal_position;
      `;

      console.log(`model ${toPascalCase(tableName)} {`);
      
      for (const col of columns) {
        const fieldName = toCamelCase(col.column_name);
        const prismaType = mapPostgresToPrismaType(col.data_type, col.is_nullable === 'YES');
        const isId = col.column_name === 'id' || col.column_name.endsWith('_id');
        
        let fieldDef = `  ${fieldName.padEnd(20)} ${prismaType}`;
        
        if (isId && col.column_name === 'id') {
          fieldDef += ' @id @default(cuid())';
        }
        
        if (col.column_name.includes('created_at')) {
          fieldDef += ' @default(now()) @map("created_at")';
        } else if (col.column_name.includes('updated_at')) {
          fieldDef += ' @updatedAt @map("updated_at")';
        } else if (col.column_name !== fieldName) {
          fieldDef += ` @map("${col.column_name}")`;
        }
        
        console.log(fieldDef);
      }
      
      console.log(`\n  @@map("${tableName}")`);
      console.log('}\n');
    }

  } catch (error) {
    console.error('❌ Error generating models:', error);
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

function mapPostgresToPrismaType(pgType: string, isNullable: boolean): string {
  let baseType = 'String';
  
  switch (pgType.toLowerCase()) {
    case 'integer':
    case 'bigint':
      baseType = 'Int';
      break;
    case 'boolean':
      baseType = 'Boolean';
      break;
    case 'timestamp with time zone':
    case 'timestamp without time zone':
      baseType = 'DateTime';
      break;
    case 'jsonb':
    case 'json':
      baseType = 'Json';
      break;
    case 'uuid':
      baseType = 'String';
      break;
    default:
      baseType = 'String';
  }
  
  return isNullable ? `${baseType}?` : baseType;
}

generateMissingModels().catch(console.error); 