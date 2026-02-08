// Convex environment variables are available via process.env at runtime
declare const process: { env: Record<string, string | undefined> };

export default {
  providers: [
    {
      // Uses the SITE_URL environment variable set in your Convex dashboard.
      // This must match the Convex HTTP actions URL (e.g. https://your-deployment.convex.site)
      domain: process.env.SITE_URL,
      applicationID: "convex",
    },
  ],
};
