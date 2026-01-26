// src/lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Driver from "@/models/Driver";
import Garage from "@/models/Garage";
import type { UserRole } from "@/models/User";
import type { OnboardingStatus } from "@/models/Driver";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        autoLoginToken: { label: "Auto Login Token", type: "text" },
      },
      async authorize(credentials) {
        await connectDB();

        // Check for auto-login token first (used after email verification)
        if (credentials?.autoLoginToken) {
          const user = await User.findOne({
            autoLoginToken: credentials.autoLoginToken,
            autoLoginTokenExpires: { $gt: new Date() },
          });

          if (user) {
            // Clear the token after use (one-time use)
            user.autoLoginToken = undefined;
            user.autoLoginTokenExpires = undefined;
            await user.save();

            console.log("Auto-login successful for:", user.email);

            // Fetch additional data for drivers
            let onboardingStatus: OnboardingStatus | undefined;
            let canAcceptJobs: boolean | undefined;

            if (user.role === "driver" && user.driverProfile) {
              const driver = await Driver.findById(user.driverProfile);
              if (driver) {
                onboardingStatus = driver.onboardingStatus;
                canAcceptJobs = driver.canAcceptJobs;
              }
            }

            // Fetch additional data for garages
            let linkedGarageName: string | undefined;
            let linkedGarageAddress: string | undefined;
            let linkedGaragePlaceId: string | undefined;
            let garageStatus: string | undefined;

            if (user.role === "garage" && user.garageProfile) {
              const garage = await Garage.findById(user.garageProfile);
              if (garage) {
                linkedGarageName = garage.linkedGarageName;
                linkedGarageAddress = garage.linkedGarageAddress;
                linkedGaragePlaceId = garage.linkedGaragePlaceId;
                garageStatus = garage.status;
              }
            }

            return {
              id: user._id.toString(),
              username: user.username,
              email: user.email,
              role: user.role || "user",
              isApproved: user.isApproved ?? true,
              onboardingStatus,
              canAcceptJobs,
              linkedGarageName,
              linkedGarageAddress,
              linkedGaragePlaceId,
              garageStatus,
            };
          }

          // Invalid or expired auto-login token
          return null;
        }

        // Standard email/password login
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await User.findOne({
          email: credentials.email.toLowerCase(),
        });

        if (!user) {
          throw new Error("No user found with this email");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

        // Check account status - prevent suspended or deleted users from logging in
        if (user.accountStatus === "suspended") {
          throw new Error("Your account has been suspended. Please contact support.");
        }
        if (user.accountStatus === "deleted") {
          throw new Error("This account no longer exists.");
        }

        // Check email verification for regular users
        // Skip for admin, garage, and driver roles as they may use different verification flows
        if (user.role === "user" && !user.emailVerified) {
          throw new Error("Please verify your email before signing in. Check your inbox for the verification link.");
        }

        // If user is a driver, fetch their onboarding status
        let onboardingStatus: OnboardingStatus | undefined;
        let canAcceptJobs: boolean | undefined;

        if (user.role === "driver" && user.driverProfile) {
          const driver = await Driver.findById(user.driverProfile);
          if (driver) {
            onboardingStatus = driver.onboardingStatus;
            canAcceptJobs = driver.canAcceptJobs;
          }
        }

        // If user is a garage, fetch their linked garage data
        let linkedGarageName: string | undefined;
        let linkedGarageAddress: string | undefined;
        let linkedGaragePlaceId: string | undefined;
        let garageStatus: string | undefined;

        if (user.role === "garage" && user.garageProfile) {
          const garage = await Garage.findById(user.garageProfile);
          if (garage) {
            linkedGarageName = garage.linkedGarageName;
            linkedGarageAddress = garage.linkedGarageAddress;
            linkedGaragePlaceId = garage.linkedGaragePlaceId;
            garageStatus = garage.status;
          }
        }

        return {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role || "user",
          isApproved: user.isApproved ?? true,
          onboardingStatus,
          canAcceptJobs,
          linkedGarageName,
          linkedGarageAddress,
          linkedGaragePlaceId,
          garageStatus,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.email = user.email;
        token.role = user.role as UserRole;
        token.isApproved = user.isApproved;
        token.onboardingStatus = user.onboardingStatus;
        token.canAcceptJobs = user.canAcceptJobs;
        // Garage data
        token.linkedGarageName = user.linkedGarageName;
        token.linkedGarageAddress = user.linkedGarageAddress;
        token.linkedGaragePlaceId = user.linkedGaragePlaceId;
        token.garageStatus = user.garageStatus;
      }

      // Refresh driver status on session update
      if (trigger === "update" && token.role === "driver") {
        await connectDB();
        const dbUser = await User.findById(token.id);
        if (dbUser?.driverProfile) {
          const driver = await Driver.findById(dbUser.driverProfile);
          if (driver) {
            token.isApproved = dbUser.isApproved;
            token.onboardingStatus = driver.onboardingStatus;
            token.canAcceptJobs = driver.canAcceptJobs;
          }
        }
      }

      // Refresh garage status on session update
      if (trigger === "update" && token.role === "garage") {
        await connectDB();
        const dbUser = await User.findById(token.id);
        if (dbUser?.garageProfile) {
          const garage = await Garage.findById(dbUser.garageProfile);
          if (garage) {
            token.isApproved = dbUser.isApproved;
            token.linkedGarageName = garage.linkedGarageName;
            token.linkedGarageAddress = garage.linkedGarageAddress;
            token.linkedGaragePlaceId = garage.linkedGaragePlaceId;
            token.garageStatus = garage.status;
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.email = token.email as string;
        session.user.role = token.role as UserRole;
        session.user.isApproved = token.isApproved as boolean;
        session.user.onboardingStatus = token.onboardingStatus as OnboardingStatus | undefined;
        session.user.canAcceptJobs = token.canAcceptJobs as boolean | undefined;
        session.user.linkedGarageName = token.linkedGarageName as string | undefined;
        session.user.linkedGarageAddress = token.linkedGarageAddress as string | undefined;
        session.user.linkedGaragePlaceId = token.linkedGaragePlaceId as string | undefined;
        session.user.garageStatus = token.garageStatus as string | undefined;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
