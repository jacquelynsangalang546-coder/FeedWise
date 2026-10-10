import { Router } from 'express';
import {
  createSupplier,
  deleteSupplier,
  getSupplier,
  listSuppliers,
  updateSupplier,
} from '../controllers/supplierController.js';
import validateObjectId from '../middleware/validateObjectId.js';

const router = Router();

router.get('/', listSuppliers);
router.post('/', createSupplier);
router.get('/:id', validateObjectId, getSupplier);
router.put('/:id', validateObjectId, updateSupplier);
router.delete('/:id', validateObjectId, deleteSupplier);

export default router;
