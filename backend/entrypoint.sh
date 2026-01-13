#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e


# Run database migrations
python manage.py makemigrations --merge
python manage.py makemigrations --noinput
python manage.py migrate --noinput

# Start the server
# python manage.py populate_efs_questions
# python manage.py populate_cfs_questions

# Start the background scheduler in the background
python manage.py start_scheduler &

exec "$@"
