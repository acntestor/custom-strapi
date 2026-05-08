import React from 'react';

const SYSTEM_FIELDS = new Set([
    'id',
    'documentId',
    'createdAt',
    'updatedAt',
    'createdBy',
    'updatedBy',
    'publishedAt',
    'locale',
    'localizations',
    'provider',
    'provider_metadata',
    'folderPath',
    'previewUrl',
    'formats',
    'hash',
    'mime',
    'size',
    'width',
    'height',
    'ext',
    'password',
    'resetPasswordToken',
    'registrationToken',
]);

const SNAPSHOT_ENTITY_SUMMARY_FIELDS = new Set([
    'id',
    'documentId',
    'url',
    'name',
    'title',
    'email',
    'alternativeText',
    'caption',
    'mime',
    'ext',
]);

const DEFAULT_STYLES = {
    changedFieldsContainer: {
        marginTop: 8,
    },
    changedFieldsTitle: {
        margin: '0 0 12px',
        fontSize: 16,
        fontWeight: 700,
    },
    changedFieldsSubtitle: {
        margin: '0 0 16px',
        fontSize: 13,
        color: '#666687',
    },
    diffEmpty: {
        padding: 16,
        border: '1px solid #dcdce4',
        borderRadius: 4,
        color: '#666687',
        background: '#f6f6f9',
        fontSize: 14,
    },
    fieldCard: {
        border: '1px solid #dcdce4',
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 12,
        background: '#ffffff',
    },
    fieldHeader: {
        padding: '12px 16px',
        borderBottom: '1px solid #dcdce4',
        background: '#f6f6f9',
        fontWeight: 700,
        fontSize: 13,
    },
    valueGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 0,
    },
    valueColumn: {
        padding: 16,
    },
    beforeColumn: {
        borderRight: '1px solid #dcdce4',
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
        background: '#fcecea',
        color: '#b72b1a',
    },
    afterLabel: {
        background: '#eafbe7',
        color: '#2f6846',
    },
    valueBox: {
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontFamily: 'SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace',
        fontSize: 12,
        lineHeight: '18px',
    },
};

const getStyle = (styles, key) => {
    return styles?.[key] || DEFAULT_STYLES[key] || {};
};

const mergeStyles = (...styleObjects) => {
    return Object.assign({}, ...styleObjects.filter(Boolean));
};

