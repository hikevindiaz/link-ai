import { openai } from '@ai-sdk/openai';
import { fireworks } from '@ai-sdk/fireworks';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

// Create a simple provider object that works with both v3 and v4 of the ai package
export const myProvider = isTestEnvironment
  ? {
      languageModel: (modelName: string) => {
        const models = {
          'chat-model-small': chatModel,
          'chat-model-large': chatModel,
          'chat-model-reasoning': reasoningModel,
          'title-model': titleModel,
          'artifact-model': artifactModel,
        };
        return models[modelName] || models['chat-model-small'];
      },
      imageModel: () => null,
    }
  : {
      languageModel: (modelName: string) => {
        const models = {
          'chat-model-small': openai('gpt-4.1-nano-2025-04-14'),
          'chat-model-large': openai('gpt-4o'),
          'chat-model-reasoning': fireworks('accounts/fireworks/models/deepseek-r1'),
          'title-model': openai('gpt-4-turbo'),
          'artifact-model': openai('gpt-4o-mini'),
        };
        return models[modelName] || models['chat-model-small'];
      },
      imageModel: (modelName: string) => {
        const models = {
          'small-model': openai.image('dall-e-2'),
          'large-model': openai.image('dall-e-3'),
        };
        return models[modelName] || models['small-model'];
      },
    };
