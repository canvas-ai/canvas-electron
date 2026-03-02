#!/usr/bin/env bash
set -euo pipefail

ref="${1:-main}"
workflow_file="${WORKFLOW_FILE:-release.yml}"
token="${GITHUB_TOKEN:-${GH_TOKEN:-}}"

if [[ -z "${token}" ]]; then
  echo "Missing token. Set GITHUB_TOKEN (or GH_TOKEN) with repo+workflow permissions." >&2
  exit 1
fi

origin_url="$(git config --get remote.origin.url || true)"
if [[ -z "${origin_url}" ]]; then
  echo "No git remote 'origin' found." >&2
  exit 1
fi

repo_path="${origin_url}"
repo_path="${repo_path#git@github.com:}"
repo_path="${repo_path#https://github.com/}"
repo_path="${repo_path#http://github.com/}"
repo_path="${repo_path%.git}"

if [[ "${repo_path}" != */* ]]; then
  echo "Couldn't parse owner/repo from origin: ${origin_url}" >&2
  exit 1
fi

api="https://api.github.com/repos/${repo_path}/actions/workflows/${workflow_file}/dispatches"

status="$(
  curl -sS -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer ${token}" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    --data "{\"ref\":\"${ref}\"}" \
    "${api}"
)"

if [[ "${status}" != "204" ]]; then
  echo "Dispatch failed (HTTP ${status}). Endpoint: ${api}" >&2
  exit 1
fi

echo "Triggered workflow '${workflow_file}' on ref '${ref}' for ${repo_path}."
