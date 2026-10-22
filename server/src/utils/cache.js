const cache = new Map();

export const setCache = (key, value, ttl = 30) => {
    cache.set(key, {
        value,
        expiry: Date.now() + (ttl * 1000)
    });
};

export const getCache = (key) => {
    const item = cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
        cache.delete(key);
        return null;
    }
    return item.value;
};

export const clearCache = (key) => {
    if (key) {
        cache.delete(key);
    } else {
        cache.clear();
    }
};
