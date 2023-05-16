#!/bin/bash


# Get the path of the directory containing this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

# Get the path of the ROOT directory by going up one level from SCRIPT_DIR
CANVAS_ROOT="$(cd "$SCRIPT_DIR/../../.." >/dev/null 2>&1 && pwd)"

# Set the path of the config file
if [ -f $HOME/.canvas/config/jsonapi.json ]; then
    CANVAS_CONFIG="$HOME/.canvas/config/jsonapi-client.json";
else
    CANVAS_CONFIG="$CANVAS_ROOT/config/jsonapi-client.json"
fi;

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
    local url="$1"
    local result=$(curl -s \
        -X GET \
        -w "%{http_code}" \
        -H "Content-Type: application/json" \
        -H "API-KEY: $CANVAS_API_KEY" \
        "$CANVAS_URL$url")

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
        return 1
    fi

    echo "$payload"
}


canvas_http_post() {
    local url="$1"
    local data="$2"
    local result=$(curl -s \
        -X POST \
        -w "%{http_code}" \
        -H "Content-Type: application/json" \
        -H "API-KEY: $CANVAS_API_KEY" \
        -d "$data" \
        "$CANVAS_URL$url")

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
        return 1
    fi

    echo "$payload"
}


canvas_http_put() {
    local url="$1"
    local data="$2"
    local result=$(curl -s \
        -X PUT \
        -w "%{http_code}" \
        -H "Content-Type: application/json" \
        -H "API-KEY: $CANVAS_API_KEY" \
        -d "$data" \
        "$CANVAS_URL$url")

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
        return 1
    fi

    echo "$payload"
}

canvas_http_patch() {
    local url="$1"
    local data="$2"
    local result=$(curl -s \
        -X PATCH \
        -w "%{http_code}" \
        -H "Content-Type: application/json" \
        -H "API-KEY: $CANVAS_API_KEY" \
        -d "$data" \
        "$CANVAS_URL$url")

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
        return 1
    fi

    echo "$payload"
}


#########################################
# Canvas context API bash wrapper       #
#########################################
function context() {
    # Check for arguments
    if [[ $# -eq 0 ]]; then
        echo "Error: missing argument"
        echo "Usage: context <command> [arguments]"
        return 1
    fi

    # Parse command and arguments
    local command="$1"
    shift

    case "$command" in
    set)
        # Parse URL argument
        if [[ $# -ne 1 ]]; then
            echo "Error: invalid arguments for 'set' command"
            echo "Usage: context set <url>"
            return 1
        fi

        if ! canvas_api_reachable; then
            echo "Error: Canvas API endpoint not reachable on $CANVAS_HOST:$CANVAS_PORT"
            return 1
        fi

        local url="$1"
        canvas_http_post "/context/url" "{\"url\": \"$url\"}"
        if [[ $? -ne 0 ]]; then
            echo "Error: failed to set context URL"
            return 1
        fi
        ;;
    tree)
        if ! canvas_api_reachable; then
            echo "Error: Canvas API endpoint not reachable on $CANVAS_HOST:$CANVAS_PORT"
            return 1
        fi

        canvas_http_get "/context/tree" | jq -C '.'
        ;;
    path)
        if ! canvas_api_reachable; then
            echo "Error: Canvas API endpoint not reachable on $CANVAS_HOST:$CANVAS_PORT"
            return 1
        fi

        canvas_http_get "/context/path" | jq '.path' | sed 's/"//g'
        ;;
    paths)
        if ! canvas_api_reachable; then
            echo "Error: Canvas API endpoint not reachable on $CANVAS_HOST:$CANVAS_PORT"
            return 1
        fi

        canvas_http_get "/context/paths" | jq '.paths'
        ;;        
    url)
        if ! canvas_api_reachable; then
            echo "Error: Canvas API endpoint not reachable on $CANVAS_HOST:$CANVAS_PORT"
            return 1
        fi

        canvas_http_get "/context/url" | jq '.url' | sed 's/"//g'
        ;;
    add)
        # Parse path argument
        if [[ $# -ne 1 ]]; then
            echo "Error: invalid arguments for 'add' command"
            echo "Usage: context add <path>"
            return 1
        fi

        if ! canvas_api_reachable; then
            echo "Error: Canvas API endpoint not reachable on $CANVAS_HOST:$CANVAS_PORT"
            return 1
        fi

        local path="$1"
        # TODO: send API request to add file or folder to context
        ;;
    list)
        if ! canvas_api_reachable; then
            echo "Error: Canvas API endpoint not reachable on $CANVAS_HOST:$CANVAS_PORT"
            return 1
        fi

        # Parse optional document type argument
        if [[ $# -eq 0 ]]; then
            echo "Documents:"
            canvas_http_get "/documents"
        else
            case "$1" in
            notes)
                echo "Notes:"
                canvas_http_get "/documents/notes"
                ;;
            tabs)
                echo "Tabs:"
                canvas_http_get "/documents/tabs"
                ;;                
            *)
                echo "Error: unknown document type '$1'"
                echo "Usage: context list [document type]"
                return 1
                ;;
            esac
        fi
        ;;
    *)
        echo "Error: unknown command '$command'"
        echo "Usage: context <command> [arguments]"
        return 1
        ;;
    esac
}

# Add context URL to prompt
if canvas_api_reachable; then
    # Add the initial PS1 prompt
    export PS1="[\$(context path)] $PS1";
fi;

