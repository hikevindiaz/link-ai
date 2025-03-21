// Define the Conversation interface
export interface Conversation {
  id: string;
  title: string;
  subtitle: string;
  updatedAt: Date;
  chatbotName: string; // Actual chatbot name associated with the thread
  unread: boolean;
  source?: string;
}

// Agent interface for agent selection
export interface Agent {
  id: string;
  name: string;
}

// Define a Message interface for the full thread messages
export interface Message {
  id: string;
  message: string;
  response: string;  // Agent's reply
  from: string;
  createdAt: string;
}

// Helper functions
export const getInitials = (title?: string) => {
  if (!title) return "";
  return title
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const truncateText = (text: string, maxLength: number) => {
  if (!text) return "";
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
}; 