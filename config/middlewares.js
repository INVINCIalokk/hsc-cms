module.exports = ({ env }) => [
  "strapi::logger",
  "strapi::errors",
  "global::https-enforcer",
  "strapi::security",
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