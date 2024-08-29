// Utils
const path = require('path');
const fs = require('fs').promises;
const debug = require('debug')('canvas:stored:backend:file');
const {
    calculateBinaryChecksum,
    calculateObjectChecksum,
    calculateFileChecksum } = require('../../utils/checksums');

const { isFile, isBinary } = require('../../utils/common');

// Includes
const StorageBackend = require('../StorageBackend');

// Module Defaults
const DEFAULT_HASH_ALGO = 'sha1';
const DEFAULT_OBJECT_EXTENSION = 'json';
const DEFAULT_OBJECT_FORMAT = 'json'; // 'json' or 'binary' (msgpack)
const DEFAULT_METADATA_EXTENSION = 'meta.json';
const DEFAULT_METADATA_FORMAT = 'json'; // 'json' or 'binary' (msgpack)
const DEFAULT_BINARY_EXTENSION = 'bin';


/**
 * FileBackend
 *
 * Simple Canvas StoreD file backend module
 * All objects are stored as files in a directory structure based on their
 * type supplied in the metadata.
 * Objects metadata is stored in separate files with the same name as the object file
 * This is a very simple / naive implementation that should not be used for production
 * environments and/or with large amounts of data.
 *
 * @class FileBackend
 * @extends {StorageBackend}
 * @param {Object} config
 * @param {String} config.rootPath - The root path where the objects will be stored
 * @param {String} [config.hashAlgorithm='sha1'] - The hash algorithm to use for checksums
 * @param {String} [config.metadataExtension='meta.json'] - The extension for metadata files
 * @param {String} [config.metadataFormat='json'] - The format for metadata files (json or msgpack)

 */
class FileBackend extends StorageBackend {

    constructor(config) {
        debug('Initializing StoreD file backend..');
        if (!config.rootPath || typeof config.rootPath !== 'string') {
            throw new Error('No or Invalid rootPath configuration');
        }

        super(config);
        this.name = 'file';
        this.description = 'Simple Canvas StoreD file backend module';
        this.rootPath = config.rootPath;
        this.hashAlgorithm = config?.hashAlgorithm || DEFAULT_HASH_ALGO;
        this.metadataExtension = config?.metadataExtension || DEFAULT_METADATA_EXTENSION;
    }



    // Method for JavaScript objects
    async putObject(document, metadata) {
        if (!metadata && (!document.metadata || typeof document.metadata !== 'object')) {
            throw new Error('Metadata is required for putObject. Provide it either as a second argument or as document.metadata');
        }

        const finalMetadata = metadata || document.metadata;
        if (!finalMetadata.type || typeof finalMetadata.type !== 'string') {
            throw new Error('Document type is required in metadata and must be a string');
        }

        const checksum = calculateObjectChecksum(document, this.hashAlgorithm);

        /*
        let checksum;
        if (metadata.checksums[this.hashAlgorithm] && typeof metadata.checksums[this.hashAlgorithm] === 'string') {

        if (metadata.checksums[this.hashAlgorithm] && typeof metadata.checksums[this.hashAlgorithm] === 'string') {
            const existingHash = metadata.checksums[this.hashAlgorithm];
            const existingFilePath = await this.findFilePath(existingHash);
            if (existingFilePath) {
                debug(`Binary with hash ${existingHash} already exists at ${existingFilePath}`);
                // Calculate checksum of the found file and compare it with the provided hash (if options.strictChecksum is true)
                //if (metadata.strictChecksum) {
                const fileChecksum = await calculateFileChecksum(existingFilePath, this.hashAlgorithm);
                if (fileChecksum !== existingHash) {
                    throw new Error(`Checksum mismatch for existing file: ${existingHash} vs ${fileChecksum}`);
                }
                return { filePath: existingFilePath, checksum: existingHash };
            }
            debug(`Binary with hash ${existingHash} not found in the backend, creating a new file`);
            checksum = existingHash;
        } else {
            checksum = await calculateBinaryChecksum(data, this.hashAlgorithm);
        }
        // Update the checksum in metadata
        metadata.checksums = { [this.hashAlgorithm]: checksum };

        // TODO: This is controversial, but a synapsedb object calculates its hash on the document.data only, so for now this is necessary

        */
        finalMetadata.checksums = { [this.hashAlgorithm]: checksum };

        const fileName = this.generateFileName(checksum, 'json');
        const filePath = this.getFilePath(finalMetadata.type, fileName);

        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(document));

        if (metadata) {
            const metaFilePath = `${filePath}.${this.metadataExtension}`;
            await fs.writeFile(metaFilePath, JSON.stringify(finalMetadata));
        }

