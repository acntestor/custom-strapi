import { AsyncLocalStorage } from 'node:async_hooks';

const storage = new AsyncLocalStorage();

export const runWithRequestContext = (context, callback) => {
    return storage.run(context, callback);
};

export const getRequestContext = () => {
    return storage.getStore() || {};
};