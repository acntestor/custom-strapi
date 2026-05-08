import { getFetchClient } from '@strapi/strapi/admin';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_SORT = 'eventDate:DESC';

const normalizeParams = (params = {}) => {
    return {
        page: params.page || DEFAULT_PAGE,
        pageSize: params.pageSize || DEFAULT_PAGE_SIZE,
        sort: params.sort || DEFAULT_SORT,
        action: params.action || '',
        category: params.category || '',
        actorEmail: params.actorEmail || '',
        actorEmailOperator: params.actorEmailOperator || '',
        ip: params.ip || '',
        ipOperator: params.ipOperator || '',
        contentTypeUid: params.contentTypeUid || '',
        startDate: params.startDate || '',
        endDate: params.endDate || '',
    };
};

const buildQueryString = (params = {}) => {
    const normalizedParams = normalizeParams(params);
    const searchParams = new URLSearchParams();

    Object.entries(normalizedParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            searchParams.append(key, String(value));
        }
    });

    const queryString = searchParams.toString();

    return queryString ? `?${queryString}` : '';
};

const auditLogApi = {
    async findMany(params = {}) {
        const { get } = getFetchClient();
        const queryString = buildQueryString(params);
        const { data } = await get(`/ac-audit-log/logs${queryString}`);

        return data;
    },

    async findOne(id) {
        const { get } = getFetchClient();
        const { data } = await get(`/ac-audit-log/logs/${id}`);

        return data;
    },

    async getFilterOptions() {
        const { get } = getFetchClient();
        const { data } = await get('/ac-audit-log/filter-options');

        return data;
    },
};

export default auditLogApi;