import requestContextMiddleware from './middlewares/request-context.js';
import { getRequestContext } from './utils/request-context.js';
import { buildDiff } from './utils/diff.js';

const AUDIT_LOG_UID = 'plugin::ac-audit-log.audit-log';

const AUDITABLE_ACTIONS = [
  'create',
  'update',
  'delete',
  'publish',
  'unpublish',
];

const MAX_POPULATE_DEPTH = 4;

const shouldAudit = (context) => {
  if (!context?.uid) {
    return false;
  }

  if (context.uid === AUDIT_LOG_UID) {
    return false;
  }

  if (!context.uid.startsWith('api::')) {
    return false;
  }

  return AUDITABLE_ACTIONS.includes(context.action);
};

const getDisplayName = (user) => {
  if (!user) {
    return null;
  }

  return (
    user.username ||
    [user.firstname, user.lastname].filter(Boolean).join(' ') ||
    user.email ||
    null
  );
};

const normalizeAdminUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    actorType: 'admin',
    actorId: user.id || null,
    actorEmail: user.email || null,
    actorDisplayName: getDisplayName(user),
  };
};

const resolveActor = (requestContext = {}, result = null, before = null) => {
  const ctx = requestContext.ctx;
  const requestUser = ctx?.state?.user || ctx?.state?.auth?.credentials || null;

  const actorFromRequest = normalizeAdminUser(requestUser);

  if (actorFromRequest?.actorEmail || actorFromRequest?.actorId) {
    return actorFromRequest;
  }

  const actorFromResult =
    normalizeAdminUser(result?.updatedBy) ||
    normalizeAdminUser(result?.createdBy) ||
    normalizeAdminUser(before?.updatedBy) ||
    normalizeAdminUser(before?.createdBy);

  if (actorFromResult?.actorEmail || actorFromResult?.actorId) {
    return actorFromResult;
  }

  return {
    actorType: 'unknown',
    actorId: null,
    actorEmail: null,
    actorDisplayName: null,
  };
};

const getTargetDocumentId = (context, result) => {
  return (
    context.params?.documentId ||
    context.params?.data?.documentId ||
    result?.documentId ||
    null
  );
};

const getTargetEntityId = (result) => {
  return result?.id ? String(result.id) : null;
};

const getTargetLocale = (context, result) => {
  return (
    context.params?.locale ||
    context.params?.data?.locale ||
    result?.locale ||
    null
  );
};

const getModelSchema = (strapi, uid) => {
  return strapi.contentType(uid) || strapi.components?.[uid] || null;
};

const buildComponentPopulate = (strapi, componentUid, depth, visited = new Set()) => {
  if (!componentUid || depth <= 0 || visited.has(componentUid)) {
    return {};
  }

  const schema = strapi.components?.[componentUid];

  if (!schema?.attributes) {
    return {};
  }

  const nextVisited = new Set(visited);
  nextVisited.add(componentUid);

  return buildPopulateFromAttributes(strapi, schema.attributes, depth - 1, nextVisited);
};

const buildDynamicZonePopulate = (strapi, componentUids = [], depth, visited = new Set()) => {
  const on = {};

  componentUids.forEach((componentUid) => {
    const componentPopulate = buildComponentPopulate(
      strapi,
      componentUid,
      depth,
      visited
    );

    on[componentUid] = {
      populate: componentPopulate,
    };
  });

  return {
    on,
  };
};

const buildPopulateFromAttributes = (strapi, attributes = {}, depth, visited = new Set()) => {
  if (depth <= 0) {
    return {};
  }

  return Object.entries(attributes).reduce((populate, [attributeName, attribute]) => {
    if (!attribute?.type) {
      return populate;
    }

    if (attribute.type === 'media') {
      populate[attributeName] = true;
      return populate;
    }

    if (attribute.type === 'relation') {
      populate[attributeName] = true;
      return populate;
    }

    if (attribute.type === 'component' && attribute.component) {
      populate[attributeName] = {
        populate: buildComponentPopulate(
          strapi,
          attribute.component,
          depth,
          visited
        ),
      };

      return populate;
    }

    if (attribute.type === 'dynamiczone' && Array.isArray(attribute.components)) {
      populate[attributeName] = buildDynamicZonePopulate(
        strapi,
        attribute.components,
        depth,
        visited
      );

      return populate;
    }

    return populate;
  }, {});
};

