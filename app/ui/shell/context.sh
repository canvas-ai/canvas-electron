#!/bin/bash

# Get the directory of the current script
SCRIPT_DIR=$(dirname "${BASH_SOURCE[0]}")

# Source common.sh from the same directory
source "${SCRIPT_DIR}/common.sh"


#########################################
# Canvas REST API bash wrapper          #
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

        canvas_http_get "/context/tree" #| jq -C '.'
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
            canvas_http_get "/documents"
        else
            case "$1" in
            notes)
                canvas_http_get "/documents/notes"
                ;;
            tabs)
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

