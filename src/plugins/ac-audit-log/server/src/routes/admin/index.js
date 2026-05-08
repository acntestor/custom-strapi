export default {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/filter-options',
      handler: 'audit-log.filterOptions',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/logs',
      handler: 'audit-log.find',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/logs/:id',
      handler: 'audit-log.findOne',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
};