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

export const buildDiff = (before = null, after = null) => {
    const changes = collectRecursiveDiff(before, after).filter(
        (entry) => entry.path && !isSystemPath(entry.path)
    );

    return {
        changes,
        changedFields: changes.map((change) => change.path),
        hiddenFields: [],
    };
};