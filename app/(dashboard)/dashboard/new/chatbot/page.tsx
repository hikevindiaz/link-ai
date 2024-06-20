"use client"; // This line must be added at the top

import { redirect } from "next/navigation";
import React, { useState } from 'react';
import { NewChatbotForm } from "@/components/new-chatbot-form";
import { DashboardHeader } from "@/components/header";
import { DashboardShell } from "@/components/shell";
import { authOptions } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";

export default async function ChatbotCreatePage() {
    const user = await getCurrentUser();
    if (!user) {
        redirect(authOptions?.pages?.signIn || "/login");
    }

    const [linkCallingEnabled, setLinkCallingEnabled] = useState(false);

    const handleToggle = () => {
        setLinkCallingEnabled(!linkCallingEnabled);
    };

    return (
        <DashboardShell>
            <DashboardHeader heading="Create your chatbot" text="Create your chatbot and start talking with him.">
                <Link
                    href="/dashboard"
                    className={cn(buttonVariants({ variant: "ghost" }), "md:left-8 md:top-8")}
                >
                    <>
                        <Icons.chevronLeft className="mr-2 h-4 w-4" />
                        Back
                    </>
                </Link>
            </DashboardHeader>

            <div className="grid gap-10">
                <NewChatbotForm user={user} isOnboarding={false} />

                {/* Link Calling Toggle */}
                <div>
                    <label>
                        Link Calling:
                        <input
                            type="checkbox"
                            checked={linkCallingEnabled}
                            onChange={handleToggle}
                        />
                    </label>
                </div>

                {/* Conditionally render Twilio configuration fields if Link Calling is enabled */}
                {linkCallingEnabled && (
                    <div>
                        <h2>Configure Twilio</h2>
                        <div>
                            <label>
                                Twilio Account SID:
                                <input type="text" name="twilioAccountSid" />
                            </label>
                        </div>
                        <div>
                            <label>
                                Twilio Auth Token:
                                <input type="text" name="twilioAuthToken" />
                            </label>
                        </div>
                        <div>
                            <label>
                                Twilio Phone Number:
                                <input type="text" name="twilioPhoneNumber" />
                            </label>
                        </div>
                    </div>
                )}
            </div>
        </DashboardShell>
    );
}
