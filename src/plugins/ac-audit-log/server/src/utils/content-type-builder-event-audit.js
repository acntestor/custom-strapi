import { getRequestContext } from './request-context.js';
import { enqueueAuditLogWrite } from './audit-log-writer.js';

const CONTENT_TYPE_BUILDER_EVENTS = [
    {
        eventName: 'content-type.create',
        category: 'content-type',
        entityKind: 'content-type',
        payloadKey: 'contentType',
    },
    {
        eventName: 'content-type.update',
        category: 'content-type',
        entityKind: 'content-type',
        payloadKey: 'contentType',
    },
    {
        eventName: 'content-type.delete',
        category: 'content-type',
        entityKind: 'content-type',
        payloadKey: 'contentType',
    },
    {
        eventName: 'component.create',
        category: 'component',
        entityKind: 'component',
        payloadKey: 'component',
    },
    {
        eventName: 'component.update',
        category: 'component',
        entityKind: 'component',
        payloadKey: 'component',
    },
    {
        eventName: 'component.delete',
        category: 'component',
        entityKind: 'component',
        payloadKey: 'component',
    },
];

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

const resolveActor = (requestContext = {}) => {
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

    return {
        actorType: 'unknown',
        actorId: null,
        actorEmail: null,
        actorDisplayName: null,
    };
};

const buildEmptyDiff = () => {
    return {
        changes: [],
        changedFields: [],
        hiddenFields: [],
    };
};

const getEntityUid = (entity) => {
    return entity?.uid || entity?.schema?.uid || null;
};

const getEntityDisplayName = (entity) => {
    return entity?.schema?.info?.displayName || entity?.info?.displayName || null;
};

const getEntitySingularName = (entity) => {
    return entity?.schema?.info?.singularName || entity?.info?.singularName || null;
};

const getEntityPluralName = (entity) => {
    return entity?.schema?.info?.pluralName || entity?.info?.pluralName || null;
};

const createContentTypeBuilderEventHandler = ({
    strapi,
    eventName,
    category,
    entityKind,
    payloadKey,
}) => {
    return async (eventPayload = {}) => {
        const entity = eventPayload?.[payloadKey] || null;

        if (!entity) {
            strapi.log.warn(
                `[ac-audit-log] Ignored ${eventName}: missing ${payloadKey} payload`
            );
            return;
        }

        const requestContext = getRequestContext();
        const actor = resolveActor(requestContext);
        const entityUid = getEntityUid(entity);

        const auditLogData = {
            action: eventName,
            category,
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
            contentTypeUid: entityUid,
            targetDocumentId: null,
            targetEntityId: entityUid,
            targetLocale: null,
            payload: {
                eventName,
                entityKind,
                [payloadKey]: entity,
            },
            before: null,
            after: entity,
            diff: buildEmptyDiff(),
            metadata: {
                auditSource: 'content-type-builder-event-hub',
                officialEventHubEvent: true,
                eventHubEvent: eventName,
                entityKind,
                payloadKey,
                evidenceDisplayMode: 'schema-event-payload',
                contentTypeDisplayName: getEntityDisplayName(entity),
                singularName: getEntitySingularName(entity),
                pluralName: getEntityPluralName(entity),
                actorResolutionPolicy: 'request-context -> koa-state -> unknown',
                diffPolicy:
                    'Content-Type Builder official event payload is stored; schema before/after diff is not computed in phase 1.',
            },
        };

        await enqueueAuditLogWrite({
            strapi,
            data: auditLogData,
            source: `content-type-builder-event-hub:${eventName}`,
        });
    };
};

export const registerContentTypeBuilderEventAudit = ({ strapi }) => {
    CONTENT_TYPE_BUILDER_EVENTS.forEach((eventConfig) => {
        strapi.eventHub.on(
            eventConfig.eventName,
            createContentTypeBuilderEventHandler({
                strapi,
                ...eventConfig,
            })
        );
    });
};