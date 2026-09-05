'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/resources/tree',
      handler: 'resource.getTree',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/resources/folder/:id',
      handler: 'resource.getFolderContents',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/resources/root',
      handler: 'resource.getRoot',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
