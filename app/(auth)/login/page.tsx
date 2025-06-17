import Link from "next/link";
import { Metadata } from "next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import LoginForm from './LoginForm'; // Import the new client component

export const metadata: Metadata = {
  title: "Login | Link AI",
  description: "Login to your account",
};

export default async function Login() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <LoginForm />
    </div>
  );
}