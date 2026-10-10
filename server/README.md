# FeedWise – Server (REST API)

Express 5 + Mongoose REST API for FeedWise. See the main [README](../README.md) for the full API documentation table and [SETUP_GUIDE](../SETUP_GUIDE.md) for Windows setup.

```bash
cp .env.example .env     # set MONGO_URI (MongoDB Atlas), PORT, CLIENT_URL
npm install
npm run seed             # sample data (deletes existing FeedWise data)
npm run dev              # http://localhost:5000/api
npm run test:api         # 85 endpoint / business-rule checks (server must be running)
```

Folders: `routes/` (express.Router per resource), `controllers/`, `services/` (business logic), `models/` (Mongoose schemas), `middleware/` (logger, ObjectId check, 404, error handler), `utils/`, `seed/`, `scripts/`.

Middleware order in `app.js`: `cors` → `express.json` → **request logger** → routes → **JSON 404 catch-all** → **error handler** (last).
