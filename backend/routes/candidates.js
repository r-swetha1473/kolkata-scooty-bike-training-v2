const express = require('express');
const db = require('../db');
const { adminAccess } = require('../middleware/adminAccess');
const { candidatesGate } = require('../services/candidateAccess');
const { createCandidateService } = require('../services/candidate.service');

const router = express.Router();
const candidates = createCandidateService(db);

router.use(candidatesGate);

function sendResult(res, error, next) {
  if (error?.errorCode === 'DUPLICATE_MOBILE') {
    return res.status(409).json({
      success: false,
      message: error.message,
      errorCode: 'DUPLICATE_MOBILE',
      code: 'DUPLICATE_MOBILE',
      candidate: error.candidate || null
    });
  }
  return next(error);
}

router.get('/export', ...adminAccess('candidates', 'view'), async (req, res, next) => {
  try {
    const csv = await candidates.exportCsv(req.query, req.user);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="candidates.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

router.get('/', ...adminAccess('candidates', 'view'), async (req, res, next) => {
  try {
    res.json(await candidates.list(req.query, req.user));
  } catch (error) {
    next(error);
  }
});

router.post('/', ...adminAccess('candidates', 'create'), async (req, res, next) => {
  try {
    const created = await candidates.admit(req.body || {}, req.user);
    res.status(201).json(created);
  } catch (error) {
    sendResult(res, error, next);
  }
});

router.get('/:id/bill', ...adminAccess('candidates', 'view'), async (req, res, next) => {
  try {
    res.json(await candidates.bill(req.params.id, req.user));
  } catch (error) {
    next(error);
  }
});

router.get('/:id', ...adminAccess('candidates', 'view'), async (req, res, next) => {
  try {
    res.json(await candidates.portfolio(req.params.id, req.user));
  } catch (error) {
    next(error);
  }
});

router.put('/:id', ...adminAccess('candidates', 'edit'), async (req, res, next) => {
  try {
    res.json(await candidates.updateCandidate(req.params.id, req.body || {}, req.user));
  } catch (error) {
    sendResult(res, error, next);
  }
});

router.post('/:id/payments', ...adminAccess('candidates_payments', 'create'), async (req, res, next) => {
  try {
    const key = req.get('Idempotency-Key') || null;
    const saved = await candidates.addPayment(req.params.id, req.body || {}, req.user, key);
    res.status(saved.idempotent ? 200 : 201).json(saved);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/payments/:paymentId/void', ...adminAccess('candidates_payments', 'delete'), async (req, res, next) => {
  try {
    res.json(await candidates.voidPayment(req.params.id, req.params.paymentId, req.body || {}, req.user));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/classes', ...adminAccess('candidates', 'edit'), async (req, res, next) => {
  try {
    res.status(201).json(await candidates.addClass(req.params.id, req.body || {}, req.user));
  } catch (error) {
    next(error);
  }
});

router.put('/:id/classes/:classId', ...adminAccess('candidates', 'edit'), async (req, res, next) => {
  try {
    res.json(await candidates.updateClass(req.params.id, req.params.classId, req.body || {}, req.user));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
