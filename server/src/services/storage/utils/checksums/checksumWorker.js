const { parentPort } = require('worker_threads');
const { checksumFile } = require('./index');

parentPort.on('message', async ({ filePaths, algorithm }) => {
    try {
        const results = {};
        for (const filePath of filePaths) {
            results[filePath] = await checksumFile(filePath, algorithm);
        }
        parentPort.postMessage(results);
    } catch (error) {
        parentPort.postMessage({ error: error.message });
    }
});
