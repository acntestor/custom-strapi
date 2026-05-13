import requestContextMiddleware from './middlewares/request-context.js';
import { getRequestContext } from './utils/request-context.js';
import { buildDiff } from './utils/diff.js';
import { registerContentTypeBuilderEventAudit } from './utils/content-type-builder-event-audit.js';
import { enqueueAuditLogWrite } from './utils/audit-log-writer.js';

const AUDIT_LOG_UID = 'plugin::ac-audit-log.audit-log';
const DEFAULT_POPULATE_DEPTH = 4;

const normalizeAction = (action = '') => {
  return String(action || '').toLowerCase();
};

const isReadDocumentAction = (action = '') => {
  const normalizedAction = normalizeAction(action);
  return (
    normalizedAction.startsWith('find') ||
    normalizedAction.startsWith('count') ||
    normalizedAction.startsWith('read') ||
    normalizedAction === 'load'
  );
};

const isPublishAction = (action = '') => {
  const normalizedAction = normalizeAction(action);
  return normalizedAction.includes('publish') && !normalizedAction.includes('unpublish');
};

const isUnpublishAction = (action = '') => {
  return normalizeAction(action).includes('unpublish');
};

const isPublicationAction = (action = '') => {
  return isPublishAction(action) || isUnpublishAction(action);
};

const isDeleteAction = (action = '') => {
  const normalizedAction = normalizeAction(action);
  return (
    normalizedAction.includes('delete') ||
    normalizedAction.includes('remove') ||
    normalizedAction.includes('destroy')
  );
};

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

  if (isReadDocumentAction(context.action)) {
    return false;
  }

  return true;
};

const getPluginConfig = (strapi) => {
  return strapi.config.get('plugin::ac-audit-log') || {};
};

const getPopulateDepth = (strapi) => {
  const config = getPluginConfig(strapi);
  const depth = Number(config.populateDepth || DEFAULT_POPULATE_DEPTH);

  if (!Number.isFinite(depth) || depth < 1) {
    return DEFAULT_POPULATE_DEPTH;
  }

  return Math.floor(depth);
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

const resolveActor = (requestContext = {}, result = null) => {
  const actorFromRequestContext = {
    actorType: requestContext.actorType || 'unknown',
    actorId: requestContext.actorId || null,
    actorEmail: requestContext.actorEmail || null,
    actorDisplayName: requestContext.actorDisplayName || null,
  };

  if (actorFromRequestContext.actorEmail || actorFromRequestContext.actorId) {
    return actorFromRequestContext;
  }

  const ctx = requestContext.ctx;
  const requestUser =
    ctx?.state?.user ||
    ctx?.state?.auth?.credentials ||
    ctx?.state?.auth?.user ||
    null;

  const actorFromKoaState = normalizeAdminUser(requestUser);

  if (actorFromKoaState?.actorEmail || actorFromKoaState?.actorId) {
    return actorFromKoaState;
  }

  const actorFromResult =
    normalizeAdminUser(result?.updatedBy) || normalizeAdminUser(result?.createdBy);

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
    context.params?.locale || context.params?.data?.locale || result?.locale || null
  );
};

const getModelSchema = (strapi, uid) => {
  return strapi.contentType(uid) || strapi.components?.[uid] || null;
};

const buildComponentPopulate = (
  strapi,
  componentUid,
  depth,
  visited = new Set()
) => {
  if (!componentUid || depth <= 0 || visited.has(componentUid)) {
    return {};
  }

  const schema = strapi.components?.[componentUid];

  if (!schema?.attributes) {
    return {};
  }

  const nextVisited = new Set(visited);
  nextVisited.add(componentUid);

  return buildPopulateFromAttributes(
    strapi,
    schema.attributes,
    depth - 1,
    nextVisited
  );
};

const buildDynamicZonePopulate = (
  strapi,
  componentUids = [],
  depth,
  visited = new Set()
) => {
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

const buildPopulateFromAttributes = (
  strapi,
  attributes = {},
  depth,
  visited = new Set()
) => {
  if (depth <= 0) {
    return {};
  }

  return Object.entries(attributes).reduce(
    (populate, [attributeName, attribute]) => {
      if (!attribute?.type) {
        return populate;
      }

      if (attribute.type === 'media') {
        populate[attributeName] = true;
        return populate;
      }

      /**
       * Relations are intentionally populated one level only.
       * Do not recursively populate relation -> relation to avoid huge payloads
       * and circular structures.
       */
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

      if (
        attribute.type === 'dynamiczone' &&
        Array.isArray(attribute.components)
      ) {
        populate[attributeName] = buildDynamicZonePopulate(
          strapi,
          attribute.components,
          depth,
          visited
        );
        return populate;
      }

      return populate;
    },
    {}
  );
};

const buildDeepPopulate = (strapi, uid) => {
  const schema = getModelSchema(strapi, uid);

  if (!schema?.attributes) {
    return {};
  }

  return buildPopulateFromAttributes(
    strapi,
    schema.attributes,
    getPopulateDepth(strapi)
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
  if (isPublicationAction(context.action)) {
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
  if (isDeleteAction(context.action) || isPublicationAction(context.action)) {
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

const buildEmptyDiff = () => {
  return {
    changes: [],
    changedFields: [],
    hiddenFields: [],
  };
};

const getEvidenceDisplayMode = ({ action, before, after }) => {
  if (isPublicationAction(action)) {
    return 'publication-event';
  }

  if (isDeleteAction(action)) {
    return 'deleted-snapshot';
  }

  if (!before && after) {
    return 'initial-values';
  }

  return 'changed-fields';
};

const buildEvidenceDiff = ({ action, before, after }) => {
  if (isPublicationAction(action)) {
    return buildEmptyDiff();
  }

  return buildDiff(before, after);
};

const register = ({ strapi }) => {
  strapi.server.use(requestContextMiddleware({ strapi }));
  registerContentTypeBuilderEventAudit({ strapi });

  strapi.documents.use(async (context, next) => {
    if (!shouldAudit(context)) {
      return next();
    }

    const before = await getBeforeSnapshot(strapi, context);
    const result = await next();
    const after = await getAfterSnapshot(strapi, context, result);
    const requestContext = getRequestContext();
    const actor = resolveActor(requestContext, after || result);

    const diff = buildEvidenceDiff({
      action: context.action,
      before,
      after,
    });

    const evidenceDisplayMode = getEvidenceDisplayMode({
      action: context.action,
      before,
      after,
    });

    const auditLogData = {
      action: `entry.${context.action || 'write'}`,
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
      targetDocumentId: getTargetDocumentId(context, after || result || before),
      targetEntityId: getTargetEntityId(after || result || before),
      targetLocale: getTargetLocale(context, after || result || before),
      payload: {
        params: context.params || {},
      },
      before,
      after,
      diff,
      metadata: {
        contentTypeDisplayName: context.contentType?.info?.displayName || null,
        populateDepth: getPopulateDepth(strapi),
        relationPopulatePolicy: 'one-level-only',
        actorResolutionPolicy:
          'request-context -> koa-state -> result-metadata -> unknown',
        auditSource: 'document-middleware',
        documentAction: context.action || null,
        evidenceDisplayMode,
        publicationEventPolicy:
          'publication events are displayed separately from content changed fields',
      },
    };

    await enqueueAuditLogWrite({
      strapi,
      data: auditLogData,
      source: 'document-middleware',
    });

    return result;
  });
};

export default register;