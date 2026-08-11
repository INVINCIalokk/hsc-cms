'use strict';

/**
 * theorem service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::theorem.theorem');
