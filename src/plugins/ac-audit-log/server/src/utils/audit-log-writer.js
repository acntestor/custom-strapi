const DEFAULT_FLUSH_TIMEOUT_MS = 5000;
const AUDIT_LOG_WRITER_STATE_KEY = Symbol.for('ac-audit-log.writer-state');

const getWriterState = (strapi) => {
    if (!strapi[AUDIT_LOG_WRITER_STATE_KEY]) {
        strapi[AUDIT_LOG_WRITER_STATE_KEY] = {
            pendingWrites: new Set(),
            isFlushing: false,
        };
    }

    return strapi[AUDIT_LOG_WRITER_STATE_KEY];
};

const getPluginConfig = (strapi) => {
    return strapi.config.get('plugin::ac-audit-log') || {};
};

const getFlushTimeoutMs = (strapi) => {
    const config = getPluginConfig(strapi);
    const timeout = Number(
        config.auditLogWriteFlushTimeoutMs || DEFAULT_FLUSH_TIMEOUT_MS
    );

    if (!Number.isFinite(timeout) || timeout <= 0) {
        return DEFAULT_FLUSH_TIMEOUT_MS;
    }

    return Math.floor(timeout);
};

const withTimeout = async (promise, timeoutMs) => {
    let timeoutId;

    const timeoutPromise = new Promise((resolve) => {
        timeoutId = setTimeout(() => {
            resolve({ timedOut: true });
        }, timeoutMs);
    });

    const result = await Promise.race([
        promise.then(() => ({ timedOut: false })),
        timeoutPromise,
    ]);

    clearTimeout(timeoutId);
    return result;
};

export const enqueueAuditLogWrite = ({ strapi, data, source = 'unknown' }) => {
    const state = getWriterState(strapi);

    const writePromise = Promise.resolve()
        .then(() => strapi.plugin('ac-audit-log').service('audit-log').createLog(data))
        .catch((error) => {
            strapi.log.error(
                `[ac-audit-log] Failed to create audit log from ${source}: ${error.message}`
            );
            return null;
        })
        .finally(() => {
            state.pendingWrites.delete(writePromise);
        });

    state.pendingWrites.add(writePromise);

    return writePromise;
};

export const flushAuditLogWrites = async ({ strapi, reason = 'shutdown' } = {}) => {
    const state = getWriterState(strapi);

    if (state.isFlushing) {
        return;
    }

    state.isFlushing = true;

    try {
        const timeoutMs = getFlushTimeoutMs(strapi);

        while (state.pendingWrites.size > 0) {
            const pendingWrites = Array.from(state.pendingWrites);
            const result = await withTimeout(Promise.allSettled(pendingWrites), timeoutMs);

            if (result.timedOut) {
                strapi.log.warn(
                    `[ac-audit-log] Timed out while flushing ${pendingWrites.length} pending audit log write(s) during ${reason}`
                );
                return;
            }
        }
    } finally {
        state.isFlushing = false;
    }
};

export const getPendingAuditLogWriteCount = ({ strapi } = {}) => {
    return getWriterState(strapi).pendingWrites.size;
};