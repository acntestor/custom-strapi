import { randomUUID } from 'node:crypto';

import {
    runWithRequestContext,
    getRequestContext,
} from '../utils/request-context';
import { resolveClientIp } from '../utils/ip';

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

const normalizeActor = (user) => {
    if (!user) {
        return {
            actorType: 'unknown',
            actorId: null,
            actorEmail: null,
            actorDisplayName: null,
        };
    }

    return {
        actorType: 'admin',
        actorId: user.id || null,
        actorEmail: user.email || null,
        actorDisplayName: getDisplayName(user),
    };
};

const resolveActorFromState = (ctx) => {
    const user =
        ctx.state?.user ||
        ctx.state?.auth?.credentials ||
        ctx.state?.auth?.user ||
        null;

    return normalizeActor(user);
};

export default () => {
    return async (ctx, next) => {
        const headers = ctx.request.headers || {};
        const requestId = headers['x-request-id'] || randomUUID();

        const requestContext = {
            requestId,
            ip: resolveClientIp(ctx),
            userAgent: headers['user-agent'] || null,
            method: ctx.request.method,
            path: ctx.request.url,
            statusCode: null,
            requestBody: ctx.request.body || null,
            authorization:
                headers.authorization ||
                headers.Authorization ||
                null,

            actorType: 'unknown',
            actorId: null,
            actorEmail: null,
            actorDisplayName: null,
        };

        await runWithRequestContext(requestContext, async () => {
            /**
             * Try before next() first.
             */
            const beforeActor = resolveActorFromState(ctx);
            const beforeContext = getRequestContext();

            beforeContext.actorType = beforeActor.actorType;
            beforeContext.actorId = beforeActor.actorId;
            beforeContext.actorEmail = beforeActor.actorEmail;
            beforeContext.actorDisplayName = beforeActor.actorDisplayName;

            await next();

            /**
             * Try again after next().
             * Some Strapi admin auth data is populated during downstream middlewares.
             */
            const afterActor = resolveActorFromState(ctx);
            const afterContext = getRequestContext();

            afterContext.statusCode = ctx.status;

            if (afterActor.actorType !== 'unknown') {
                afterContext.actorType = afterActor.actorType;
                afterContext.actorId = afterActor.actorId;
                afterContext.actorEmail = afterActor.actorEmail;
                afterContext.actorDisplayName = afterActor.actorDisplayName;
            }
        });
    };
};