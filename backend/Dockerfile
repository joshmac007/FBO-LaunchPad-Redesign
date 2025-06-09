# Use Python 3.10 slim image as base
FROM python:3.10-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    FLASK_APP=src/app.py \
    PYTHONDONTWRITEBYTECODE=1

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY src/ src/
COPY migrations/ migrations/
COPY entrypoint.sh .

# Make entrypoint script executable
RUN chmod +x entrypoint.sh

# Expose the application port
EXPOSE 5000

# Set the entrypoint
ENTRYPOINT ["./entrypoint.sh"]

# Command to run the application with SocketIO support
CMD ["python", "-c", "from src.app import create_app; from src.extensions import socketio; app = create_app(); socketio.run(app, host='0.0.0.0', port=5000, debug=True)"] 