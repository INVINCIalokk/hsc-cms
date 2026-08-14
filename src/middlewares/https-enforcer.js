'use strict';

/**
 * HTTPS Proxy Enforcer Middleware for Cloudflare Tunnel / Reverse Proxies
 */

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    if (
      ctx.request.header['x-forwarded-proto'] === 'https' ||
      ctx.request.header['x-forwarded-ssl'] === 'on' ||
      process.env.NODE_ENV === 'production'
    ) {
      ctx.req.headers['x-forwarded-proto'] = 'https';
      ctx.request.header['x-forwarded-proto'] = 'https';
      Object.defineProperty(ctx.request, 'secure', {
        get() {
          return true;
        },
        configurable: true,
      });
    }
    await next();
  };
};