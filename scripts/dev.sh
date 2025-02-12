#!/bin/bash

# Define an array of commands to run.
COMMANDS=(
  "turbo run build --filter=!./packages/docs && turbo run dev --filter=./packages/core"
  "turbo run dev --filter=./packages/plugin-sqlite"
  "turbo run dev \
     --filter=!./packages/agent \
     --filter=!./packages/cli \
     --filter=!./packages/docs \
     --filter=!./packages/core \
     --filter=!./packages/plugin-sqlite \
     --concurrency=20"
  "turbo run dev --filter=./packages/agent --filter=./packages/cli"
)

# Loop over each command and run it in the background
for cmd in "${COMMANDS[@]}"; do
  eval "$cmd" &

  sleep 3  # Delay before starting the next command
done

# Wait for all background jobs to keep the script running
wait
