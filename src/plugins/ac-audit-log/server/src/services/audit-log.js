const AUDIT_LOG_UID = 'plugin::ac-audit-log.audit-log';

const DEFAULT_MASK_FIELDS = [
    'password',
    'currentPassword',
    'newPassword',
    'confirmPassword',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'authorization',
    'cookie',
];

const ALLOWED_SORT_FIELDS = [
    'id',
    'eventDate',
    'createdAt',
    'action',
    'actorEmail',
    'ip',
];

const LIST_SELECT_FIELDS = [
    'id',
    'action',
    'category',
    'eventDate',
    'actorType',
    'actorId',
    'actorEmail',
    'actorDisplayName',
    'ip',
    'contentTypeUid',
    'targetDocumentId',
    'targetEntityId',
    'targetLocale',
    'createdAt',
    'updatedAt',
];

const FILTER_OPTION_SELECT_FIELDS = [
    'action',
    'contentTypeUid',
    'actorEmail',
    'ip',
];

const isPlainObject = (value) => {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const maskSensitiveData = (value, maskFields = DEFAULT_MASK_FIELDS) => {
    if (Array.isArray(value)) {
        return value.map((item) => maskSensitiveData(item, maskFields));
    }

    if (!isPlainObject(value)) {
        return value;
    }

    return Object.entries(value).reduce((acc, [key, fieldValue]) => {
        const shouldMask = maskFields.some(
            (field) => field.toLowerCase() === key.toLowerCase()
        );

        acc[key] = shouldMask
            ? '[REDACTED]'
            : maskSensitiveData(fieldValue, maskFields);

        return acc;
    }, {});
};

const normalizeLogData = (data = {}) => {
    return {
        action: data.action,
        category: data.category || 'system',
        eventDate: data.eventDate || new Date().toISOString(),

        actorType: data.actorType || 'unknown',
        actorId: data.actorId || null,
        actorEmail: data.actorEmail || null,
        actorDisplayName: data.actorDisplayName || null,

        ip: data.ip || null,
        userAgent: data.userAgent || null,
        method: data.method || null,
        path: data.path || null,
        statusCode: data.statusCode || null,
        requestId: data.requestId || null,

        contentTypeUid: data.contentTypeUid || null,
        targetDocumentId: data.targetDocumentId || null,
        targetEntityId: data.targetEntityId || null,
        targetLocale: data.targetLocale || null,

        payload: data.payload ? maskSensitiveData(data.payload) : null,
        requestBody: data.requestBody ? maskSensitiveData(data.requestBody) : null,
        responseBody: data.responseBody ? maskSensitiveData(data.responseBody) : null,

        before: data.before ? maskSensitiveData(data.before) : null,
        after: data.after ? maskSensitiveData(data.after) : null,
        diff: data.diff || null,
        metadata: data.metadata || null,
    };
};

const normalizeTextOperator = (operator) => {
    return operator === 'is' ? 'is' : 'contains';
};

const buildTextWhere = (value, operator = 'contains', options = {}) => {
    if (!value) {
        return null;
    }

    const normalizedOperator = normalizeTextOperator(operator);
    const { exactCaseInsensitive = true } = options;

    if (normalizedOperator === 'is') {
        return exactCaseInsensitive ? { $eqi: value } : { $eq: value };
    }

    return { $containsi: value };
};

const buildWhere = (filters = {}) => {
    const where = {};

    if (filters.action) {
        where.action = filters.action;
    }

    if (filters.category) {
        where.category = filters.category;
    }

    if (filters.actorEmail) {
        where.actorEmail = buildTextWhere(
            filters.actorEmail,
            filters.actorEmailOperator,
            {
                exactCaseInsensitive: true,
            }
        );
    }

    if (filters.ip) {
        where.ip = buildTextWhere(filters.ip, filters.ipOperator, {
            exactCaseInsensitive: false,
        });
    }

    if (filters.contentTypeUid) {
        where.contentTypeUid = filters.contentTypeUid;
    }

    if (filters.startDate || filters.endDate) {
        where.eventDate = {};

        if (filters.startDate) {
            where.eventDate.$gte = filters.startDate;
        }

        if (filters.endDate) {
            where.eventDate.$lte = filters.endDate;
        }
    }

    return where;
};

const buildOrderBy = (sort = 'eventDate:DESC') => {
    const [rawField, rawDirection] = String(sort).split(':');

    const field = ALLOWED_SORT_FIELDS.includes(rawField)
        ? rawField
        : 'eventDate';

    const direction =
        String(rawDirection || 'DESC').toLowerCase() === 'asc'
            ? 'asc'
            : 'desc';

    return {
        [field]: direction,
    };
};

const toOption = (value) => {
    return {
        label: value,
        value,
    };
};

const toUniqueOptions = (rows, fieldName) => {
    const values = new Set();

    rows.forEach((row) => {
        const value = row?.[fieldName];

        if (value) {
            values.add(String(value));
        }
    });

    return [...values].sort().map(toOption);
};

export default ({ strapi }) => ({
    async createLog(data) {
        const normalizedData = normalizeLogData(data);

        if (!normalizedData.action) {
            throw new Error('Audit log action is required');
        }

        return strapi.db.query(AUDIT_LOG_UID).create({
            data: normalizedData,
        });
    },

    async findMany(params = {}) {
        const page = Math.max(Number(params.page || 1), 1);
        const pageSize = Math.min(
            Math.max(Number(params.pageSize || 50), 1),
            100
        );

        const offset = (page - 1) * pageSize;
        const where = buildWhere(params.filters || {});
        const orderBy = buildOrderBy(params.sort);

        const [results, total] = await Promise.all([
            strapi.db.query(AUDIT_LOG_UID).findMany({
                select: LIST_SELECT_FIELDS,
                where,
                orderBy,
                limit: pageSize,
                offset,
            }),
            strapi.db.query(AUDIT_LOG_UID).count({
                where,
            }),
        ]);

        return {
            results,
            pagination: {
                page,
                pageSize,
                pageCount: Math.ceil(total / pageSize),
                total,
            },
        };
    },

    async findOne(id) {
        return strapi.db.query(AUDIT_LOG_UID).findOne({
            where: {
                id: Number(id),
            },
        });
    },

    async getFilterOptions() {
        const rows = await strapi.db.query(AUDIT_LOG_UID).findMany({
            select: FILTER_OPTION_SELECT_FIELDS,
            orderBy: {
                eventDate: 'desc',
            },
            limit: 1000,
        });

        return {
            actions: toUniqueOptions(rows, 'action'),
            contentTypes: toUniqueOptions(rows, 'contentTypeUid'),
            actorEmails: toUniqueOptions(rows, 'actorEmail'),
            ips: toUniqueOptions(rows, 'ip'),
        };
    },

    maskSensitiveData,
});