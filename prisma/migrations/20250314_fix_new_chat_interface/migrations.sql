-- New tables to add (example - use your migration system)
CREATE TABLE IF NOT EXISTS Vote (
  id TEXT PRIMARY KEY,
  messageId TEXT NOT NULL,
  threadId TEXT NOT NULL,
  value INTEGER NOT NULL, -- 1 for upvote, -1 for downvote
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Document (
  id TEXT PRIMARY KEY,
  threadId TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  kind TEXT DEFAULT 'text',
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
