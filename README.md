# Welcome to OpenAssistantGPT

<p>
<img alt="Vercel Build Status" src="https://vercelbadge.vercel.app/api/marcolivierbouch/OpenAssistantGPT" />
<img alt="GitHub Last Commit" src="https://img.shields.io/github/last-commit/marcolivierbouch/OpenAssistantGPT" />
<img alt="" src="https://img.shields.io/github/repo-size/marcolivierbouch/OpenAssistantGPT" />
<img alt="GitHub Issues" src="https://img.shields.io/github/issues/marcolivierbouch/OpenAssistantGPT" />
<img alt="GitHub Pull Requests" src="https://img.shields.io/github/issues-pr/marcolivierbouch/OpenAssistantGPT" />
</p>

OpenAssistantGPT is an open source platform for building chatbot assistants using OpenAI's Assistant. It offers features like easy website integration, low cost, and an open source codebase available on GitHub. 

Users can build their chatbot with minimal coding required, and OpenAssistantGPT supports direct billing through OpenAI without extra charges. The platform is particularly user-friendly and cost-effective, appealing to those seeking to integrate AI chatbot functionalities into their websites.

For more detailed information and implementation guidelines, you can visit our [website](https://openassistantgpt.io/).

![image](https://github.com/marcolivierbouch/OpenAssistantGPT/assets/29548847/2c7d0684-0edf-4e9e-bd60-271efb8f8d22)


## How to create my Chatbot

1. Open [OpenAI](https://openai.com/) and create an account.
2. Open [OpenAssistantGPT](https://openassistantgpt.io/) and create an account.
3. Set your OpenAI API key in your [OpenAssistantGPT dashboard](https://openassistantgpt.io/dashboard).
4. Create a crawler or upload your own file.
5. Create your chatbot with the file you uploaded.
6. Test your chatbot!

## Documentation
For full documentation, visit our [documentation](https://openassistantgpt.io/docs)

## Contributing

We love our contributors! Here's the list of who contributed:

<a href="https://github.com/marcolivierbouch/OpenAssistantGPT/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=marcolivierbouch/OpenAssistantGPT" />
</a>

## Tech Stack

Next.js – framework

TypeScript – language

Tailwind – CSS

Supabase – database

NextAuth.js – auth

Stripe – payments

Resend – emails

Vercel – deployments

## Repo Activity

![OpenAssistantGPT repo activity](https://repobeats.axiom.co/api/embed/d376259a3651f5bcb458c4f00efb9012cb400813.svg "Repobeats analytics image")

## Database Migrations

If you need to apply database migrations, run:

```bash
chmod +x scripts/apply-migrations.sh
./scripts/apply-migrations.sh
```

If you need to regenerate the Prisma client without creating a new migration:

```bash
chmod +x scripts/regenerate-client.sh
./scripts/regenerate-client.sh
```

### Fixing the Conversation Summary Table

If you're experiencing issues with conversation summaries not persisting, try these solutions in order:

#### 1. Node.js Script Fix (Easiest Method)

This is the simplest approach that uses Node.js to directly execute SQL:

```bash
# Run the Node.js script
node scripts/manual-fix.js
```

#### 2. Direct Migration Fix

This approach uses Prisma's migration system:

```bash
# Make the script executable
chmod +x scripts/direct-fix.sh

# Run the direct fix script
./scripts/direct-fix.sh
```

#### 3. Check Database Tables (Diagnostic)

If you want to check what tables exist in your database:

```bash
# Make the script executable
chmod +x scripts/check-db-tables.sh

# Run the check script
./scripts/check-db-tables.sh
```

#### 4. Create Summary Table

If you need to create the table directly:

```bash
# Make the script executable
chmod +x scripts/create-summary-table.sh

# Run the create table script
./scripts/create-summary-table.sh
```

#### 5. Simple Fix (Regenerate Client Only)

If you just need to regenerate the Prisma client:

```bash
# Make the script executable
chmod +x scripts/simple-fix.sh

# Run the simple fix script
./scripts/simple-fix.sh
```

After running any of these fixes, restart your development server for the changes to take effect.

### Applying the Conversation Summary Migration

To enable persistent conversation summaries, you need to apply the database migration:

```bash
# Make the script executable
chmod +x scripts/apply-migrations.sh

# Run the migration script
./scripts/apply-migrations.sh
```

Alternatively, you can run the Prisma commands directly:

```bash
# Apply the migration
npx prisma migrate dev --name add_conversation_summary

# Generate the Prisma client
npx prisma generate
```

This will create the necessary `ConversationSummary` table in your database and update the Prisma client to include the new model.

## Database Update Commands

To update your database schema with the new training-related fields, run the following commands:

```bash
# Generate the Prisma client based on your schema
npx prisma generate

# Push the schema changes to your database
npx prisma db push

# If you need to reset your database (WARNING: This will delete all data)
# npx prisma migrate reset

# To view your database in the Prisma Studio UI
# npx prisma studio
```

These commands will:
1. Generate the updated Prisma client with the new schema
2. Push the schema changes to your database without requiring a migration

After running these commands, restart your development server:

```bash
npm run dev
```

## Knowledge Integration Features

The system now includes a comprehensive knowledge integration strategy with four phases:

### Phase 1: Basic Integration
- Train Agent button in the LLM tab
- Knowledge source selection
- Basic file processing

### Phase 2: Content Processing
- Support for multiple content types (files, text, Q&A, websites, catalogs)
- Content combination for context
- Training status tracking

### Phase 3: Advanced Knowledge Processing
- Smart caching to avoid reprocessing unchanged content
- Text chunking for better retrieval
- Table of contents generation

### Phase 4: Optimization and User Experience
- Training options (Force Retrain, Optimize for Speed)
- Progress indicators and detailed status messages
- Keyword extraction and metadata optimization
- Cross-referencing between knowledge sources
