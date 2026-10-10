import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

try {
  await connectDB(process.env.MONGO_URI);
  app.listen(PORT, () => {
    console.log(`FeedWise API running at http://localhost:${PORT}/api`);
  });
} catch (error) {
  console.error('Failed to start server:', error.message);
  process.exit(1);
}
