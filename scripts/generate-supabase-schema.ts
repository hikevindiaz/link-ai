// Load environment variables
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
dotenv.config();

import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

async function generateSupabaseSchema() {
  console.log('Generating Supabase schema from Prisma schema...');
  
  try {
    // Read the Prisma schema file
    const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    // Parse models from the schema
    const modelRegex = /model\s+(\w+)\s+{([^}]*)}/gs;
    let match;
    const models = [];
    
    while ((match = modelRegex.exec(schemaContent)) !== null) {
      const modelName = match[1];
      const modelBody = match[2];
      
      // Parse fields
      const fieldRegex = /(\w+)\s+(\w+(?:\[\])?)\s*(?:@[^)]+\))?/g;
      let fieldMatch;
      const fields = [];
      
      while ((fieldMatch = fieldRegex.exec(modelBody)) !== null) {
        const fieldName = fieldMatch[1];
        const fieldType = fieldMatch[2];
        
        // Map Prisma types to PostgreSQL types
        let sqlType = mapPrismaTypeToSQL(fieldType);
        
        fields.push({
          name: fieldName,
          type: fieldType,
          sqlType: sqlType
        });
      }
      
      models.push({
        name: modelName,
        fields: fields,
        tableName: modelName
          .replace(/([A-Z])/g, '_$1')
          .toLowerCase()
          .substring(1) // Remove leading underscore
      });
    }
    
    // Generate SQL for each model
    let sql = '';
    
    for (const model of models) {
      sql += `-- Table: ${model.tableName}\n`;
      sql += `CREATE TABLE IF NOT EXISTS ${model.tableName} (\n`;
      
      // Add fields
      const fieldLines = model.fields.map(field => {
        return `  ${field.name} ${field.sqlType}`;
      });
      
      sql += fieldLines.join(',\n');
      sql += '\n);\n\n';
    }
    
    // Write SQL to file
    const outputPath = path.join(__dirname, '../supabase-schema.sql');
    fs.writeFileSync(outputPath, sql);
    
    console.log(`Schema generated and saved to ${outputPath}`);
  } catch (error) {
    console.error('Error generating schema:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to map Prisma types to PostgreSQL types
function mapPrismaTypeToSQL(prismaType: string): string {
  switch (prismaType) {
    case 'String':
      return 'TEXT';
    case 'Int':
      return 'INTEGER';
    case 'Float':
      return 'DECIMAL';
    case 'Boolean':
      return 'BOOLEAN';
    case 'DateTime':
      return 'TIMESTAMP WITH TIME ZONE';
    case 'Json':
      return 'JSONB';
    case 'String[]':
      return 'TEXT[]';
    case 'Int[]':
      return 'INTEGER[]';
    case 'Float[]':
      return 'DECIMAL[]';
    default:
      return 'TEXT';
  }
}

// Run the generator
generateSupabaseSchema()
  .then(() => {
    console.log('Schema generation completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Schema generation failed:', error);
    process.exit(1);
  }); 