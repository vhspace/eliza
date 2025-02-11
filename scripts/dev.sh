
# An array of commands to run.
COMMANDS=(
  "turbo run dev --filter=./packages/core"
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

# Loop over each command
for i in "${!COMMANDS[@]}"; do
  ${COMMANDS[$i]} &

  sleep 3  # 3-second delay before starting each dev command
done

# Wait for all background jobs (dev servers) to keep the script alive
wait
