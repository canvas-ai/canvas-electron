// Javascript
const webdav = require('webdav-server').v2;

const server = new webdav.WebDAVServer();

server.rootFileSystem().addSubTree(server.createExternalContext(), {
    'folder1': {                                // /folder1
        'file1.txt': webdav.ResourceType.File,  // /folder1/file1.txt
        'file2.txt': webdav.ResourceType.File   // /folder1/file2.txt
    },
    'file0.txt': webdav.ResourceType.File       // /file0.txt
})

context.on('change', (url) => {


    server.rootFileSystem().addSubTree(server.createExternalContext(), {
        'notes': {                                // /folder1
            'file1.txt': webdav.ResourceType.File,  // /folder1/file1.txt
            'file2.txt': webdav.ResourceType.File   // /folder1/file2.txt
        },
        'change.txt': webdav.ResourceType.File       // /file0.txt
    })

})


server.start(() => console.log('READY'));
