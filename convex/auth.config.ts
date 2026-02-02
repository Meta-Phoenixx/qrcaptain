export default {
  providers: [
    {
      // This configures Convex to accept JWTs signed by @convex-dev/auth
      // The domain must match SITE_URL or the Convex site URL
      domain: "https://tame-grasshopper-654.convex.site",
      applicationID: "convex",
    },
  ],
};
