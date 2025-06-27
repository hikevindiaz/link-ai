import Link from "next/link";
import { Metadata } from "next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import LoginForm from './LoginForm'; // Import the new client component
import InvitationHandler from './InvitationHandler';

export const metadata: Metadata = {
  title: "Login | Link AI",
  description: "Login to your account",
};

interface LoginPageProps {
  searchParams: { invite?: string; error?: string };
}

export default async function Login({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  const inviteToken = searchParams.invite;
  const error = searchParams.error;

  if (user) {
    redirect("/dashboard");
  }

  // If there's an invite token, show the invitation handler
  if (inviteToken) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <InvitationHandler token={inviteToken} />
      </div>
    );
  }

  // Otherwise show the normal login form
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <LoginForm error={error} />
    </div>
  );
}