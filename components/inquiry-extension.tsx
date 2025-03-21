import { Button } from './ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useState } from 'react';
import { toast } from './ui/use-toast';
import { Icons } from './icons';
import { ClientSideChatbotProps } from './chat-sdk';

export function SupportInquiry({chatbot,  threadId}: {chatbot: ClientSideChatbotProps, threadId?: string}) {
    const [open, setOpen] = useState(false);

    const [userEmail, setUserEmail] = useState('');
    const [userMessage, setUserMessage] = useState('');

    const [inquiryLoading, setInquiryLoading] = useState(false);
    const [hideInquiry, setHideInquiry] = useState(false);

    async function handleInquirySubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setInquiryLoading(true)

        const response = await fetch(`/api/chatbots/${chatbot.id}/inquiries`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chatbotId: chatbot.id,
                threadId: threadId || '',
                email: userEmail,
                inquiry: userMessage,
            }),
        })

        if (response.ok) {
            toast({
                title: 'Inquiry sent',
                description: 'Your inquiry has been sent successfully',
            })
        } else if (response.status === 409) {
            toast({
                title: 'Inquiry already sent',
                description: 'You have already sent an inquiry for this conversation',
                variant: 'destructive',
            })
        } else {
            console.error(`Failed to send inquiry: ${response}`)
            toast({
                title: 'Error',
                description: 'Failed to send inquiry',
                variant: 'destructive'
            })
        }
        // close dialog
        setOpen(false)
        setInquiryLoading(false)
        setHideInquiry(true)
    }

    if (hideInquiry) {
        return null;
    }

    return (
        <div className={`relative`}>
            <button
                onClick={() => {
                    setHideInquiry(true);
                }}
                className="bg-zinc-100 shadow hover:bg-zinc-200 border rounded absolute top-0 right-0 -mt-1 -mr-1"
            >
                <Icons.close className="h-4 w-4 text-black" />
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button className="w-full bg-white" variant="outline">
                        {chatbot.inquiryLinkText}
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleInquirySubmit}>
                        <DialogHeader>
                            <DialogTitle className="text-black">{chatbot.inquiryTitle}</DialogTitle>
                            <DialogDescription className="text-black">
                                {chatbot.inquirySubtitle}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4 w-full">
                            <div className="gap-4">
                                <Label htmlFor="name" className="text-right text-black">
                                    {chatbot.inquiryEmailLabel}
                                </Label>
                                <Input onChange={(e) => setUserEmail(e.target.value)} className="bg-white text-black" id="email" pattern=".+@.+\..+" type="email" />
                            </div>
                            <div className="gap-4">
                                <Label htmlFor="username" className="text-right text-black">
                                    {chatbot.inquiryMessageLabel}
                                </Label>
                                <Textarea onChange={(e) => setUserMessage(e.target.value)} className="min-h-[100px] text-black" id="message" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={inquiryLoading}>
                                {chatbot.inquirySendButtonText}
                                {inquiryLoading && (
                                    <Icons.spinner className="ml-2 mr-2 h-5 w-5 animate-spin" />
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}