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
      <Link
        href="https://www.getlinkai.com/"
        className="group absolute left-4 top-4 md:left-8 md:top-8 text-white"
      >
        <Icons.chevronLeft className="mr-2 h-4 w-4 text-white group-hover:text-black" />
        <span className="group-hover:text-black"></span>
      </Link>
      <LoginForm /> {/* Use the client component here */}
    </div>
  );
}