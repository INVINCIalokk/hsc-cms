'use strict';

/**
 * standard controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::standard.standard');
