'use strict';

/**
 * standard service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::standard.standard');
