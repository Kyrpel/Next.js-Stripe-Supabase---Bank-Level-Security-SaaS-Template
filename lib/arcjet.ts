import arcjet, { tokenBucket, detectBot, shield } from "@arcjet/next";

export const aj = arcjet({
  key: process.env.ARCJET_KEY!, // Get from arcjet.com
  rules: [
    // Shield protects against common attacks (SQL injection, XSS, etc.)
    shield({
      mode: "LIVE", // Change to "LIVE" after testing
    }),
    // Bot detection
    detectBot({
      mode: "LIVE",
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Allow Google, Bing, etc.
      ],
    }),
    // Rate limiting for API routes
    tokenBucket({
      mode: "LIVE",
      characteristics: ["ip.src"],
      refillRate: 10, // 10 tokens per interval
      interval: 60, // 60 seconds
      capacity: 100, // Max 100 requests per minute
    }),
  ],
});

// More restrictive rate limiting for sensitive endpoints
export const ajStrict = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    shield({ mode: "LIVE" }),
    detectBot({ mode: "LIVE", allow: [] }), // No bots allowed
    tokenBucket({
      mode: "LIVE",
      characteristics: ["ip.src"],
      refillRate: 5, // 5 tokens per interval
      interval: 60, // 60 seconds
      capacity: 20, // Max 20 requests per minute
    }),
  ],
});

// Auth endpoint rate limiting (prevents brute force)
export const ajAuth = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    shield({ mode: "LIVE" }),
    detectBot({ mode: "LIVE", allow: [] }),
    tokenBucket({
      mode: "LIVE",
      characteristics: ["ip.src"],
      refillRate: 3, // 3 attempts
      interval: 300, // per 5 minutes
      capacity: 5, // Max 5 attempts
    }),
  ],
});
