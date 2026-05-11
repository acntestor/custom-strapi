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

const isComponentObject = (value) => {
    return isPlainObject(value) && Boolean(value.__component);
};

const getComponentUid = (value) => {
    return isComponentObject(value) ? value.__component : null;
};

const isMediaLikeObject = (value) => {
    if (!isPlainObject(value)) {
        return false;
    }

    return Boolean(value.url || value.mime || value.ext || value.provider);
};

const isRelationLikeObject = (value) => {
    if (!isPlainObject(value)) {
        return false;
    }

    if (isComponentObject(value) || isMediaLikeObject(value)) {
        return false;
    }

    return Boolean(value.id || value.documentId || value.name || value.title || value.email);
};

const isEntityLikeObject = (value) => {
    return isMediaLikeObject(value) || isRelationLikeObject(value);
};

const isStructuredArrayItem = (value) => {
    return isComponentObject(value) || isEntityLikeObject(value);
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
        mime: value.mime || null,
        ext: value.ext || null,
    };
};

const identityChanged = (before, after) => {
    if (!isEntityLikeObject(before) && !isEntityLikeObject(after)) {
        return false;
    }

    return !valuesAreEqual(getEntityIdentity(before), getEntityIdentity(after));
};

const getReadableLabel = (value) => {
    if (value === undefined || value === null) {
        return 'Not set';
    }

    if (!isPlainObject(value)) {
        return String(value);
    }

    const component = value.__component || null;
    const mediaPrefix = isMediaLikeObject(value)
        ? typeof value.mime === 'string' && value.mime.startsWith('image/')
            ? 'Image: '
            : 'Media: '
        : '';
    const label =
        value.title ||
        value.name ||
        value.email ||
        value.alternativeText ||
        value.caption ||
        value.url ||
        value.body ||
        value.documentId ||
        value.id ||
        null;

    const idSuffix = value.id ? ` (#${value.id})` : '';
    const readableLabel = label ? String(label) : `${Object.keys(value).length} fields`;

    if (component) {
        return `${component} — ${readableLabel}${idSuffix}`;
    }

    return `${mediaPrefix}${readableLabel}${idSuffix}`;
};

const getArrayItemStableKey = (value) => {
    if (!isPlainObject(value)) {
        return null;
    }

    if (value.__component && value.id) {
        return `component:${value.__component}:${value.id}`;
    }

    if (value.documentId) {
        return `document:${value.documentId}`;
    }

    if (value.id) {
        return `id:${value.id}`;
    }

    if (value.url) {
        return `url:${value.url}`;
    }

    return null;
};

const arrayHasStructuredItems = (items = []) => {
    return items.some((item) => isStructuredArrayItem(item));
};

const buildIndexByStableKey = (items = []) => {
    const indexByKey = new Map();

    items.forEach((item, index) => {
        const key = getArrayItemStableKey(item);

        if (key && !indexByKey.has(key)) {
            indexByKey.set(key, index);
        }
    });

    return indexByKey;
};

const getArrayMatchMetadata = (beforeArray, afterArray, path) => {
    if (!path || !arrayHasStructuredItems([...beforeArray, ...afterArray])) {
        return null;
    }

    const beforeKeys = beforeArray.map(getArrayItemStableKey);
    const afterKeys = afterArray.map(getArrayItemStableKey);

    const beforeIndexByKey = buildIndexByStableKey(beforeArray);
    const afterIndexByKey = buildIndexByStableKey(afterArray);

    if (beforeKeys.some((key) => !key) || afterKeys.some((key) => !key)) {
        return null;
    }

    return {
        beforeKeys,
        afterKeys,
        beforeIndexByKey,
        afterIndexByKey,
    };
};

const buildArrayMoveChanges = (beforeArray, metadata, path) => {
    if (!metadata) {
        return [];
    }

    return metadata.beforeKeys
        .map((key, beforeIndex) => {
            const afterIndex = metadata.afterIndexByKey.get(key);

            if (afterIndex === undefined || beforeIndex === afterIndex) {
                return null;
            }

            const item = beforeArray[beforeIndex];
            const label = getReadableLabel(item);

            return {
                path: `${path} order — ${label}`,
                before: `Position ${beforeIndex + 1}`,
                after: `Position ${afterIndex + 1}`,
                mode: 'moved',
                metadata: {
                    arrayItem: {
                        status: 'moved',
                        beforePosition: beforeIndex + 1,
                        afterPosition: afterIndex + 1,
                    },
                },
            };
        })
        .filter(Boolean);
};

