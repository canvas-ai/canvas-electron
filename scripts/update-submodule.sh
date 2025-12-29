#!/bin/bash
# Strict mode: exit immediately if a command exits with a non-zero status.
set -e

# Check if submodule path is provided
if [ -z "$1" ]; then
  echo "Error: Submodule path not provided."
  echo "Usage: $0 <path_to_submodule>"
  exit 1
fi

SUBMODULE_PATH="$1"
SUBMODULE_NAME=$(basename "$SUBMODULE_PATH")
PARENT_REPO_ROOT=$(git rev-parse --show-toplevel)

echo "--- Processing Submodule: $SUBMODULE_NAME at $SUBMODULE_PATH ---"

# Store current directory to return later
ORIGINAL_DIR=$(pwd)

# Navigate to submodule directory
if ! cd "$SUBMODULE_PATH"; then
  echo "Error: Could not navigate to submodule directory: $SUBMODULE_PATH"
  exit 1
fi

echo "Current directory: $(pwd)"

# Submodule: Stage changes
echo "Staging changes in submodule $SUBMODULE_NAME..."
git add .

# Submodule: Commit changes
COMMIT_MSG_SUBMODULE="Update submodule $SUBMODULE_NAME"
echo "Committing changes in submodule $SUBMODULE_NAME with message: '$COMMIT_MSG_SUBMODULE'..."
# Use --allow-empty in case there are no changes to commit but we still want to ensure HEAD is what we want
# Or better, check if there are changes to commit first
if ! git diff-index --quiet HEAD --; then
  git commit -m "$COMMIT_MSG_SUBMODULE"
else
  echo "No changes to commit in submodule $SUBMODULE_NAME."
fi

# Submodule: Push changes
# Assuming remote is 'origin' and target branch for submodule's HEAD is 'main'.
# This might need to be parameterized in a more advanced script.
SUBMODULE_REMOTE_BRANCH="main"
echo "Pushing submodule $SUBMODULE_NAME changes to origin HEAD:$SUBMODULE_REMOTE_BRANCH..."
git push origin HEAD:"$SUBMODULE_REMOTE_BRANCH"

echo "--- Processing Parent Repository for Submodule: $SUBMODULE_NAME ---"

# Navigate back to parent repository root
if ! cd "$PARENT_REPO_ROOT"; then
  echo "Error: Could not navigate back to parent repository root: $PARENT_REPO_ROOT"
  exit 1
fi
echo "Current directory: $(pwd)"


# Parent Repo: Stage submodule reference update
echo "Staging updated submodule reference for $SUBMODULE_NAME..."
git add "$SUBMODULE_PATH"

# Parent Repo: Commit submodule reference update
COMMIT_MSG_PARENT="Updated $SUBMODULE_NAME submodule reference"
echo "Committing submodule reference update in parent repo with message: '$COMMIT_MSG_PARENT'..."
# Check if submodule reference actually changed
if ! git diff-index --quiet --cached HEAD -- "$SUBMODULE_PATH"; then
  git commit -m "$COMMIT_MSG_PARENT"
else
  echo "No changes to submodule $SUBMODULE_NAME reference to commit in parent repository."
fi

# Parent Repo: Push changes
# This will push the current branch of the parent repository
echo "Pushing parent repository changes..."
git push

echo "--- Submodule update process completed successfully for $SUBMODULE_NAME ---"
