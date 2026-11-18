#!/bin/sh
# Generates the config.json the bot expects at startup from environment
# variables, so secrets never need to live in the image or a committed file.
set -e

cat > /app/config.json <<EOF
{
  "token": "${DISCORD_TOKEN}",
  "OPENAI_API_KEY": "${OPENAI_API_KEY}"
}
EOF

exec "$@"
