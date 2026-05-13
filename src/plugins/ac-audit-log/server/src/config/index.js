export default {
  default: {
    /**
     * Controls how deeply components and dynamic zones are populated
     * when taking before/after snapshots.
     *
     * Relations are intentionally populated one level only.
     */
    populateDepth: 4,

    /**
     * Max time to wait for pending audit log writes when Strapi reloads/shuts down.
     * This prevents Content-Type Builder reload from closing the DB before
     * queued audit logs finish writing.
     */
    auditLogWriteFlushTimeoutMs: 5000,
  },
  validator(config) {
    if (
      config.populateDepth !== undefined &&
      (!Number.isInteger(config.populateDepth) || config.populateDepth < 1)
    ) {
      throw new Error(
        '[ac-audit-log] config.populateDepth must be a positive integer'
      );
    }

    if (
      config.auditLogWriteFlushTimeoutMs !== undefined &&
      (!Number.isInteger(config.auditLogWriteFlushTimeoutMs) ||
        config.auditLogWriteFlushTimeoutMs < 1)
    ) {
      throw new Error(
        '[ac-audit-log] config.auditLogWriteFlushTimeoutMs must be a positive integer'
      );
    }
  },
};