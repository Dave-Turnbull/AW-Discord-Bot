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

# scoreData.json persists in the /app/data volume; seed it from the baked
# copy on first run and point the app's path at it.
if [ ! -f /app/data/scoreData.json ]; then
  cp /app/scoreData.json.default /app/data/scoreData.json 2>/dev/null || echo '{}' > /app/data/scoreData.json
fi
ln -sf /app/data/scoreData.json /app/scoreData.json

exec "$@"
