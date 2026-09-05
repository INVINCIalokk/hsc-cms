'use strict';

/**
 * resource service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::resource.resource', ({ strapi }) => ({
  /**
   * Validate hierarchy to prevent cyclical dependencies and invalid relationships.
   */
  async validateHierarchy({ documentId, data, status = 'published' }) {
    if (!data) return;

    // 1. Link cannot have children
    if (data.type === 'link' && Array.isArray(data.children) && data.children.length > 0) {
      throw new Error('A link resource cannot contain children.');
    }

    // If changing an existing resource to 'link', ensure it doesn't already have children
    if (documentId && data.type === 'link') {
      const existingChildren = await strapi.documents('api::resource.resource').findMany({
        filters: { parent: { documentId } },
        limit: 1,
      });
      if (existingChildren && existingChildren.length > 0) {
        throw new Error('Cannot change folder to link while it still contains child items.');
      }
    }

    // 2. Prevent self-parenting
    const parentTarget = data.parent?.documentId || (typeof data.parent === 'string' ? data.parent : null);
    if (documentId && parentTarget && documentId === parentTarget) {
      throw new Error('A resource cannot be its own parent.');
    }

    // 3. Prevent circular dependencies (setting parent to one of its descendants)
    if (documentId && parentTarget) {
      let currentParentId = parentTarget;
      const visited = new Set([documentId]);

      while (currentParentId) {
        if (visited.has(currentParentId)) {
          throw new Error('Circular dependency detected: A folder cannot be placed inside its own subfolder.');
        }
        visited.add(currentParentId);

        const parentDoc = await strapi.documents('api::resource.resource').findOne({
          documentId: currentParentId,
          populate: ['parent'],
        });

        if (!parentDoc || !parentDoc.parent) {
          break;
        }

        currentParentId = parentDoc.parent.documentId;
      }
    }

    // 4. Ensure target parent is actually a folder, not a link
    if (parentTarget) {
      const targetFolder = await strapi.documents('api::resource.resource').findOne({
        documentId: parentTarget,
      });
      if (targetFolder && targetFolder.type !== 'folder') {
        throw new Error('Parent resource must be a folder.');
      }
    }
  },

  /**
   * Build complete nested folder and file/link tree
   */
  async getTree({ status = 'published' } = {}) {
    const items = await strapi.documents('api::resource.resource').findMany({
      status,
      populate: {
        parent: {
          fields: ['documentId', 'title', 'type'],
        },
        file: true,
      },
      limit: 2000,
    });

    // Map each item for quick lookup
    const nodeMap = new Map();
    items.forEach((item) => {
      nodeMap.set(item.documentId, {
        documentId: item.documentId,
        id: item.id,
        title: item.title,
        type: item.type,
        url: item.url || null,
        file: item.file || null,
        parentId: item.parent ? item.parent.documentId : null,
        children: item.type === 'folder' ? [] : undefined,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      });
    });

    const rootNodes = [];

    nodeMap.forEach((node) => {
      if (node.parentId && nodeMap.has(node.parentId)) {
        const parentNode = nodeMap.get(node.parentId);
        if (parentNode.children) {
          parentNode.children.push(node);
        } else {
          rootNodes.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    // Sort folders first, then alphabetical by title
    const sortTree = (nodes) => {
      nodes.sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return a.title.localeCompare(b.title);
      });

      nodes.forEach((n) => {
        if (n.children && n.children.length > 0) {
          sortTree(n.children);
        }
      });
    };

    sortTree(rootNodes);
    return rootNodes;
  },

  /**
   * Get direct contents of a folder plus breadcrumb path
   */
  async getFolderContents({ folderId, status = 'published' }) {
    if (!folderId || folderId === 'root') {
      const items = await strapi.documents('api::resource.resource').findMany({
        filters: {
          parent: {
            $null: true,
          },
        },
        populate: ['file'],
        status,
        limit: 1000,
      });

      const sortedItems = items.sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return a.title.localeCompare(b.title);
      });

      return {
        folder: {
          documentId: 'root',
          title: 'Root',
          type: 'folder',
        },
        breadcrumbs: [{ documentId: 'root', title: 'Root' }],
        items: sortedItems,
      };
    }

    const folder = await strapi.documents('api::resource.resource').findOne({
      documentId: folderId,
      populate: ['parent'],
      status,
    });

    if (!folder) {
      return null;
    }

    if (folder.type !== 'folder') {
      throw new Error('Requested resource is not a folder.');
    }

    const children = await strapi.documents('api::resource.resource').findMany({
      filters: {
        parent: {
          documentId: folder.documentId,
        },
      },
      populate: ['file'],
      status,
      limit: 1000,
    });

    const sortedChildren = children.sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      return a.title.localeCompare(b.title);
    });

    // Build breadcrumbs path up to root
    const breadcrumbs = [{ documentId: folder.documentId, title: folder.title }];
    let current = folder;
    const visited = new Set([current.documentId]);

    while (current.parent && !visited.has(current.parent.documentId)) {
      visited.add(current.parent.documentId);
      const parentDoc = await strapi.documents('api::resource.resource').findOne({
        documentId: current.parent.documentId,
        populate: ['parent'],
        status,
      });
      if (!parentDoc) break;
      breadcrumbs.unshift({ documentId: parentDoc.documentId, title: parentDoc.title });
      current = parentDoc;
    }
    breadcrumbs.unshift({ documentId: 'root', title: 'Root' });

    return {
      folder: {
        documentId: folder.documentId,
        id: folder.id,
        title: folder.title,
        type: folder.type,
      },
      breadcrumbs,
      items: sortedChildren,
    };
  },
}));
