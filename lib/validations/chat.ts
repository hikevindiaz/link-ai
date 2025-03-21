import * as z from "zod"

export const chatSchema = z.object({
    chatbotId: z.string().min(1),
    message: z.string().min(1),
    threadId: z.string().optional(),
    fileId: z.string().optional(),
})