const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const { Worker } = require('worker_threads');

/**
 * Generate a checksum for a given input using a specified algorithm
 * @param {Buffer | string} data - Data to hash (Buffer or string)
 * @param {string} algorithm - Hash algorithm to use (e.g., 'sha256', 'md5')
 * @returns {string} - Hexadecimal checksum
 */
function generateChecksum(data, algorithm = 'sha256') {
    return crypto.createHash(algorithm).update(data).digest('hex');
}

/**
 * Calculate checksum for a JSON object
 * @param {Object} jsonObject - JSON object to hash
 * @param {string} algorithm - Hash algorithm to use
 * @returns {string} - Hexadecimal checksum
 */
function checksumJson(jsonObject, algorithm = 'sha256') {
    const jsonString = JSON.stringify(jsonObject);
    return generateChecksum(Buffer.from(jsonString), algorithm);
}

/**
 * Calculate checksum for a Buffer or binary data
 * @param {Buffer} buffer - Buffer data to hash
 * @param {string} algorithm - Hash algorithm to use
 * @returns {string} - Hexadecimal checksum
 */
function checksumBuffer(buffer, algorithm = 'sha256') {
    return generateChecksum(buffer, algorithm);
}

/**
 * Calculate checksum for a file
 * @param {string} filePath - Path to the file to hash
 * @param {string} algorithm - Hash algorithm to use
 * @returns {Promise<string>} - Hexadecimal checksum
 */
function checksumFile(filePath, algorithm = 'sha256') {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash(algorithm);
        const stream = fs.createReadStream(filePath);

        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', (err) => reject(err));
    });
}

/**
 * Calculate checksum for a file array using multiple worker threads
 * @param {array} filePaths - Array of file paths to hash
 * @param {*} algorithm - Hash algorithm to use
 * @returns {Promise<Object>} - Object containing file paths and checksums
 */
function checksumFileArray(filePaths, algorithm = 'sha256') {
    return new Promise((resolve, reject) => {
        const numCPUs = os.cpus().length;
        const chunkSize = Math.ceil(filePaths.length / numCPUs);
        let completedWorkers = 0;
        const results = new Map();

        for (let i = 0; i < numCPUs; i++) {
            const start = i * chunkSize;
            const end = start + chunkSize;
            const chunk = filePaths.slice(start, end);

            if (chunk.length === 0) { continue; }

            const worker = new Worker('./worker.js');

            worker.on('message', (msg) => {
                for (const [file, checksum] of Object.entries(msg)) {
                    results.set(file, checksum);
                }

                completedWorkers++;
                if (completedWorkers === numCPUs) {
                    resolve(Object.fromEntries(results));
                }
            });

            worker.on('error', reject);
            worker.on('exit', (code) => {
                if (code !== 0) {
                    reject(new Error(`Worker stopped with exit code ${code}`));
                }
            });

            worker.postMessage({ filePaths: chunk, algorithm });
        }
    });
}

module.exports = {
    checksumJson,
    checksumBuffer,
    checksumFile,
    checksumFileArray,
};

// Example usage
/* (async () => {
    const jsonChecksum = checksumJson({ key: "value" });
    console.log('JSON Checksum:', jsonChecksum);

    const bufferChecksum = checksumBuffer(Buffer.from("Hello, World!"));
    console.log('Buffer Checksum:', bufferChecksum);

    const fileChecksum = await checksumFile('/path/to/your/file.txt');
    console.log('File Checksum:', fileChecksum);

    const filesToProcess = [
        '/path/to/file1.txt',
        '/path/to/file2.txt',
        // ... more files
    ];

    checksumFileArray(filesToProcess)
        .then(results => console.log(results))
        .catch(err => console.error(err));

})(); */
