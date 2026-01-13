FROM python:3.13-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set the working directory in the container
WORKDIR /app

# Install system dependencies
RUN apt-get update && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . /app/

# Copy Firebase service account file
COPY firebase-credentials.json /app/firebase-credentials.json

# Expose the port the app runs on
EXPOSE 8000

# Copy entrypoint script
COPY entrypoint.sh /app/

# Make scripts executable
RUN chmod +x /app/entrypoint.sh

# Run entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]

# Default command (server run)
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

