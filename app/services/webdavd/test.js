const WebDAVServer = require("webdav-server").v2

const notes = [
  { id: 1, title: "note1", body: "This is the first note" },
  { id: 2, title: "note2", body: "This is the second note" },
  { id: 3, title: "note3", body: "This is the third note" }
];

const server = WebDAVServer.WebDAVServer();

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
