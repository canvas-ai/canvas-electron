module.exports = {

    /**
     * Builtin context / system roots
     */

    universe: {
        id: '0000-0000-0000',
        type: 'universe',
        name: '/',
        label: 'Universe',
        description: 'And then, there was ..no  geometry',
        color: '#fff',
        locked: true,
    },

    system: {
        id: '0000-0000-1000',
        type: 'system',
        name: '.canvas',
        label: 'Canvas',
        description: 'Canvas system tree',
        color: '#000',
        locked: true,
    },

    /**
     * Dynamic context singletons
     */

    device: {
        id: '0000-0000-2000',
        type: 'system',
        name: '.device',
        label: 'Current device',
        description: 'Current device',
        color: '#fff',
        locked: true,
    },

    user: {
        id: '0000-0000-2001',
        type: 'system',
        name: '.user',
        label: 'User',
        description: 'Current user',
        color: '#fff',
        locked: true,
    },

    session: {
        id: '0000-0000-2002',
        type: 'system',
        name: '.session',
        label: 'Session',
        description: 'Current session',
        color: '#fff',
        locked: true,
    },

};

