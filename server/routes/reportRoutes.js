import { Router } from 'express';
import { categorySales, dashboard, inventory, salesSummary, topProducts } from '../controllers/reportController.js';

const router = Router();

router.get('/dashboard', dashboard);
router.get('/sales-summary', salesSummary);
router.get('/top-products', topProducts);
router.get('/category-sales', categorySales);
router.get('/inventory', inventory);

export default router;
