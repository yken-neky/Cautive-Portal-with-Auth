#!/bin/sh
set -e
host="$1"
shift
until mysql -h "$host" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "SELECT 1" "$MYSQL_DATABASE"; do
  echo "MySQL is unavailable - sleeping"
  sleep 2
done
exec "$@"
