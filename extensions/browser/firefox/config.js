function getNestedProp(obj, path, defaultValue) {
    const value = path.split('.').reduce((o, k) => (o || {})[k], obj);
    return value === undefined ? defaultValue : value;
}

const config = {
    sync: {
        autoRestoreSession: getNestedProp(store.get('sync'), 'autoRestoreSession', false),
        autoSaveSession: getNestedProp(store.get('sync'), 'autoSaveSession', false),
        autoOpenTabs: getNestedProp(store.get('sync'), 'autoOpenTabs', false)
    },

    session: {},

    transport: {
        protocol: getNestedProp(store.get('transport'), 'protocol', 'http'),
        host: getNestedProp(store.get('transport'), 'host', '127.0.0.1'),
        port: getNestedProp(store.get('transport'), 'port', 3001)
    },

    set: function (key, value) {
        this[key] = value;
        store.set(key, value);
        return this[key];
    },

    get: function (key) {
        return this[key];
    }
};
