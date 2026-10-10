import mongoose from 'mongoose';

// Rejects malformed :id parameters with a clean 400 before they reach Mongoose.
export default function validateObjectId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: `Invalid ID format: "${req.params.id}"` });
  }
  next();
}
