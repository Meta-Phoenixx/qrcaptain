import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ResendOTPPasswordReset } from "./ResendOTPPasswordReset";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Password({
      reset: ResendOTPPasswordReset,
      profile(params) {
        const ALLOWED_SIGNUP_ROLES = ["owner", "mechanic", "fleet_manager"];
        const requestedRole = params.role as string;
        const role = ALLOWED_SIGNUP_ROLES.includes(requestedRole) ? requestedRole : "owner";
        const isMechanic = role === "mechanic";
        
        // Parse firstName and lastName from params or name
        const firstName = params.firstName as string || "";
        const lastName = params.lastName as string || "";
        
        // Base profile - email is required by Convex Auth
        const baseProfile = {
          email: params.email as string,
          name: params.name as string,
          firstName,
          lastName,
          role,
          isActive: true,
        };
        
        // Mechanics need onboarding (company name, phone, license)
        if (isMechanic) {
          return {
            ...baseProfile,
            companyName: params.companyName as string,
            phone: params.phone as string,
            onboardingCompleted: false,
          };
        }

        // Owners need onboarding (address, vessel info)
        if (role === "owner") {
          return {
            ...baseProfile,
            onboardingCompleted: false,
          };
        }

        // fleet_manager and captain have no onboarding step — mark complete immediately
        return baseProfile;
      },
    }),
  ],
});