const isPlainObject = (value) => {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const normalizeAction = (log) => {
    return String(log?.action || log?.metadata?.documentAction || '').toLowerCase();
};

const isPublishLog = (log) => {
    const action = normalizeAction(log);
    return action.includes('publish') && !action.includes('unpublish');
};

const isUnpublishLog = (log) => {
    return normalizeAction(log).includes('unpublish');
};

const isDeleteLog = (log) => {
    const action = normalizeAction(log);

    return (
        action.includes('delete') ||
        action.includes('remove') ||
        action.includes('destroy')
    );
};

const stringifyValue = (value, comparedValue) => {
    if (value === undefined) {
        return 'Undefined';
    }

    if (value === null) {
        return 'Null';
    }

    if (typeof value === 'string') {
        if (value.length <= 900) {
            return value;
        }

        if (typeof comparedValue !== 'string') {
            return `${value.slice(0, 900)}…`;
        }

        let startDiff = 0;

        while (
            startDiff < value.length &&
            startDiff < comparedValue.length &&
            value[startDiff] === comparedValue[startDiff]
        ) {
            startDiff += 1;
        }

        let endValue = value.length - 1;
        let endCompared = comparedValue.length - 1;

        while (
            endValue > startDiff &&
            endCompared > startDiff &&
            value[endValue] === comparedValue[endCompared]
        ) {
            endValue -= 1;
            endCompared -= 1;
        }

        const start = Math.max(0, startDiff - 260);
        const end = Math.min(value.length, endValue + 260);
        const prefix = start > 0 ? '…' : '';
        const suffix = end < value.length ? '…' : '';

        return `${prefix}${value.slice(start, end)}${suffix}`;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    return JSON.stringify(value, null, 2);
};

const summarizeEntity = (value) => {
    if (value === undefined) {
        return 'Not set';
    }

    if (value === null) {
        return 'Null';
    }

    if (Array.isArray(value)) {
        return `${value.length} item${value.length === 1 ? '' : 's'}`;
    }

    if (!isPlainObject(value)) {
        return stringifyValue(value);
    }

    const label =
        value.title ||
        value.name ||
        value.email ||
        value.alternativeText ||
        value.caption ||
        value.url ||
        value.documentId ||
        value.id ||
        null;

    if (label && value.id) {
        return `${label} (#${value.id})`;
    }

    if (label) {
        return String(label);
    }

    if (value.__component) {
        return value.__component;
    }

    return `${Object.keys(value).length} field${Object.keys(value).length === 1 ? '' : 's'}`;
};

const normalizeChanges = (log) => {
    if (!log?.diff) {
        return [];
    }

    if (Array.isArray(log.diff.changes)) {
        return log.diff.changes.filter((change) => change?.path);
    }

    return Object.entries(log.diff)
        .filter(([, value]) => value && typeof value === 'object')
        .filter(([, value]) => 'before' in value || 'after' in value)
        .map(([path, value]) => ({
            path,
            before: value.before,
            after: value.after,
            mode: value.mode || 'value',
        }));
};

const isSnapshotEntityLikeObject = (value) => {
    if (!isPlainObject(value)) {
        return false;
    }

    if (value.__component) {
        return false;
    }

    return [...SNAPSHOT_ENTITY_SUMMARY_FIELDS].some((fieldName) => value[fieldName]);
};

const getReadableSnapshotValue = (value) => {
    if (Array.isArray(value)) {
        return `${value.length} item${value.length === 1 ? '' : 's'}`;
    }

    if (isSnapshotEntityLikeObject(value)) {
        return summarizeEntity(value);
    }

    return stringifyValue(value);
};

const collectSnapshotEntries = (value, path = '') => {
    if (value === undefined) {
        return [];
    }

    if (value === null) {
        return path ? [{ path, value }] : [];
    }

    if (Array.isArray(value)) {
        if (!path) {
            return value.flatMap((item, index) => collectSnapshotEntries(item, `[${index}]`));
        }

        if (value.length === 0) {
            return [{ path, value }];
        }

        return value.flatMap((item, index) =>
            collectSnapshotEntries(item, `${path}[${index}]`)
        );
    }

    if (!isPlainObject(value)) {
        return path ? [{ path, value }] : [];
    }

    if (path && isSnapshotEntityLikeObject(value)) {
        return [{ path, value: getReadableSnapshotValue(value) }];
    }

    const childEntries = Object.entries(value)
        .filter(([key]) => !SYSTEM_FIELDS.has(key))
        .filter(([key]) => key !== '__component')
        .flatMap(([key, childValue]) => {
            const childPath = path ? `${path}.${key}` : key;
            return collectSnapshotEntries(childValue, childPath);
        });

    if (childEntries.length === 0 && path) {
        return [{ path, value: getReadableSnapshotValue(value) }];
    }

    return childEntries;
};

const getSnapshotEntries = (snapshot = {}) => {
    if (!isPlainObject(snapshot)) {
        return [];
    }

    return collectSnapshotEntries(snapshot);
};

const getDisplayMode = (log) => {
    if (isPublishLog(log) || isUnpublishLog(log)) {
        return 'publication-event';
    }

    if (isDeleteLog(log)) {
        return 'deleted-snapshot';
    }

    if (log?.metadata?.evidenceDisplayMode) {
        return log.metadata.evidenceDisplayMode;
    }

    if (!log?.before && log?.after) {
        return 'initial-values';
    }

    return 'changed-fields';
};

const SnapshotValues = ({ title, subtitle, snapshot, label, styles }) => {
    const entries = getSnapshotEntries(snapshot);

    return (
        <div style={getStyle(styles, 'changedFieldsContainer')}>
            <h3 style={getStyle(styles, 'changedFieldsTitle')}>{title}</h3>
            <p style={getStyle(styles, 'changedFieldsSubtitle')}>{subtitle}</p>

            {entries.length === 0 ? (
                <div style={getStyle(styles, 'diffEmpty')}>
                    No persisted snapshot fields detected for this audit event.
                </div>
            ) : (
                entries.map((entry) => (
                    <div key={entry.path} style={getStyle(styles, 'fieldCard')}>
                        <div style={getStyle(styles, 'fieldHeader')}>{entry.path}</div>
                        <div style={getStyle(styles, 'valueColumn')}>
                            <span
                                style={mergeStyles(
                                    getStyle(styles, 'valueLabel'),
                                    getStyle(styles, 'afterLabel')
                                )}
                            >
                                {label}
                            </span>
                            <pre style={getStyle(styles, 'valueBox')}>
                                {stringifyValue(entry.value)}
                            </pre>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

const PublicationEvent = ({ log, styles }) => {
    const isUnpublish = isUnpublishLog(log);
    const title = isUnpublish ? 'Unpublication Event' : 'Publication Event';
    const message = isUnpublish
        ? 'This entry was unpublished. Content field changes, if any, are recorded in entry.update audit events.'
        : 'This entry was published. Content field changes, if any, are recorded in entry.update audit events.';

    return (
        <div style={getStyle(styles, 'changedFieldsContainer')}>
            <h3 style={getStyle(styles, 'changedFieldsTitle')}>{title}</h3>
            <div style={getStyle(styles, 'diffEmpty')}>{message}</div>
        </div>
    );
};

export const ChangedFields = ({ log, styles }) => {
    const displayMode = getDisplayMode(log);

    if (displayMode === 'publication-event') {
        return <PublicationEvent log={log} styles={styles} />;
    }

    if (displayMode === 'initial-values') {
        return (
            <SnapshotValues
                title="Initial Values"
                subtitle="Initial persisted values recorded when this entry was created."
                snapshot={log?.after}
                label="Initial"
                styles={styles}
            />
        );
    }

    if (displayMode === 'deleted-snapshot') {
        return (
            <SnapshotValues
                title="Deleted Snapshot"
                subtitle="Persisted values recorded before this entry was deleted."
                snapshot={log?.before}
                label="Deleted"
                styles={styles}
            />
        );
    }

    const entries = normalizeChanges(log);

    if (entries.length === 0) {
        return (
            <div style={getStyle(styles, 'changedFieldsContainer')}>
                <h3 style={getStyle(styles, 'changedFieldsTitle')}>Changed Fields</h3>
                <div style={getStyle(styles, 'diffEmpty')}>
                    No persisted changed fields detected for this audit event.
                </div>
            </div>
        );
    }

    return (
        <div style={getStyle(styles, 'changedFieldsContainer')}>
            <h3 style={getStyle(styles, 'changedFieldsTitle')}>Changed Fields</h3>
            <p style={getStyle(styles, 'changedFieldsSubtitle')}>
                Only server-recorded changed fields are shown.
            </p>

            {entries.map((entry) => {
                const beforeText =
                    entry.mode === 'summary'
                        ? summarizeEntity(entry.before)
                        : stringifyValue(entry.before, entry.after);
                const afterText =
                    entry.mode === 'summary'
                        ? summarizeEntity(entry.after)
                        : stringifyValue(entry.after, entry.before);

                return (
                    <div key={entry.path} style={getStyle(styles, 'fieldCard')}>
                        <div style={getStyle(styles, 'fieldHeader')}>{entry.path}</div>
                        <div style={getStyle(styles, 'valueGrid')}>
                            <div
                                style={mergeStyles(
                                    getStyle(styles, 'valueColumn'),
                                    getStyle(styles, 'beforeColumn')
                                )}
                            >
                                <span
                                    style={mergeStyles(
                                        getStyle(styles, 'valueLabel'),
                                        getStyle(styles, 'beforeLabel')
                                    )}
                                >
                                    Before
                                </span>
                                <pre style={getStyle(styles, 'valueBox')}>{beforeText}</pre>
                            </div>

                            <div style={getStyle(styles, 'valueColumn')}>
                                <span
                                    style={mergeStyles(
                                        getStyle(styles, 'valueLabel'),
                                        getStyle(styles, 'afterLabel')
                                    )}
                                >
                                    After
                                </span>
                                <pre style={getStyle(styles, 'valueBox')}>{afterText}</pre>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};