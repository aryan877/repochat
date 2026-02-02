"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOAuthCallback = useAction(api.github.handleOAuthCallback);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      setStatus("error");
      setErrorMessage("Please sign in first");
      return;
    }

    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setErrorMessage(searchParams.get("error_description") || "Authorization denied");
      return;
    }

    if (!code) {
      setStatus("error");
      setErrorMessage("No authorization code received");
      return;
    }

    handleOAuthCallback({ clerkId: user.id, code })
      .then(() => {
        setStatus("success");
        setTimeout(() => router.push("/"), 1500);
      })
      .catch((err) => {
        setStatus("error");
        setErrorMessage(err.message || "Failed to connect GitHub");
      });
  }, [isLoaded, user, searchParams, handleOAuthCallback, router]);

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="text-center">
        {status === "loading" && (
          <>
            <div className="w-8 h-8 border-2 border-neutral-700 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-neutral-400 text-sm">Connecting to GitHub...</p>
          </>
        )}

        {status === "success" && (
          <>
            <svg className="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-white text-sm">Connected successfully</p>
            <p className="text-neutral-500 text-xs mt-1">Redirecting...</p>
          </>
        )}

        {status === "error" && (
          <>
            <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <p className="text-white text-sm">Connection failed</p>
            <p className="text-neutral-500 text-xs mt-1">{errorMessage}</p>
            <button
              onClick={() => router.push("/onboarding")}
              className="mt-4 px-4 py-2 text-sm text-[#525252] hover:text-[#fafafa] transition-colors"
            >
              ← Back to setup
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-neutral-700 border-t-white rounded-full animate-spin" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
