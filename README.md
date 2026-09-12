# Family Library & Heritage Website

A calm, personal, and secure MERN stack web archive for preserving a family's identity, values, tree lineage, and cataloged books. The interface features a stunning, premium **minimalist glassmorphism** design supporting both dark and light modes.

---

## 1. Prerequisites

To run this application locally, you must have the following installed on your machine:
- **Docker** and **Docker Compose**
- *(Optional for local development outside Docker)*: Node.js (v18+) and MongoDB (v6.0+)

---

## 2. Directory Layout & Volumes

The application stores assets inside the `server/uploads` directory. When running under Docker:
- Database records are stored in the named volume `mongo_data` (mapped to `/data/db`).
- Uploaded assets (book PDFs, cover thumbnails, hero banner background, and portraits) are stored in the named volume `server_uploads` (mapped to `/app/uploads`).

---

## 3. Environment Configurations

Both client and server expect environment files inside the `env/` folder. Examples are committed to Git:
- **Server Configuration Template**: `env/backend.env.example` -> Copy to `env/backend.env`
- **Client Configuration Template**: `env/frontend.env.example` -> Copy to `env/frontend.env`

Make sure to populate `env/backend.env` with your secure session keys and administrator passwords before launching containers.

---

## 4. Run Commands (Docker Compose)

### A. Development Mode (With Source Mounting & Hot-Reload)
This mounts the local `client/` and `server/` code inside the containers and starts hot-reload listeners (Vite for client, Nodemon for server).
```bash
# Build and launch development containers
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```
- **Public Website & CMS Access**: `http://localhost:5173`
- **Express API Endpoint**: `http://localhost:5000`
- **Local MongoDB Access**: `mongodb://localhost:27017`

### B. Production Mode (Optimized Bundles & Static Serving)
Builds a production multi-stage client bundle using Nginx and runs the server as a production service.
```bash
# Build and launch production containers in detached mode
docker compose up -d --build
```
- **Public Website & CMS Access**: `http://localhost:80`

### C. Logging
To view application logs for debugging and system status:
```bash
docker compose logs -f
```

---

## 5. Seed Initial Administrator & Default Content

Once the containers are up and running, you must run the database seed command to register the initial administrator and set up default layout fields (Hero values, Qualities, and About Us defaults). This command is fully idempotent.
```bash
# Run database seeder inside the running server container
docker compose exec server npm run seed
```
- **Seed Administrator Email**: `admin@family.local` (or whatever is defined in `env/backend.env` as `INITIAL_ADMIN_EMAIL`)
- **Seed Administrator Password**: `adminpassword123` (or whatever is defined in `env/backend.env` as `INITIAL_ADMIN_PASSWORD`)

> [!CAUTION]
> **Database Reset Warning**
> Running the seed command only registers initial content if it does not already exist. It will **never** overwrite customizations made by administrators inside the CMS panel. If you need to perform a full system wipe, see the shutdown options below.

---

## 6. Graceful Shutdown & Wipes

### Ordinary Shutdown (Preserves Uploads and Database)
To stop the services and containers while keeping your scanned family books, images, and tree history safe on your disk:
```bash
docker compose down
```

### Destructive Shutdown (Deletes ALL Uploads and Database Records)
To perform a complete clean slate system wipe, deleting all books, PDF documents, portraits, and database collections:
```bash
# WARNING: This deletes the mongo_data and server_uploads named volumes!
docker compose down -v
```

---

## 7. Backups and Recovery Procedures

> [!IMPORTANT]
> **Scanned Documents & Assets Warning**
> Backing up the MongoDB database alone is **insufficient**! The website stores physical PDF documents and member portraits inside the `server_uploads` volume. An effective backup must archive both the database records and the uploaded files.

### A. Backup Database (MongoDB Dump)
```bash
# Export the collections into a backup folder inside the mongo container
docker compose exec mongo mongodump --db family_library --out /data/db/backup_dump

# Copy the exported dump folder from the container to your host machine
docker cp family_mongo:/data/db/backup_dump ./backup_dump
```

### B. Backup Uploaded Files
Locate your Docker volume mounting directories or archive the uploads directory directly.
Under standard configurations, you can copy the files from the running server container:
```bash
# Copy uploads volume folder to your host machine
docker cp family_server:/app/uploads ./backup_uploads
```

### C. Restore System
1. Copy backup data folders back into the respective container mounts.
2. Run database import:
   ```bash
   docker compose exec mongo mongorestore --db family_library /data/db/backup_dump/family_library
   ```
