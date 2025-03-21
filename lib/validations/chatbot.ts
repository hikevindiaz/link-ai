import * as z from "zod"

export const chatbotSchema = z.object({
    name: z.string().min(1).max(50),
    prompt: z.string().optional().default("You are a helpful assistant."),
    openAIKey: z.string().optional(),
    modelId: z.string(),
    files: z.array(z.string()),
    welcomeMessage: z.string().optional().default("Hello! How can I help you today?"),
    chatbotErrorMessage: z.string().optional().default("Oops! An error has occurred. If the issue persists, feel free to reach out to our support team for assistance. We're here to help!"),
    rightToLeftLanguage: z.boolean().optional().default(false),
})
