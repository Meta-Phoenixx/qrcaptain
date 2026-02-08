import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ResendOTPPasswordReset } from "./ResendOTPPasswordReset";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Password({
      reset: ResendOTPPasswordReset,
      profile(params) {
        const role = (params.role as string) || "owner";
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
        
        // Add mechanic-specific fields if signing up as mechanic
        if (isMechanic) {
          return {
            ...baseProfile,
            companyName: params.companyName as string,
            phone: params.phone as string,
            // Mechanics start with onboarding incomplete
            onboardingCompleted: false,
          };
        }
        
        // Owners also start with onboarding incomplete
        return {
          ...baseProfile,
          onboardingCompleted: false,
        };
      },
    }),
  ],
});
