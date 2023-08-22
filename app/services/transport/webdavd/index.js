// webdav.js
const webdav = require('webdav-server').v2
const server = new webdav.WebDAVServer()


const notes = [
    { id: 1, title: "note1", body: "This is the first note" },
    { id: 2, title: "note2", body: "This is the second note" },
    { id: 3, title: "note3", body: "This is the third note" }
];

exports.start = (ctx) => {
    server.start()

    server.setFileSystem("/notes", {
        getContent: async (context, path, callback) => {
            for (const note of notes) {
                if (path === `/${note.title}.txt`) {
                    callback(undefined, Buffer.from(note.body));
                    return;
                }
            }
            callback("File not found");
        },
        stat: async (context, path, callback) => {
            for (const note of notes) {
                if (path === `/${note.title}.txt`) {
                    callback(undefined, {
                        mime: "text/plain",
                        size: note.body.length
                    });
                    return;
                }
            }
            callback("File not found");
        }
    });

    server.listen(process.env.PORT || 1090, function () {
        console.log("Listening on http://localhost:" + server.server.address().port);
    });

}

exports.stop = () => {
    server.stop()
}

exports.restart = () => {
    return true
}

exports.status = () => {
    return true
}


