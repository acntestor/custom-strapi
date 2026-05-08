const parseFilters = (query = {}) => {
    return {
        action: query.action || null,
        category: query.category || null,
        actorEmail: query.actorEmail || null,
        actorEmailOperator: query.actorEmailOperator || 'contains',
        ip: query.ip || null,
        ipOperator: query.ipOperator || 'contains',
        contentTypeUid: query.contentTypeUid || null,
        startDate: query.startDate || null,
        endDate: query.endDate || null,
    };
};

export default ({ strapi }) => ({
    async find(ctx) {
        const page = ctx.query.page || 1;
        const pageSize = ctx.query.pageSize || 50;
        const sort = ctx.query.sort || 'eventDate:DESC';

        const { results, pagination } = await strapi
            .plugin('ac-audit-log')
            .service('audit-log')
            .findMany({
                page,
                pageSize,
                sort,
                filters: parseFilters(ctx.query),
            });

        ctx.body = {
            data: results,
            meta: {
                pagination,
            },
        };
    },

    async findOne(ctx) {
        const { id } = ctx.params;

        const auditLog = await strapi
            .plugin('ac-audit-log')
            .service('audit-log')
            .findOne(id);

        if (!auditLog) {
            ctx.notFound('Audit log not found');
            return;
        }

        ctx.body = {
            data: auditLog,
        };
    },

    async filterOptions(ctx) {
        const options = await strapi
            .plugin('ac-audit-log')
            .service('audit-log')
            .getFilterOptions();

        ctx.body = {
            data: options,
        };
    },
});