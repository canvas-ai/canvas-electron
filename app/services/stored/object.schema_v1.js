'use strict'

/*
 * This implementation of JSON Schema does
 * not conform with best practices, nor does it try to
 * Docu ref https://json-schema.org/
 */

module.exports = {
    type: "object",
    version: "1.0",
    properties: {

        "id": {
            type: "string",
            description: "Object ID"
        },

        "type": {
            type: "string",
            description: "Object type, for example data/abstraction/file"
        },


        "url": {
            type: "object",
            properties: {
                public: {
                    type: "array"
                },
                private: {
                    type: "array"
                }
            }
        },

        "meta": {
            type: "object",
            properties: {

                size: {
                    type: "number"
                },

                abstraction: {
                    type: "string"
                },

                xattr: {
                    type: "array"
                }

            },
            required: ["size", "abstraction"]
        },

        "hash": {
            type: "array",
        },

        "paths": {
            type: "array",
        },

        "segments": {
            type: "array",
        },

        "encryption": {
            type: "object",
        },

        "compression": {
            type: "object",
        },

        "versions": {
            type: "array",
        },

        "acl": {
            type: "object",
        }


    },

    required: ["id", "meta", "hash", "paths"],
    additionalProperties: false,

}