        return { filePath, checksum };
    }

    async putBinary(data, metadata) {
        if (!metadata || typeof metadata !== 'object') {
            throw new Error('Metadata is required for putBinary');
        }

        if (!metadata.type || typeof metadata.type !== 'string') {
            throw new Error('Document type is required in metadata and must be a string');
        }

        const checksum = await calculateBinaryChecksum(data, this.hashAlgorithm);
        metadata.checksums = { [this.hashAlgorithm]: checksum };

        const extension = metadata.extension || DEFAULT_BINARY_EXTENSION;
        const fileName = this.generateFileName(checksum, extension);
        const filePath = this.getFilePath(metadata.type, fileName);

        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, data);

        const metaFilePath = `${filePath}.${this.metadataExtension}`;
        await fs.writeFile(metaFilePath, JSON.stringify(metadata));

        return { filePath, checksum };
    }

    async putFile(filePath, metadata) {
        if (!isFile(filePath)) { throw new Error('Invalid file path'); }

        if (!metadata) {
            metadata = await this.extractFileMetadata(filePath);
        }

        if (!metadata.type || typeof metadata.type !== 'string') {
            throw new Error('Document type is required in metadata and must be a string');
        }

        const checksum = await calculateFileChecksum(filePath, this.hashAlgorithm);
        metadata.checksums = { [this.hashAlgorithm]: checksum };

        const extension = path.extname(filePath).slice(1) || 'bin';
        const fileName = this.generateFileName(checksum, extension);
        const newFilePath = this.getFilePath(metadata.type, fileName);

        await fs.mkdir(path.dirname(newFilePath), { recursive: true });
        await fs.copyFile(filePath, newFilePath);

        const metaFilePath = `${newFilePath}.${this.metadataExtension}`;
        await fs.writeFile(metaFilePath, JSON.stringify(metadata));

        return { filePath: newFilePath, checksum };
    }

    async get(documentHash, options = {}) {
        const filePath = await this.findFilePath(documentHash);
        if (!filePath) {
            throw new Error(`Document not found: ${documentHash}`);
        }

        const metaFilePath = `${filePath}.${this.metadataExtension}`;
        let metadata = null;

        try {
            const metadataContent = await fs.readFile(metaFilePath, 'utf8');
            metadata = JSON.parse(metadataContent);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                debug(`Warning: Error reading metadata file: ${error.message}`);
            }
        }

        if (options.metadataOnly) {
            return metadata ? { metadata } : null;
        }

        const data = await fs.readFile(filePath);
        const result = { data };

        if (metadata) {
            result.metadata = metadata;
        }

        return result;
    }

    async has(documentHash) {
        const filePath = await this.findFilePath(documentHash);
        return filePath !== null;
    }

    async extractFileMetadata(filePath) {
        const stats = await fs.stat(filePath);
        return {
            type: 'data/abstraction/file',
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            extension: path.extname(filePath).slice(1)
        };
    }

    async stat(documentHash) {
        const filePath = await this.findFilePath(documentHash);
        if (!filePath) {
            throw new Error(`Document not found: ${documentHash}`);
        }

        const stats = await fs.stat(filePath);
        const metaFilePath = `${filePath}.${this.metadataExtension}`;

        let metadata;
        try {
            metadata = JSON.parse(await fs.readFile(metaFilePath, 'utf8'));
        } catch (error) {
            if (error.code !== 'ENOENT') {
                debug(`Warning: Error reading metadata file: ${error.message}`);
            }
            // If metadata file doesn't exist or can't be read, we'll return file stats only
        }

        return {
            stats,
            metadata,
            filePath,
            metaFilePath: metadata ? metaFilePath : undefined
        };
    }

    async delete(documentHash) {
        const filePath = await this.findFilePath(documentHash);
        if (!filePath) {
            throw new Error(`Document not found: ${documentHash}`);
        }

        const metaFilePath = `${filePath}.${this.metadataExtension}`;

        try {
            await fs.unlink(filePath);
            debug(`Deleted file: ${filePath}`);

            try {
                await fs.unlink(metaFilePath);
                debug(`Deleted metadata file: ${metaFilePath}`);
            } catch (metaError) {
                if (metaError.code !== 'ENOENT') {
                    debug(`Warning: Could not delete metadata file: ${metaError.message}`);
                }
                // If the metadata file doesn't exist, we don't consider it an error
            }

            return true;
        } catch (error) {
            debug(`Error deleting file: ${error.message}`);
            throw error;
        }
    }

    async list(documentType = null) {
        const results = [];
        let types;

        if (documentType) {
            types = [documentType];
        } else {
            types = await fs.readdir(this.rootPath);
        }

        for (const type of types) {
            const typePath = path.join(this.rootPath, this.getTypeFolder(type));
            try {
                const files = await fs.readdir(typePath);
                for (const file of files) {
                    if (!file.endsWith(this.metadataExtension)) {
                        const filePath = path.join(typePath, file);
                        const stats = await fs.stat(filePath);
                        const hash = this.extractHashFromFileName(file);
                        results.push({
                            type,
                            hash,
                            filePath,
                            stats
                        });
                    }
                }
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    debug(`Warning: Error reading directory ${typePath}: ${error.message}`);
                }
                // If the directory doesn't exist, we just skip it
            }
        }
        return results;
    }

    getFilePath(type, fileName) {
        const folderName = this.getTypeFolder(type);
        return path.join(this.rootPath, folderName, fileName);
    }

    generateFileName(hash, extension) {
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
        return `${timestamp}.${hash.slice(0, 12)}.${extension}`;
    }

    async findFilePath(hash) {
        const documentTypes = await fs.readdir(this.rootPath);
        for (const documentType of documentTypes) {
            const typePath = path.join(this.rootPath, this.getTypeFolder(documentType));
            try {
                const files = await fs.readdir(typePath);
                const matchingFile = files.find(file => file.includes(hash.slice(0, 12)) && !file.endsWith(this.metadataExtension));
                if (matchingFile) {
                    return path.join(typePath, matchingFile);
                }
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    debug(`Warning: Error reading directory ${typePath}: ${error.message}`);
                }
                // If the directory doesn't exist, we just continue to the next type
            }
        }
        return null;
    }

    getTypeFolder(type) {
        return type.split('/').pop() + 's'; // Convert 'data/abstraction/file' to 'files'
    }

    getConfiguration() {
        return {
            name: this.name,
            description: this.description,
            rootPath: this.rootPath,
            hashAlgo: this.hashAlgorithm,
            metadataExtension: this.metadataExtension
        };
    }

    extractHashFromFileName(fileName) {
        const parts = fileName.split('.');
        return parts[1]; // Assumes the format is timestamp.hash.extension
    }
}

module.exports = FileBackend;
