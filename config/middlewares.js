module.exports = ({ env }) => [
  "strapi::logger",
  "strapi::errors",
  "global::https-enforcer",
  {
    name: "strapi::security",
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "connect-src": ["'self'", "https:", "http:"],
          "img-src": [
            "'self'",
            "data:",
            "blob:",
            "market-assets.strapi.io",
            "*.strapi.io",
            "*.amazonaws.com",
            `${env("AWS_BUCKET")}.s3.${env("AWS_REGION", "ap-south-1")}.amazonaws.com`,
            env("AWS_CDN_URL", ""),
            env("PUBLIC_URL", "https://api.invincialok.in"),
            env("FRONTEND_URL", "https://app.invincialok.in"),
          ].filter(Boolean),
          "media-src": [
            "'self'",
            "data:",
            "blob:",
            "market-assets.strapi.io",
            "*.strapi.io",
            "*.amazonaws.com",
            `${env("AWS_BUCKET")}.s3.${env("AWS_REGION", "ap-south-1")}.amazonaws.com`,
            env("AWS_CDN_URL", ""),
            env("PUBLIC_URL", "https://api.invincialok.in"),
          ].filter(Boolean),
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: "strapi::cors",
    config: {
      origin: [
        env("FRONTEND_URL", "https://app.invincialok.in"),
        env("PUBLIC_URL", "https://api.invincialok.in"),
        "https://app.invincialok.in",
        "https://api.invincialok.in",
        "http://localhost:3000",
        "http://localhost:1337",
        "https://*.invincialok.in",
      ],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
      headers: ["Content-Type", "Authorization", "Origin", "Accept"],
      keepHeaderOnError: true,
    },
  },
  "strapi::poweredBy",
  "strapi::query",
  "strapi::body",
  {
    name: "strapi::session",
    config: {
      cookie: {
        secure: true,
        sameSite: "lax",
      },
    },
  },
  "strapi::favicon",
  "strapi::public",
];
