# Deployment Guide - Kanan Agent Visit Survey System

This project is containerized using Docker and orchestrated with Docker Compose for easy deployment.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Quick Start (Local/VPS)

1.  **Clone the repository** (if not already done):
    ```bash
    git clone <your-repo-url>
    cd Agent_VS
    ```

2.  **Configure Environment Variables**:
    Copy the example environment file and fill in your actual values.
    ```bash
    cp .env.example .env
    ```
    *Note: Ensure `GROQ_API_KEY` and `SECRET_KEY` are set.*

3.  **Build and Start the Containers**:
    ```bash
    docker-compose up -d --build
    ```

4.  **Access the Application**:
    - **Frontend**: [http://localhost](http://localhost) (or your server IP)
    - **Backend API**: [http://localhost:8000/api](http://localhost:8000/api)
    - **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

## Key Configuration

### Frontend API URL
The React frontend is built using Vite. The API URL is embedded at **build time**.
- If you change `VITE_API_URL` in `.env`, you **must** rebuild the frontend container:
  ```bash
  docker-compose build frontend
  docker-compose up -d frontend
  ```

### Database Persistence
PostgreSQL data is stored in a Docker volume named `postgres_data`. This ensures data persists even if the container is removed.

### File Uploads
Images and documents uploaded via the surveys are stored in `backend/app/uploads`. This directory is mounted as a volume in the backend container for persistence.

## Production Best Practices

1.  **Change Default Passwords**: Ensure `POSTGRES_PASSWORD` is changed in `.env`.
2.  **SSL/HTTPS**: It is highly recommended to use a reverse proxy (like Nginx Proxy Manager, Traefik, or Caddy) or Cloudflare to handle SSL.
3.  **CORS**: In `backend/app/main.py`, update `allow_origins=["*"]` to your actual domain.

## Troubleshooting

- **Check logs**:
  ```bash
  docker-compose logs -f
  ```
- **Restart services**:
  ```bash
  docker-compose restart
  ```
- **Database issues**:
  Ensure the `db` container is healthy before the `backend` starts. Docker Compose is configured to wait for the health check.
