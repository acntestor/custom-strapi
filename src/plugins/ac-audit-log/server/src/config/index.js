export default {
  default: {
    /**
     * Controls how deeply components and dynamic zones are populated
     * when taking before/after snapshots.
     *
     * Relations are intentionally populated one level only.
     */
    populateDepth: 4,
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
  },
};