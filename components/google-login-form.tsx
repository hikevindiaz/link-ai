"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import LoadingDots from "@/components/loading-dots";
import { Icons } from "./icons";

export default function GoogleLoginForm() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
          const result = await signIn("google", {
            redirect: false,
            callbackUrl: searchParams?.get("from") || "/dashboard",
          });

          if (result?.error) {
            console.error("Login failed:", result.error);
            // Handle error appropriately
          }
        } catch (error) {
          console.error("Login error:", error);
        } finally {
          setLoading(false);
        }
      }}
      className="flex flex-col space-y-4"
    >
      <button
        disabled={loading}
        className={`${loading
          ? "cursor-not-allowed border-neutral-200 bg-neutral-100"
          : "border-black bg-white text-black hover:text-white hover:bg-black"
          } flex h-10 w-full items-center justify-center rounded-xl border text-sm transition-all focus:outline-none`}
      >
        {loading ? (
          <LoadingDots color="#808080" />
        ) : (
          <div className="flex flex-row">
            <Icons.google className="mr-2 h-4 w-4" />
            <p>Sign In With Google</p>
          </div>
        )}
      </button>
    </form>
  );
}