// Mocked models.test.ts
// This file provides mock implementations for AI models used in tests

// Basic model structure that all models will follow
const createMockModel = (name: string) => ({
  name,
  id: `mock-${name}-id`,
  provider: 'mock-provider',
  description: `Mock ${name} model for testing`,
  contextWindow: 16000,
  maxTokens: 4000,
  temperature: 0.7,
  topP: 0.95,
  frequencyPenalty: 0,
  presencePenalty: 0,
});

// Export all the required models
export const chatModel = createMockModel('chatModel');
export const reasoningModel = createMockModel('reasoningModel');
export const titleModel = createMockModel('titleModel');
export const artifactModel = createMockModel('artifactModel');

// Original mockTest for backward compatibility
export const mockTest = {
  name: 'mockTest',
  description: 'Mock test model'
};

// Default export includes all models
export default {
  chatModel,
  reasoningModel,
  titleModel,
  artifactModel,
  mockTest
};
