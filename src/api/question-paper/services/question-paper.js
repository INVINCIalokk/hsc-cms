'use strict';

/**
 * question-paper service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::question-paper.question-paper');
