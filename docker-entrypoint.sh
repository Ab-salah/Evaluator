#!/bin/sh
set -e
# Apply any pending database migrations, then start the app.
echo "Applying database migrations…"
prisma migrate deploy --schema=./prisma/schema.prisma
exec "$@"
