import { Router } from 'express';
import {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  updateCategory,
} from '../controllers/categoryController.js';
import validateObjectId from '../middleware/validateObjectId.js';

const router = Router();

router.get('/', listCategories);
router.post('/', createCategory);
router.get('/:id', validateObjectId, getCategory);
router.put('/:id', validateObjectId, updateCategory);
router.delete('/:id', validateObjectId, deleteCategory);

export default router;
