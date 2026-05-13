import { flushAuditLogWrites } from './utils/audit-log-writer.js';

const destroy = async ({ strapi }) => {
  await flushAuditLogWrites({ strapi, reason: 'plugin destroy' });
};

export default destroy;