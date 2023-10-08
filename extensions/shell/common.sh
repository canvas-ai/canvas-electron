#!/bin/bash


#############################
# Runtime config            #
#############################

# Get the path of the directory containing this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

# Get the path of the CANVAS_ROOT directory (subject to change)
CANVAS_ROOT="$(cd "$SCRIPT_DIR/../../.." >/dev/null 2>&1 && pwd)"

# Set the path of the config file
if [ -f $HOME/.canvas/config/jsonapi.json ]; then
    CANVAS_CONFIG="$HOME/.canvas/config/jsonapi-client.json";
else
    CANVAS_CONFIG="$CANVAS_ROOT/config/jsonapi-client.json"
fi;

if test ! -z $DEBUG; then
    echo "DEBUG | Enabling Canvas integration for $SHELL"
    echo "DEBUG | Canvas root directory: $CANVAS_ROOT"
    echo "DEBUG | Canvas JSON API config file: $CANVAS_CONFIG"
fi


#############################
# Runtime dependencies      #
#############################

# Check if jq is available
if ! command -v jq >/dev/null 2>&1; then
    echo "ERROR | jq is not installed" >&2
fi

# Check if nc is available
if ! command -v nc >/dev/null 2>&1; then
    echo "ERROR | nc (netcat) is not installed" >&2
fi

# Check if curl is available
if ! command -v curl >/dev/null 2>&1; then
    echo "ERROR | curl is not installed" >&2
fi


#############################
# Global variables          #
#############################

# Define global variable defaults
CANVAS_PROTO="${CANVAS_PROTO:-http}"
CANVAS_HOST="${CANVAS_HOST:-127.0.0.1}"
CANVAS_PORT="${CANVAS_PORT:-3000}"
CANVAS_API_KEY="${CANVAS_API_KEY:-canvas-json-api}"

# Read values from JSON file if it exists
if [[ -f "$CANVAS_CONFIG" ]]; then
    # Read the JSON file into a Bash associative array
    declare -A config
    while IFS="=" read -r key value; do
        # Trim whitespace from key and value
        key="$(echo "$key" | tr -d '[:space:]')"
        value="$(echo "$value" | tr -d '[:space:]')"
        # Add key-value pair to associative array
        config["$key"]="$value"
    done < <(jq -r 'to_entries | .[] | .key + "=" + .value' "$CANVAS_CONFIG")

    # Update variables with values from config file
    CANVAS_PROTO="${config[protocol]:-$CANVAS_PROTO}"
    CANVAS_HOST="${config[host]:-$CANVAS_HOST}"
    CANVAS_PORT="${config[port]:-$CANVAS_PORT}"
    CANVAS_API_KEY="${config[key]:-$CANVAS_API_KEY}"
fi

CANVAS_URL="$CANVAS_PROTO://$CANVAS_HOST:$CANVAS_PORT"


# Define helper functions
canvas_api_reachable() {
	nc -zvw2 $CANVAS_HOST $CANVAS_PORT &>/dev/null
    return $?
}

canvas_http_get() {
    # Remove leading slash from the URL, if present
    local url="${1#/}"
    local result=$(curl -s \
        -X GET \
        -w "%{http_code}" \
        -H "Content-Type: application/json" \
        -H "API-KEY: $CANVAS_API_KEY" \
        "$CANVAS_URL/$url")

    # Extract the http_code from the end of the result string
    local http_code=${result: -3}

    # Extract the payload from the beginning of the result string
    local payload=${result:0:-3}

    if [[ $? -ne 0 ]]; then
        echo "Error: failed to send HTTP GET request"
        return 1
    fi

    if [[ $http_code -ne 200 ]]; then
        echo "Error: HTTP GET request failed with status code $http_code"
        echo "Request URL: $CANVAS_URL/$url"
        echo "Raw result: $result"
        return 1
    fi

    echo "$payload"
}


canvas_http_post() {

    # Remove leading slash from the URL, if present
    local url="${1#/}"
    local data="$2"
    local result=$(curl -s \
        -X POST \
        -w "%{http_code}" \
        -H "Content-Type: application/json" \
        -H "API-KEY: $CANVAS_API_KEY" \
        -d "$data" \
        "$CANVAS_URL/$url")

    # Extract the http_code from the end of the result string
    local http_code=${result: -3}

    # Extract the payload from the beginning of the result string
    local payload=${result:0:-3}

    if [[ $? -ne 0 ]]; then
        echo "Error: failed to send HTTP POST request"
        return 1
    fi

    if [[ $http_code -ne 200 ]]; then
        echo "Error: HTTP POST request failed with status code $http_code"
        echo "Request URL: $CANVAS_URL/$url"
        echo "Raw result: $result"
        return 1
    fi

    echo "$payload"
}


canvas_http_put() {
    # Remove leading slash from the URL, if present
    local url="${1#/}"
    local data="$2"
    local result=$(curl -s \
        -X PUT \
        -w "%{http_code}" \
        -H "Content-Type: application/json" \
        -H "API-KEY: $CANVAS_API_KEY" \
        -d "$data" \
        "$CANVAS_URL/$url")

    # Extract the http_code from the end of the result string
    local http_code=${result: -3}

    # Extract the payload from the beginning of the result string
    local payload=${result:0:-3}

    if [[ $? -ne 0 ]]; then
        echo "Error: failed to send HTTP PUT request"
        return 1
    fi

    if [[ $http_code -ne 200 ]]; then
        echo "Error: HTTP PUT request failed with status code $http_code"
        echo "Request URL: $CANVAS_URL/$url"
        echo "Raw result: $result"
        return 1
    fi

    echo "$payload"
}

canvas_http_patch() {
    # Remove leading slash from the URL, if present
    local url="${1#/}"
    local data="$2"
    local result=$(curl -s \
        -X PATCH \
        -w "%{http_code}" \
        -H "Content-Type: application/json" \
        -H "API-KEY: $CANVAS_API_KEY" \
        -d "$data" \
        "$CANVAS_URL/$url")

    # Extract the http_code from the end of the result string
    local http_code=${result: -3}

    # Extract the payload from the beginning of the result string
    local payload=${result:0:-3}

    if [[ $? -ne 0 ]]; then
        echo "Error: failed to send HTTP PATCH request"
        return 1
    fi

    if [[ $http_code -ne 200 ]]; then
        echo "Error: HTTP PATCH request failed with status code $http_code"
        echo "Request URL: $CANVAS_URL/$url"
        echo "Raw result: $result"
        return 1
    fi

    echo "$payload"
}
