// Common response object for API responses over supported transports

class ResponseObject {

    constructor() {
        this.status = 'error'; // Default to error to ensure explicit success setting
        this.message = null;
        this.payload = null;
    }

    // Success: Generic success
    success(payload, message = 'Request successful') {
        this.status = 'success';
        this.message = message;
        this.payload = payload;
        return this;
    }

    // Create: Successful creation of a resource
    created(payload, message = 'Resource created successfully') {
        this.status = 'success';
        this.message = message;
        this.payload = payload;
        return this;
    }

    // Read: Successful retrieval of a resource
    found(payload, message = 'Resource found') {
        this.status = 'success';
        this.message = message;
        this.payload = payload;
        return this;
    }

    // Update: Successful update of a resource
    updated(payload, message = 'Resource updated successfully') {
        this.status = 'success';
        this.message = message;
        this.payload = payload;
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

    // Bad Request: Invalid request payload
    badRequest(message = 'Invalid request payload') {
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

    // Conflict: Conflict in request, such as duplicate payload
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
            payload: this.payload,
        };
    }
}

module.exports = ResponseObject;
