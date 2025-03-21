import * as z from "zod";

export const agentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  welcomeMessage: z.string().min(1, "Welcome message is required").max(500, "Welcome message must be less than 500 characters"),
  prompt: z.string().min(1, "Prompt is required").max(10000, "Prompt must be less than 10000 characters"),
  errorMessage: z.string().min(1, "Error message is required").max(500, "Error message must be less than 500 characters"),
  language: z.string().min(2, "Language is required"),
  secondLanguage: z.string().default("none"),
});

export type AgentFormValues = z.infer<typeof agentSchema>; 