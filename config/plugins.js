module.exports = () => ({
    'ac-audit-log': {
        enabled: true,
        resolve: './src/plugins/ac-audit-log',
        config: {
            auditLogWriteFlushTimeoutMs: 10000, // 10s
        },
    }
});
