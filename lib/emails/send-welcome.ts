import FounderWelcomeEmail from "@/emails/welcome";
import { siteConfig } from "@/config/site";
import { email as EmailClient } from "@/lib/email";


export async function sendWelcomeEmail({ name, email }: { name: string | null | undefined, email: string | null | undefined }) {
    const emailTemplate = FounderWelcomeEmail({ name, theme: 'light' });
    try {
        // Send the email using the Resend API
        await EmailClient.emails.send({
            from: "Link AI <no-reply@getlinkai.com>",
            to: email as string,
            subject: "Kevin sent you a direct message 💬",
            react: emailTemplate,
        });
    } catch (error) {
        // Log any errors and re-throw the error
        console.log({ error });
        //throw error;
    }
}