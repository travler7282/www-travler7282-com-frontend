FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Since the robotic arm is controlled via bluetooth low energy (BLE)
# We need to configure the container to be able to use the bluetooth
# device while maintaining the least amount of privileges

# Install bluez and dbus libraries needed for BLE communication
RUN apt-get update && apt-get install -y --no-install-recommends \
    bluez \
    libdbus-1-3 \
    libgl1 \
    libglib2.0-0 \
    libv4l-0 \
    && rm -rf /var/lib/apt/lists/*

# Create a dedicated non-root user and group
RUN groupadd --system appgroup && useradd --system --create-home --gid appgroup --uid 1000 appuser

# Switch to the working directory
WORKDIR /app

# Copy the requirements.txt file over and install the Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --disable-pip-version-check -r requirements.txt

# Copy the backend code
COPY --chown=appuser:appgroup . .

# Switch to the non-root user
USER appuser

# Expose the internal container port used by uvicorn
EXPOSE 8000

# Start the FastAPI service
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
