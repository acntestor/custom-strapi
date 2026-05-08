export const createStyles = (theme) => ({
    page: {
        padding: '32px 40px',
        background: theme.colors.neutral100,
        color: theme.colors.neutral800,
        minHeight: '100%',
    },

    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 24,
        marginBottom: 24,
    },

    title: {
        margin: 0,
        fontSize: 32,
        lineHeight: '40px',
        fontWeight: 700,
        color: theme.colors.neutral900,
    },

    subtitle: {
        marginTop: 8,
        marginBottom: 0,
        color: theme.colors.neutral600,
        fontSize: 16,
    },

    toolbar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        marginBottom: 16,
    },

    filterArea: {
        position: 'relative',
        display: 'inline-block',
    },

    filterPopover: {
        position: 'absolute',
        top: 40,
        left: 0,
        width: 300,
        padding: 12,
        border: `1px solid ${theme.colors.neutral200}`,
        borderRadius: 4,
        background: theme.colors.neutral0,
        boxShadow:
            theme.shadows?.filterShadow ||
            theme.shadows?.tableShadow ||
            '0 2px 15px rgba(0, 0, 0, 0.15)',
        zIndex: 20,
    },

    filterButtonIcon: {
        fontSize: 13,
        lineHeight: 1,
        opacity: 0.85,
    },

    designSystemControlWrapper: {
        marginBottom: 8,
    },

    pageSizeSelectWrapper: {
        width: 90,
    },

    auditButtonPrimary: {
        minHeight: 34,
        padding: '0 14px',
        border: 'none',
        borderRadius: 4,
        background: theme.colors.primary600,
        color: theme.colors.neutral0,
        cursor: 'pointer',
        fontWeight: 700,
        fontSize: 13,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
    },

    auditButtonSecondary: {
        minHeight: 34,
        padding: '0 14px',
        border: `1px solid ${theme.colors.neutral300}`,
        borderRadius: 4,
        background: theme.colors.neutral0,
        color: theme.colors.neutral800,
        cursor: 'pointer',
        fontWeight: 700,
        fontSize: 13,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },

    auditButtonGhost: {
        minHeight: 30,
        padding: '0 10px',
        border: `1px solid ${theme.colors.neutral300}`,
        borderRadius: 4,
        background: theme.colors.neutral0,
        color: theme.colors.primary600,
        cursor: 'pointer',
        fontWeight: 700,
        fontSize: 12,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },

    auditButtonDanger: {
        minHeight: 34,
        padding: '0 14px',
        border: `1px solid ${theme.colors.danger600}`,
        borderRadius: 4,
        background: theme.colors.danger100,
        color: theme.colors.danger700,
        cursor: 'pointer',
        fontWeight: 700,
        fontSize: 13,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },

    filterError: {
        marginBottom: 8,
        padding: '8px 10px',
        borderRadius: 4,
        background: theme.colors.danger100,
        color: theme.colors.danger700,
        fontSize: 13,
        fontWeight: 600,
    },

    activeFilters: {
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        marginBottom: 16,
    },

    activeFilterChip: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        borderRadius: 4,
        background: theme.colors.primary100,
        color: theme.colors.primary700,
        fontSize: 13,
        fontWeight: 600,
    },

    removeFilterButton: {
        border: 'none',
        background: 'transparent',
        color: theme.colors.primary700,
        cursor: 'pointer',
        fontWeight: 700,
        padding: 0,
        lineHeight: 1,
    },

    card: {
        border: `1px solid ${theme.colors.neutral200}`,
        borderRadius: 4,
        background: theme.colors.neutral0,
        overflow: 'hidden',
    },

    table: {
        width: '100%',
        borderCollapse: 'collapse',
    },

    th: {
        textAlign: 'left',
        padding: '14px 16px',
        borderBottom: `1px solid ${theme.colors.neutral200}`,
        color: theme.colors.neutral700,
        fontSize: 12,
        textTransform: 'uppercase',
        background: theme.colors.neutral100,
    },

    td: {
        padding: '14px 16px',
        borderBottom: `1px solid ${theme.colors.neutral150 || theme.colors.neutral200}`,
        verticalAlign: 'top',
        fontSize: 14,
        color: theme.colors.neutral800,
        background: theme.colors.neutral0,
    },

    code: {
        color: theme.colors.primary700,
        background: theme.colors.primary100,
        padding: '2px 6px',
        borderRadius: 4,
    },

    error: {
        marginBottom: 16,
        padding: 12,
        border: `1px solid ${theme.colors.danger600}`,
        borderRadius: 4,
        background: theme.colors.danger100,
        color: theme.colors.danger700,
    },

    footer: {
        marginTop: 16,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        color: theme.colors.neutral700,
    },

    pageSizeArea: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    },

    pagination: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    },

    pageButton: {
        minWidth: 36,
        height: 36,
        border: `1px solid ${theme.colors.neutral300}`,
        borderRadius: 4,
        background: theme.colors.neutral0,
        color: theme.colors.neutral800,
        cursor: 'pointer',
        fontWeight: 600,
    },

    activePageButton: {
        background: theme.colors.primary600,
        color: theme.colors.neutral0,
        border: `1px solid ${theme.colors.primary600}`,
    },

    disabledButton: {
        opacity: 0.45,
        cursor: 'not-allowed',
    },

    modalOverlay: {
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },

    modal: {
        width: 'min(1120px, 96vw)',
        maxHeight: '88vh',
        background: theme.colors.neutral0,
        color: theme.colors.neutral800,
        border: `1px solid ${theme.colors.neutral200}`,
        borderRadius: 4,
        overflow: 'hidden',
        boxShadow:
            theme.shadows?.modalShadow ||
            theme.shadows?.tableShadow ||
            '0 8px 32px rgba(0, 0, 0, 0.35)',
    },

    modalHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: `1px solid ${theme.colors.neutral200}`,
        background: theme.colors.neutral0,
    },

    modalTitle: {
        margin: 0,
        fontSize: 16,
        fontWeight: 700,
        color: theme.colors.neutral900,
    },

    modalBody: {
        maxHeight: 'calc(88vh - 70px)',
        overflow: 'auto',
        padding: 20,
        background: theme.colors.neutral100,
    },

    summaryGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 16,
        marginBottom: 20,
        padding: 16,
        borderRadius: 4,
        background: theme.colors.neutral0,
        border: `1px solid ${theme.colors.neutral200}`,
    },

    summaryLabel: {
        fontSize: 12,
        fontWeight: 700,
        color: theme.colors.neutral600,
        textTransform: 'uppercase',
        marginBottom: 6,
    },

    summaryValue: {
        fontSize: 14,
        color: theme.colors.neutral900,
        wordBreak: 'break-word',
    },

    diffSection: {
        marginTop: 20,
    },

    section: {
        marginTop: 20,
    },

    changedFieldsContainer: {
        marginTop: 8,
        marginBottom: 20,
    },

    changedFieldsTitle: {
        margin: '0 0 6px',
        fontSize: 16,
        fontWeight: 700,
        color: theme.colors.neutral900,
    },

    changedFieldsSubtitle: {
        margin: '0 0 16px',
        fontSize: 13,
        color: theme.colors.neutral600,
    },

    fieldCard: {
        border: `1px solid ${theme.colors.neutral200}`,
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 12,
        background: theme.colors.neutral0,
    },

    fieldHeader: {
        padding: '12px 16px',
        borderBottom: `1px solid ${theme.colors.neutral200}`,
        background: theme.colors.neutral100,
        color: theme.colors.neutral900,
        fontSize: 13,
        fontWeight: 700,
    },

    valueGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
    },

    valueColumn: {
        padding: 16,
        background: theme.colors.neutral0,
    },

    beforeColumn: {
        borderRight: `1px solid ${theme.colors.neutral200}`,
    },

    valueLabel: {
        display: 'inline-flex',
        marginBottom: 8,
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
    },

    beforeLabel: {
        background: theme.colors.danger100,
        color: theme.colors.danger700,
    },

    afterLabel: {
        background: theme.colors.success100 || theme.colors.primary100,
        color: theme.colors.success700 || theme.colors.primary700,
    },

    valueBox: {
        margin: 0,
        color: theme.colors.neutral800,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontFamily: 'SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace',
        fontSize: 12,
        lineHeight: '18px',
    },

    diffEmpty: {
        padding: 16,
        border: `1px solid ${theme.colors.neutral200}`,
        borderRadius: 4,
        color: theme.colors.neutral600,
        background: theme.colors.neutral0,
        fontSize: 14,
    },

    jsonPanel: {
        border: `1px solid ${theme.colors.neutral200}`,
        borderRadius: 6,
        overflow: 'hidden',
        background: theme.colors.neutral0,
    },

    jsonPanelHeader: {
        minHeight: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 14px',
        borderBottom: `1px solid ${theme.colors.neutral200}`,
        background: theme.colors.neutral100,
    },

    jsonPanelTitle: {
        margin: 0,
        color: theme.colors.neutral900,
        fontSize: 13,
        fontWeight: 700,
    },

    jsonCodeBlock: {
        margin: 0,
        padding: 14,
        maxHeight: 420,
        overflow: 'auto',
        background: theme.colors.neutral100,
        color: theme.colors.neutral900,
        fontSize: 12,
        lineHeight: '18px',
        whiteSpace: 'pre',
        fontFamily: 'SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace',
    },
});