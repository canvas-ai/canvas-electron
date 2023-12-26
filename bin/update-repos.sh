#!/bin/bash


# Creadits for this script goes to chatgpt


# Find the Canvas directory from the current path
canvas_dir=$(pwd)
while [[ $canvas_dir != '/' && $(basename "$canvas_dir") != 'Canvas' ]]; do
    canvas_dir=$(dirname "$canvas_dir")
done

# Check if Canvas directory is found
if [[ $(basename "$canvas_dir") != 'Canvas' ]]; then
    echo "Canvas directory not found."
    exit 1
fi

# Update repositories
update_repos() {
    for dir in "$canvas_dir"/*/; do
        if [[ -d "$dir" && $(basename "$dir") == canvas-* ]]; then
            echo "Updating repository: $(basename "$dir")"
            cd "$dir"
            git fetch --all
            git pull
            if [ $? -ne 0 ]; then
                echo "Merge conflict in $(basename "$dir"). Stopping script."
                exit 1
            fi
        fi
    done
}

# Push current branch in all repositories
push_repos() {
    for dir in "$canvas_dir"/*/; do
        if [[ -d "$dir" && $(basename "$dir") == canvas-* ]]; then
            echo "Pushing current branch in repository: $(basename "$dir")"
            cd "$dir"
			if ! git status; then echo "Non-commited changes found in $dir"; fi;
            git push
        fi
    done
}

# Main script logic
case $1 in
    update)
        update_repos
        ;;
    push)
        push_repos
        ;;
    *)
        echo "Usage: $0 [update|push]"
        exit 1
        ;;
esac
