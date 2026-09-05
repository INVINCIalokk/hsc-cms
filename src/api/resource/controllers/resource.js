'use strict';

/**
 * resource controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::resource.resource', ({ strapi }) => ({
  /**
   * Intercept create to validate hierarchy constraints
   */
  async create(ctx) {
    const { data } = ctx.request.body || {};
    try {
      await strapi.service('api::resource.resource').validateHierarchy({ data });
    } catch (err) {
      return ctx.badRequest(err.message);
    }
    return super.create(ctx);
  },

  /**
   * Intercept update to validate hierarchy constraints
   */
  async update(ctx) {
    const { id } = ctx.params;
    const { data } = ctx.request.body || {};
    try {
      await strapi.service('api::resource.resource').validateHierarchy({ documentId: id, data });
    } catch (err) {
      return ctx.badRequest(err.message);
    }
    return super.update(ctx);
  },

  /**
   * GET /api/resources/tree
   * Returns complete hierarchical nested tree of folders and links
   */
  async getTree(ctx) {
    try {
      const status = ctx.query.status || 'published';
      const tree = await strapi.service('api::resource.resource').getTree({ status });
      return { data: tree };
    } catch (err) {
      return ctx.internalServerError(err.message);
    }
  },

  /**
   * GET /api/resources/root
   * Returns root folder items and breadcrumb
   */
  async getRoot(ctx) {
    try {
      const status = ctx.query.status || 'published';
      const result = await strapi.service('api::resource.resource').getFolderContents({
        folderId: 'root',
        status,
      });
      return { data: result };
    } catch (err) {
      return ctx.internalServerError(err.message);
    }
  },

  /**
   * GET /api/resources/folder/:id
   * Returns immediate items inside folder plus breadcrumb ancestor path
   */
  async getFolderContents(ctx) {
    const { id } = ctx.params;
    if (!id) {
      return ctx.badRequest('Folder ID is required.');
    }

    try {
      const status = ctx.query.status || 'published';
      const result = await strapi.service('api::resource.resource').getFolderContents({
        folderId: id,
        status,
      });

      if (!result) {
        return ctx.notFound('Folder not found.');
      }

      return { data: result };
    } catch (err) {
      if (err.message && err.message.includes('not a folder')) {
        return ctx.badRequest(err.message);
      }
      return ctx.internalServerError(err.message);
    }
  },
}));
