const getFirstForwardedIp = (value) => {
    if (!value || typeof value !== 'string') {
        return null;
    }

    return (
        value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)[0] || null
    );
};

export const resolveClientIp = (ctx) => {
    const headers = ctx.request?.headers || {};

    return (
        headers['cf-connecting-ip'] ||
        headers['x-real-ip'] ||
        getFirstForwardedIp(headers['x-forwarded-for']) ||
        ctx.ip ||
        ctx.request?.ip ||
        null
    );
};