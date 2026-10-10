import { Router } from 'express';
import {
  createNewSale,
  getSale,
  listSales,
  previewSaleTotals,
  voidExistingSale,
} from '../controllers/saleController.js';
import validateObjectId from '../middleware/validateObjectId.js';

const router = Router();

router.post('/preview', previewSaleTotals);

router.get('/', listSales);
router.post('/', createNewSale);
router.get('/:id', validateObjectId, getSale);
router.patch('/:id/void', validateObjectId, voidExistingSale);

export default router;
