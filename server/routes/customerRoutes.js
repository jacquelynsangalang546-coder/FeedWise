import { Router } from 'express';
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
} from '../controllers/customerController.js';
import validateObjectId from '../middleware/validateObjectId.js';

const router = Router();

router.get('/', listCustomers);
router.post('/', createCustomer);
router.get('/:id', validateObjectId, getCustomer);
router.put('/:id', validateObjectId, updateCustomer);
router.delete('/:id', validateObjectId, deleteCustomer);

export default router;
