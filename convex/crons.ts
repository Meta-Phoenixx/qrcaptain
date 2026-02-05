import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Send onboarding reminder notifications twice daily
// Runs at 9 AM and 6 PM UTC (adjust based on your target timezone)
crons.cron(
  "send morning onboarding reminders",
  "0 9 * * *", // 9 AM UTC daily
  internal.notifications.sendOnboardingReminders
);

crons.cron(
  "send evening onboarding reminders",
  "0 18 * * *", // 6 PM UTC daily
  internal.notifications.sendOnboardingReminders
);

export default crons;
