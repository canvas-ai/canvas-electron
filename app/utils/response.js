// File: /utils/response.js

class ResponseObject {
    
    constructor() {
        this.status = 'error'; // Default to error to ensure explicit success setting
        this.message = null;
        this.data = null;
    }

    // Success: Generic success
    success(data, message = 'Request successful') {
        this.status = 'success';
        this.message = message;
        this.data = data;
        return this;
    }

    // Create: Successful creation of a resource
    created(data, message = 'Resource created successfully') {
        this.status = 'success';
        this.message = message;
        this.data = data;
        return this;
    }

    // Read: Successful retrieval of a resource
    found(data, message = 'Resource found') {
        this.status = 'success';
        this.message = message;
        this.data = data;
        return this;
    }

    // Update: Successful update of a resource
    updated(data, message = 'Resource updated successfully') {
        this.status = 'success';
        this.message = message;
        this.data = data;
        return this;
    }

    // Delete: Successful deletion of a resource
    deleted(message = 'Resource deleted successfully') {
        this.status = 'success';
        this.message = message;
        return this;
    }

    // Not Found: Resource not found
    notFound(message = 'Resource not found') {
        this.status = 'error';
        this.message = message;
        return this;
    }

    // Error: Generic error
    error(message) {
        this.status = 'error';
        this.message = message;
        return this;
    }

    // Bad Request: Invalid request data
    badRequest(message = 'Invalid request data') {
        this.status = 'error';
        this.message = message;
        return this;
    }

    // Unauthorized: Authentication required
    unauthorized(message = 'Authentication required') {
        this.status = 'error';
        this.message = message;
        return this;
    }

    // Forbidden: Insufficient permissions
    forbidden(message = 'Insufficient permissions') {
        this.status = 'error';
        this.message = message;
        return this;
    }

    // Conflict: Conflict in request, such as duplicate data
    conflict(message = 'Conflict in request') {
        this.status = 'error';
        this.message = message;
        return this;
    }

    // Server Error: Internal server error
    serverError(message = 'Internal server error') {
        this.status = 'error';
        this.message = message;
        return this;
    }

    // Method to get the final response object
    getResponse() {
        return {
            status: this.status,
            message: this.message,
            data: this.data,
        };
    }
}

module.exports = ResponseObject;
