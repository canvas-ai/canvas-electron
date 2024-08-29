module.exports = {
    // Context events
    EVENT_CONTEXT_URL: 'context:url',
    EVENT_CONTEXT_DATA: 'context:data',
    EVENT_CONTEXT_UPDATE: 'context:update',

    // Session routes
    SESSION_LIST: 'session:list',
    SESSION_LIST_ACTIVE: 'session:list:active', // TODO: Will be merged to SESSION_LIST
    SESSION_GET: 'session:get',
    SESSION_GET_ID: 'session:get:id',
    SESSION_CREATE: 'session:create',
    SESSION_REMOVE: 'session:remove',
    SESSION_OPEN: 'session:open',
    SESSION_CLOSE: 'session:close',
    SESSION_DELETE: 'session:delete',
    // Session context routes
    SESSION_CONTEXT_LIST: 'session:context:list',
    SESSION_CONTEXT_GET: 'session:context:get',
    SESSION_CONTEXT_GET_ID: 'session:context:get:id',
    SESSION_CONTEXT_CREATE: 'session:context:create',
    SESSION_CONTEXT_REMOVE: 'session:context:remove',

    // Context routes
    CONTEXT_GET: 'context:get',
    CONTEXT_GET_ID: 'context:get:id',
    CONTEXT_GET_STATS: 'context:get:stats',

    CONTEXT_GET_URL: 'context:get:url',
    CONTEXT_SET_URL: 'context:set:url',

    CONTEXT_GET_TREE: 'context:get:tree',
    CONTEXT_GET_PATH: 'context:get:path',
    CONTEXT_GET_BITMAPS: 'context:get:bitmaps',

    CONTEXT_GET_CONTEXT_ARRAY: 'context:get:contextArray',
    CONTEXT_GET_FEATURE_ARRAY: 'context:get:featureArray',
    CONTEXT_GET_FILTER_ARRAY: 'context:get:filterArray',

    // Context path routes
    CONTEXT_PATH_INSERT: 'context:path:insert',
    CONTEXT_PATH_REMOVE: 'context:path:remove',
    CONTEXT_PATH_MOVE: 'context:path:move',
    CONTEXT_PATH_COPY: 'context:path:copy',

    // Context document routes
    CONTEXT_DOCUMENT_LIST: 'context:document:list',
    CONTEXT_DOCUMENT_GET: 'context:document:get',
    CONTEXT_DOCUMENT_GET_BY_HASH: 'context:document:get:byHash',
    CONTEXT_DOCUMENT_GET_ARRAY: 'context:document:getArray',
    CONTEXT_DOCUMENT_INSERT: 'context:document:insert',
    CONTEXT_DOCUMENT_INSERT_ARRAY: 'context:document:insertArray',
    CONTEXT_DOCUMENT_UPDATE: 'context:document:update',
    CONTEXT_DOCUMENT_UPDATE_ARRAY: 'context:document:updateArray',
    CONTEXT_DOCUMENT_REMOVE: 'context:document:remove',
    CONTEXT_DOCUMENT_REMOVE_ARRAY: 'context:document:removeArray',
    CONTEXT_DOCUMENT_DELETE: 'context:document:delete',
    CONTEXT_DOCUMENT_DELETE_ARRAY: 'context:document:deleteArray',

    // Context feature routes
    CONTEXT_FEATURE_LIST: 'context:feature:list',
    CONTEXT_FEATURE_INSERT: 'context:feature:insert',
    CONTEXT_FEATURE_REMOVE: 'context:feature:remove',
    CONTEXT_FEATURE_GET: 'context:feature:get',
    CONTEXT_FEATURE_HAS: 'context:feature:has',

    // Document routes
    DOCUMENT_LIST: 'document:list',
    DOCUMENT_GET: 'document:get',
    DOCUMENT_GET_BY_HASH: 'document:get:byHash',
    DOCUMENT_GET_ARRAY: 'document:getArray',
    DOCUMENT_INSERT: 'document:insert',
    DOCUMENT_INSERT_ARRAY: 'document:insertArray',
    DOCUMENT_UPDATE: 'document:update',
    DOCUMENT_UPDATE_ARRAY: 'document:updateArray',
    DOCUMENT_REMOVE: 'document:remove',
    DOCUMENT_REMOVE_ARRAY: 'document:removeArray',
    DOCUMENT_DELETE: 'document:delete',
    DOCUMENT_DELETE_ARRAY: 'document:deleteArray',

    // Layer routes
    LAYER_LIST: 'layer:list',
    LAYER_GET: 'layer:get',
    LAYER_GET_BY_NAME: 'layer:get:byName',
    LAYER_UPDATE: 'layer:update',
    LAYER_RENAME: 'layer:rename',
    LAYER_DELETE: 'layer:delete',

    // Feature routes
    FEATURE_LIST: 'feature:list',
    FEATURE_GET: 'feature:get',
    FEATURE_INSERT: 'feature:insert',
    FEATURE_REMOVE: 'feature:remove',
    FEATURE_UPDATE: 'feature:update',
    FEATURE_DELETE: 'feature:delete',

};
