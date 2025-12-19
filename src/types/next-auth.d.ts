// src/types/next-auth.d.ts
import "next-auth";
import type { UserRole } from "@/models/User";
import type { OnboardingStatus } from "@/models/Driver";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      username: string;
      role: UserRole;
      isApproved: boolean;
      // Driver-specific onboarding fields
      onboardingStatus?: OnboardingStatus;
      canAcceptJobs?: boolean;
      // NOTE: insuranceEligible is derived server-side, not stored in token
    };
  }

  interface User {
    id: string;
    email: string;
    username: string;
    role: UserRole;
    isApproved: boolean;
    onboardingStatus?: OnboardingStatus;
    canAcceptJobs?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    username: string;
    role: UserRole;
    isApproved: boolean;
    onboardingStatus?: OnboardingStatus;
    canAcceptJobs?: boolean;
  }
}
