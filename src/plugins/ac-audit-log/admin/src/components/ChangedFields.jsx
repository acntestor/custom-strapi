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

const SYSTEM_COMPONENT_FIELDS = new Set(['__component']);

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
        fontFamily:
            'SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace',
        fontSize: 12,
        lineHeight: '18px',
    },
    hiddenNote: {
        marginTop: 12,
        padding: 12,
        borderRadius: 4,
        background: '#f6f6f9',
        color: '#666687',
        fontSize: 13,
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

const safeStringify = (value) => {
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
};

const valuesAreEqual = (before, after) => {
    return safeStringify(before) === safeStringify(after);
};

const getCleanPathPart = (pathPart) => {
    return String(pathPart).replace(/\[\d+\]/g, '');
};

const isSystemPath = (path) => {
    if (!path) {
        return false;
    }

    return String(path)
        .split('.')
        .some((part) => SYSTEM_FIELDS.has(getCleanPathPart(part)));
};

const shouldSkipKey = (key) => {
    return SYSTEM_FIELDS.has(key) || SYSTEM_COMPONENT_FIELDS.has(key);
};

const joinPath = (basePath, key) => {
    return basePath ? `${basePath}.${key}` : key;
};

const joinArrayPath = (basePath, index) => {
    return basePath ? `${basePath}[${index}]` : `[${index}]`;
};

const isEntityLikeObject = (value) => {
    if (!isPlainObject(value)) {
        return false;
    }

    return Boolean(
        value.id ||
        value.documentId ||
        value.url ||
        value.name ||
        value.title ||
        value.email ||
        value.__component
    );
};

const getEntityIdentity = (value) => {
    if (!isPlainObject(value)) {
        return null;
    }

    return {
        id: value.id || null,
        documentId: value.documentId || null,
        url: value.url || null,
        name: value.name || null,
        title: value.title || null,
        email: value.email || null,
        component: value.__component || null,
    };
};

const identityChanged = (before, after) => {
    if (!isEntityLikeObject(before) && !isEntityLikeObject(after)) {
        return false;
    }

    return !valuesAreEqual(getEntityIdentity(before), getEntityIdentity(after));
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

    return `${Object.keys(value).length} field${Object.keys(value).length === 1 ? '' : 's'
        }`;
};

const getStringExcerpt = (value, comparedValue) => {
    if (typeof value !== 'string') {
        return value;
    }

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
};

const stringifyValue = (value, comparedValue) => {
    if (value === undefined) {
        return 'Undefined';
    }

    if (value === null) {
        return 'Null';
    }

    if (typeof value === 'string') {
        return getStringExcerpt(value, comparedValue);
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    return JSON.stringify(value, null, 2);
};

const collectRecursiveDiff = (before, after, path = '') => {
    if (path && isSystemPath(path)) {
        return [];
    }

    if (valuesAreEqual(before, after)) {
        return [];
    }

    if (
        (before === undefined || before === null) &&
        isEntityLikeObject(after) &&
        path
    ) {
        return [{ path, before, after, mode: 'summary' }];
    }

    if (
        (after === undefined || after === null) &&
        isEntityLikeObject(before) &&
        path
    ) {
        return [{ path, before, after, mode: 'summary' }];
    }

    if (
        path &&
        isPlainObject(before) &&
        isPlainObject(after) &&
        identityChanged(before, after)
    ) {
        return [{ path, before, after, mode: 'summary' }];
    }

    if (Array.isArray(before) || Array.isArray(after)) {
        const beforeArray = Array.isArray(before) ? before : [];
        const afterArray = Array.isArray(after) ? after : [];
        const maxLength = Math.max(beforeArray.length, afterArray.length);
        const changes = [];

        for (let index = 0; index < maxLength; index += 1) {
            changes.push(
                ...collectRecursiveDiff(
                    beforeArray[index],
                    afterArray[index],
                    joinArrayPath(path || 'items', index)
                )
            );
        }

        return changes;
    }

    if (isPlainObject(before) || isPlainObject(after)) {
        const beforeObject = isPlainObject(before) ? before : {};
        const afterObject = isPlainObject(after) ? after : {};
        const keys = new Set([
            ...Object.keys(beforeObject),
            ...Object.keys(afterObject),
        ]);

        const changes = [];

        keys.forEach((key) => {
            if (shouldSkipKey(key)) {
                return;
            }

            changes.push(
                ...collectRecursiveDiff(
                    beforeObject[key],
                    afterObject[key],
                    joinPath(path, key)
                )
            );
        });

        return changes;
    }

    return [{ path, before, after, mode: 'value' }];
};

const collectStructuredDiffChanges = (diff) => {
    if (!isPlainObject(diff)) {
        return [];
    }

    if (Array.isArray(diff.changes)) {
        return diff.changes
            .filter((change) => change?.path && !isSystemPath(change.path))
            .filter((change) => !valuesAreEqual(change.before, change.after))
            .map((change) => ({
                path: change.path,
                before: change.before,
                after: change.after,
                mode: change.mode || 'value',
            }));
    }

    return Object.entries(diff)
        .filter(([path]) => !isSystemPath(path))
        .filter(([, value]) => value && typeof value === 'object')
        .filter(([, value]) => !valuesAreEqual(value.before, value.after))
        .map(([path, value]) => ({
            path,
            before: value.before,
            after: value.after,
            mode:
                isEntityLikeObject(value.before) || isEntityLikeObject(value.after)
                    ? 'summary'
                    : 'value',
        }));
};

const getDiffEntries = (log) => {
    if (log?.before || log?.after) {
        const recursiveEntries = collectRecursiveDiff(log.before, log.after).filter(
            (entry) => entry.path && !isSystemPath(entry.path)
        );

        if (recursiveEntries.length > 0) {
            return recursiveEntries;
        }
    }

    return collectStructuredDiffChanges(log?.diff);
};

export const ChangedFields = ({ log, styles }) => {
    const entries = getDiffEntries(log);

    if (entries.length === 0) {
        return (
            <div style={getStyle(styles, 'changedFieldsContainer')}>
                <h3 style={getStyle(styles, 'changedFieldsTitle')}>Changed Fields</h3>
                <div style={getStyle(styles, 'diffEmpty')}>
                    No changed fields detected.
                </div>
            </div>
        );
    }

    return (
        <div style={getStyle(styles, 'changedFieldsContainer')}>
            <h3 style={getStyle(styles, 'changedFieldsTitle')}>Changed Fields</h3>
            <p style={getStyle(styles, 'changedFieldsSubtitle')}>
                Only fields with actual content changes are shown.
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