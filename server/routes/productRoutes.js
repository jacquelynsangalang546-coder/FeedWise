import { Router } from 'express';
import {
  adjustProductStock,
  checkProductAvailability,
  createProduct,
  deleteProduct,
  getProduct,
  listLowStock,
  listProducts,
  updateProduct,
} from '../controllers/productController.js';
import validateObjectId from '../middleware/validateObjectId.js';

const router = Router();

// Fixed paths are registered BEFORE "/:id" so "low-stock" is not treated as an ID
router.get('/low-stock', listLowStock);
router.post('/check-availability', checkProductAvailability);

router.get('/', listProducts);
router.post('/', createProduct);
router.get('/:id', validateObjectId, getProduct);
router.put('/:id', validateObjectId, updateProduct);
router.patch('/:id/stock', validateObjectId, adjustProductStock);
router.delete('/:id', validateObjectId, deleteProduct);

export default router;
