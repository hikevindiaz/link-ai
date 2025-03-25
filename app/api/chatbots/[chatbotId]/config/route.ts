import { db } from "@/lib/db";
import { z } from "zod";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const routeContextSchema = z.object({
    params: z.object({
        chatbotId: z.string(),
    }),
})

export async function GET(
    req: Request,
    context: z.infer<typeof routeContextSchema>
) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return new Response("Unauthorized", { status: 401 });
        }

        const { params } = routeContextSchema.parse(context)

        // Get chatbot and verify ownership
        const chatbot = await db.chatbot.findUnique({
            where: {
                id: params.chatbotId,
                userId: session.user.id, // Ensure the chatbot belongs to the user
            },
            select: {
                id: true,
                welcomeMessage: true,
                displayBranding: true,
                chatTitle: true,
                chatMessagePlaceHolder: true,
                bubbleColor: true,
                bubbleTextColor: true,
                chatHeaderBackgroundColor: true,
                chatHeaderTextColor: true,
                chatbotReplyBackgroundColor: true,
                chatbotReplyTextColor: true,
                userReplyBackgroundColor: true,
                userReplyTextColor: true,
                inquiryEnabled: true,
                inquiryLinkText: true,
                inquiryTitle: true,
                inquirySubtitle: true,
                inquiryMessageLabel: true,
                inquiryEmailLabel: true,
                inquirySendButtonText: true,
                inquiryAutomaticReplyText: true,
                inquiryDisplayLinkAfterXMessage: true,
                chatbotLogoURL: true,
                chatFileAttachementEnabled: true,
            },
        })

        if (!chatbot) {
            return new Response("Not found", { status: 404 });
        }

        return new Response(JSON.stringify(chatbot))
    } catch (error) {
        console.log(error)
        return new Response(null, { status: 500 })
    }
}