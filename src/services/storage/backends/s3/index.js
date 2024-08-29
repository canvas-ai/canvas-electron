const AWS = require('aws-sdk');
const StorageBackend = require('../StorageBackend');

/*
this.s3 = new AWS.S3({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    endpoint: new AWS.Endpoint(config.endpoint),  // Minio endpoint URL
    s3ForcePathStyle: true  // Needed for Minio to work properly
});
*/

class S3StorageBackend extends StorageBackend {
    constructor(config) {
        super(config);
        this.s3 = new AWS.S3({
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
            region: config.region
        });
        this.bucketName = config.bucketName;
        this.status = 'initialized';
    }

    async putAsBinary(key, data, metadata) {
        const params = {
            Bucket: this.bucketName,
            Key: key,
            Body: data,
            Metadata: metadata
        };
        return this.s3.upload(params).promise();
    }

    async putAsObject(key, data, metadata) {
        const stringData = JSON.stringify(data);
        const params = {
            Bucket: this.bucketName,
            Key: key,
            Body: stringData,
            Metadata: metadata,
            ContentType: 'application/json'
        };
        return this.s3.upload(params).promise();
    }

    async putAsFile(key, filePath, metadata) {
        const fs = require('fs');
        const stream = fs.createReadStream(filePath);
        const params = {
            Bucket: this.bucketName,
            Key: key,
            Body: stream,
            Metadata: metadata
        };
        return this.s3.upload(params).promise();
    }

    async get(key, options = {}) {
        const params = {
            Bucket: this.bucketName,
            Key: key,
            ...options
        };
        return this.s3.getObject(params).promise().then(data => data.Body);
    }

    async getFile(key, options = {}) {
        const params = {
            Bucket: this.bucketName,
            Key: key
        };

        if (options.stream) {
            // Return a readable stream
            return this.s3.getObject(params).createReadStream();
        } else {
            // Return the full file content
            const data = await this.s3.getObject(params).promise();
            return data.Body;
        }
    }

    async getBinary(key, options = {}) {
        const params = {
            Bucket: this.bucketName,
            Key: key
        };

        if (options.stream) {
            // Return a readable stream
            return this.s3.getObject(params).createReadStream();
        } else {
            // Return the full binary content
            const data = await this.s3.getObject(params).promise();
            return data.Body;
        }
    }


    async has(key) {
        try {
            await this.stat(key);
            return true;
        } catch (error) {
            if (error.code === 'NoSuchKey') {
                return false;
            }
            throw error;
        }
    }

    async delete(key) {
        const params = {
            Bucket: this.bucketName,
            Key: key
        };
        return this.s3.deleteObject(params).promise();
    }

    async list(options = {}) {
        const params = {
            Bucket: this.bucketName,
            ...options
        };
        return this.s3.listObjectsV2(params).promise();
    }

    async stat(key) {
        const params = {
            Bucket: this.bucketName,
            Key: key
        };
        return this.s3.headObject(params).promise();
    }
}

module.exports = S3StorageBackend;