const buildDeepPopulate = (strapi, uid) => {
  const schema = getModelSchema(strapi, uid);

  if (!schema?.attributes) {
    return {};
  }

  return buildPopulateFromAttributes(
    strapi,
    schema.attributes,
    MAX_POPULATE_DEPTH
  );
};

const fetchDocumentSnapshot = async (strapi, uid, options = {}) => {
  const { documentId, locale, status } = options;

  if (!documentId) {
    return null;
  }

  const params = {
    documentId,
    populate: buildDeepPopulate(strapi, uid),
  };

  if (locale) {
    params.locale = locale;
  }

  if (status) {
    params.status = status;
  }

  return strapi.documents(uid).findOne(params);
};

const getBeforeSnapshot = async (strapi, context) => {
  if (!['update', 'delete', 'publish', 'unpublish'].includes(context.action)) {
    return null;
  }

  const documentId = context.params?.documentId;

  if (!documentId) {
    return null;
  }

  try {
    return await fetchDocumentSnapshot(strapi, context.uid, {
      documentId,
      locale: context.params?.locale,
      status: context.params?.status,
    });
  } catch (error) {
    strapi.log.warn(
      `[ac-audit-log] Failed to load before snapshot for ${context.uid}: ${error.message}`
    );

    return null;
  }
};

const getAfterSnapshot = async (strapi, context, result) => {
  if (context.action === 'delete') {
    return null;
  }

  const documentId =
    result?.documentId ||
    context.params?.documentId ||
    context.params?.data?.documentId ||
    null;

  if (!documentId) {
    return result || null;
  }

  try {
    const after = await fetchDocumentSnapshot(strapi, context.uid, {
      documentId,
      locale: result?.locale || context.params?.locale,
      status: context.params?.status,
    });

    return after || result || null;
  } catch (error) {
    strapi.log.warn(
      `[ac-audit-log] Failed to load after snapshot for ${context.uid}: ${error.message}`
    );

    return result || null;
  }
};

const register = ({ strapi }) => {
  strapi.server.use(requestContextMiddleware({ strapi }));

  strapi.documents.use(async (context, next) => {
    if (!shouldAudit(context)) {
      return next();
    }

    const before = await getBeforeSnapshot(strapi, context);
    const result = await next();
    const after = await getAfterSnapshot(strapi, context, result);

    const requestContext = getRequestContext();
    const actor = resolveActor(requestContext, after || result, before);
    const diff = buildDiff(before, after);

    setImmediate(async () => {
      try {
        await strapi.plugin('ac-audit-log').service('audit-log').createLog({
          action: `entry.${context.action}`,
          category: 'entry',

          actorType: actor.actorType,
          actorId: actor.actorId,
          actorEmail: actor.actorEmail,
          actorDisplayName: actor.actorDisplayName,

          ip: requestContext.ip || null,
          userAgent: requestContext.userAgent || null,
          method: requestContext.method || null,
          path: requestContext.path || null,
          statusCode: requestContext.statusCode || null,
          requestId: requestContext.requestId || null,
          requestBody: requestContext.requestBody || null,

          contentTypeUid: context.uid,
          targetDocumentId: getTargetDocumentId(context, after || result),
          targetEntityId: getTargetEntityId(after || result),
          targetLocale: getTargetLocale(context, after || result),

          payload: {
            params: context.params || {},
          },

          before,
          after,
          diff,

          metadata: {
            contentTypeDisplayName:
              context.contentType?.info?.displayName || null,
            populateDepth: MAX_POPULATE_DEPTH,
          },
        });
      } catch (error) {
        strapi.log.error(
          `[ac-audit-log] Failed to create audit log: ${error.message}`
        );
      }
    });

    return result;
  });
};

export default register;