const buildArrayAddedRemovedOrUpdatedChanges = (
    beforeArray,
    afterArray,
    metadata,
    path
) => {
    if (!metadata) {
        return [];
    }

    const changes = [];
    const addedItems = [];
    const removedItems = [];

    metadata.afterKeys.forEach((key, afterIndex) => {
        if (metadata.beforeIndexByKey.has(key)) {
            return;
        }

        addedItems.push({
            key,
            index: afterIndex,
            item: afterArray[afterIndex],
        });
    });

    metadata.beforeKeys.forEach((key, beforeIndex) => {
        if (metadata.afterIndexByKey.has(key)) {
            return;
        }

        removedItems.push({
            key,
            index: beforeIndex,
            item: beforeArray[beforeIndex],
        });
    });

    const pairCount = Math.min(addedItems.length, removedItems.length);

    for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
        const added = addedItems[pairIndex];
        const removed = removedItems[pairIndex];
        const beforeLabel = getReadableLabel(removed.item);
        const afterLabel = getReadableLabel(added.item);

        changes.push({
            path: `${path} — Updated ${beforeLabel} -> ${afterLabel}`,
            before: removed.item,
            after: added.item,
            mode: 'updated',
            metadata: {
                arrayItem: {
                    status: 'updated',
                    beforePosition: removed.index + 1,
                    afterPosition: added.index + 1,
                },
            },
        });
    }

    addedItems.slice(pairCount).forEach((added) => {
        const label = getReadableLabel(added.item);

        changes.push({
            path: `${path} — Added ${label}`,
            before: null,
            after: added.item,
            mode: 'added',
            metadata: {
                arrayItem: {
                    status: 'added',
                    afterPosition: added.index + 1,
                },
            },
        });
    });

    removedItems.slice(pairCount).forEach((removed) => {
        const label = getReadableLabel(removed.item);

        changes.push({
            path: `${path} — Removed ${label}`,
            before: removed.item,
            after: null,
            mode: 'removed',
            metadata: {
                arrayItem: {
                    status: 'removed',
                    beforePosition: removed.index + 1,
                },
            },
        });
    });

    return changes;
};

const collectArrayItemDiffsByStableKey = (beforeArray, afterArray, metadata, path) => {
    if (!metadata) {
        return [];
    }

    const changes = [];

    metadata.afterKeys.forEach((key, afterIndex) => {
        const beforeIndex = metadata.beforeIndexByKey.get(key);

        if (beforeIndex === undefined) {
            return;
        }

        changes.push(
            ...collectRecursiveDiff(
                beforeArray[beforeIndex],
                afterArray[afterIndex],
                joinArrayPath(path || 'items', afterIndex)
            )
        );
    });

    return changes;
};

const shouldUseStableArrayDiff = (beforeArray, afterArray, path) => {
    const metadata = getArrayMatchMetadata(beforeArray, afterArray, path);

    if (!metadata) {
        return null;
    }

    const beforeKeySet = new Set(metadata.beforeKeys);
    const afterKeySet = new Set(metadata.afterKeys);
    const hasAddedOrRemoved =
        metadata.beforeKeys.some((key) => !afterKeySet.has(key)) ||
        metadata.afterKeys.some((key) => !beforeKeySet.has(key));
    const hasMoved = metadata.beforeKeys.some((key, beforeIndex) => {
        const afterIndex = metadata.afterIndexByKey.get(key);
        return afterIndex !== undefined && afterIndex !== beforeIndex;
    });

    return hasAddedOrRemoved || hasMoved ? metadata : null;
};

const collectRecursiveDiff = (before, after, path = '') => {
    if (path && isSystemPath(path)) {
        return [];
    }

    if (valuesAreEqual(before, after)) {
        return [];
    }

    /**
     * Component specific rule:
     * If the component type stays the same, do not summarize the whole component
     * just because id changed. Continue walking into actual editable fields.
     */
    if (path && isComponentObject(before) && isComponentObject(after)) {
        const beforeComponent = getComponentUid(before);
        const afterComponent = getComponentUid(after);

        if (beforeComponent !== afterComponent) {
            return [{ path, before, after, mode: 'summary' }];
        }
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
        const stableArrayMetadata = shouldUseStableArrayDiff(beforeArray, afterArray, path);

        if (stableArrayMetadata) {
            return [
                ...buildArrayMoveChanges(beforeArray, stableArrayMetadata, path),
                ...buildArrayAddedRemovedOrUpdatedChanges(
                    beforeArray,
                    afterArray,
                    stableArrayMetadata,
                    path
                ),
                ...collectArrayItemDiffsByStableKey(
                    beforeArray,
                    afterArray,
                    stableArrayMetadata,
                    path
                ),
            ];
        }

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