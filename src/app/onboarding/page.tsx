"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { GitHubOnboarding } from "@/components/github-onboarding";

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();

  const githubStatus = useQuery(
    api.users.getGitHubStatus,
    user?.id ? { clerkId: user.id } : "skip"
  );

  // No auto-redirect - users can access onboarding to manage GitHub settings

  const handleComplete = () => {
    router.push("/");
  };

  // Show back button if user is already connected (managing settings)
  const showBack = githubStatus?.connected;

  return <GitHubOnboarding onComplete={handleComplete} showBackButton={showBack} />;
}
