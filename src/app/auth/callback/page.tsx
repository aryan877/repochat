"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

/**
 * GitHub App Installation Callback
 *
 * After installing the GitHub App on GitHub.com, users are redirected here.
 * This page handles the post-installation redirect and sends users back to onboarding
 * where they can link the installation to their account.
 */
function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isLoaded } = useUser();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("Processing...");

  useEffect(() => {
    if (!isLoaded) return;

    // GitHub App installation callback params
    const installationId = searchParams.get("installation_id");
    const setupAction = searchParams.get("setup_action");

    if (installationId) {
      // User completed GitHub App installation
      if (setupAction === "install") {
        setStatus("success");
        setMessage("GitHub App installed successfully");
      } else if (setupAction === "update") {
        setStatus("success");
        setMessage("GitHub App permissions updated");
      }

      // Redirect to onboarding to link the installation
      setTimeout(() => router.push("/onboarding"), 1500);
      return;
    }

    // Check for errors
    const error = searchParams.get("error");
    if (error) {
      setStatus("error");
      setMessage(searchParams.get("error_description") || "Authorization denied");
      return;
    }

    // No valid params, redirect to onboarding
    router.push("/onboarding");
  }, [isLoaded, searchParams, router]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        {status === "loading" && (
          <>
            <div className="w-8 h-8 border-2 border-[#292929] border-t-[#fafafa] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#a3a3a3] text-sm">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <svg className="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-[#fafafa] text-sm">{message}</p>
            <p className="text-[#525252] text-xs mt-1">Redirecting to setup...</p>
          </>
        )}

        {status === "error" && (
          <>
            <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <p className="text-[#fafafa] text-sm">Something went wrong</p>
            <p className="text-[#525252] text-xs mt-1">{message}</p>
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
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#292929] border-t-[#fafafa] rounded-full animate-spin" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
