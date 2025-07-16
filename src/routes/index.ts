import { Router } from 'express';
import akinatorController from '../controller/akinatorController';
import {
  validateAnswerAkinator,
  validateCancelAnswerAkinator,
  validateStartAkinator,
} from '../middleware/validation';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

router.get('/start', validateStartAkinator, akinatorController.start);
router.get('/answer', validateAnswerAkinator, akinatorController.answer);
router.get(
  '/cancel-answer',
  validateCancelAnswerAkinator,
  akinatorController.cancelAnswer
);

export default router;
