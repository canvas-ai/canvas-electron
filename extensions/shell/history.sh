#!/bin/bash


# Contextualize your bash history with Canvas

#############################
# Contex

# Set the history storage backend
# Options:
#   local: Create a local history file in ~/.canvas/data/history
#   canvas: Store history in Canvas
HISTORY_BACKEND="local"

intercept_history() {

    echo "Intercepted $BASH_COMMAND"


    # Handle command history interception here
    if [[ "$BASH_COMMAND" =~ ^(history -a|history -c|history -r)$ ]]; then
        # Intercept writes (history -a), clears (history -c), and reads (history -r)
        # Perform your desired operations here, such as storing the command history in your database backend or loading it from the database
        echo "foo"
    else
        # All other commands, execute normally
        "$BASH_COMMAND"
    fi
}

PROMPT_COMMAND="intercept_history"
