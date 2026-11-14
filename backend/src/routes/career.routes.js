/**
 * Voice4All — Career Routes
 * 
 * Endpoints:
 * - GET  /api/career/jobs
 * - GET  /api/career/jobs/:id
 * - POST /api/career/accommodation-requests
 * - GET  /api/career/accommodation-requests/:id
 */

import { createRequire } from 'node:module';
import * as careerService from '../services/career.service.js';

const require = createRequire(import.meta.url);

// Graceful Express Router instantiation (works with Express, or standalone mock)
let createRouter;
try {
  const express = require('express');
  createRouter = () => express.Router();
} catch (err) {
  createRouter = () => {
    const handlers = [];
    const router = (req, res, next) => {
      const match = handlers.find(h => h.method === req.method && (h.path === req.url || h.paths?.includes(req.url)));
      if (match) return match.fn(req, res, next);
      if (typeof next === 'function') next();
    };
    router.get = (path, fn) => handlers.push({ method: 'GET', path: Array.isArray(path) ? path[0] : path, paths: Array.isArray(path) ? path : [path], fn });
    router.post = (path, fn) => handlers.push({ method: 'POST', path: Array.isArray(path) ? path[0] : path, paths: Array.isArray(path) ? path : [path], fn });
    router.use = (fn) => handlers.push({ method: 'ALL', path: '*', fn });
    router.stack = handlers;
    return router;
  };
}

export const router = createRouter();

/**
 * GET /jobs (and /career/jobs)
 * Retrieves sample accessible job opportunities.
 */
export function handleGetJobs(req, res) {
  try {
    const filters = req.query || {};
    const result = careerService.getJobs(filters);
    res.status(200).json({
      success: true,
      total: result.total,
      isSampleDataset: result.isSampleDataset,
      datasetNotice: result.datasetNotice,
      jobs: result.jobs
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sample jobs.'
    });
  }
}

/**
 * GET /jobs/:id (and /career/jobs/:id)
 * Retrieves a single sample job opportunity by ID.
 */
export function handleGetJobById(req, res) {
  const jobId = req.params?.id || (req.url && req.url.split('/').pop());
  const job = careerService.getJobById(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: `Sample job not found for ID: ${jobId}`
    });
  }

  res.status(200).json({
    success: true,
    job
  });
}

/**
 * POST /accommodation-requests (and /career/accommodation-requests)
 * Creates a workplace accommodation request draft.
 * Explicitly confirms the request has NOT been sent to the employer.
 */
export function handleCreateAccommodationRequest(req, res) {
  try {
    const payload = req.body || {};
    const draft = careerService.createAccommodationRequest(payload);

    res.status(201).json({
      success: true,
      draftId: draft.draftId,
      status: draft.status,
      isDelivered: draft.isDelivered,
      deliveryStatus: draft.deliveryStatus,
      deliveryNotice: draft.deliveryNotice,
      draft: {
        draftId: draft.draftId,
        job: draft.job,
        requestedAccommodations: draft.requestedAccommodations,
        justification: draft.justification,
        learnerIdentifier: draft.learnerIdentifier,
        createdAt: draft.createdAt
      }
    });
  } catch (err) {
    const status = err.statusCode || 400;
    res.status(status).json({
      success: false,
      error: err.message,
      field: err.field || null,
      isDelivered: false,
      deliveryNotice: 'DRAFT ONLY: Requests are not transmitted to employers in this simulation.'
    });
  }
}

/**
 * GET /accommodation-requests/:id (and /career/accommodation-requests/:id)
 * Retrieves a prepared accommodation request draft by ID.
 */
export function handleGetAccommodationDraft(req, res) {
  const draftId = req.params?.id || (req.url && req.url.split('/').pop());
  const draft = careerService.getAccommodationDraft(draftId);

  if (!draft) {
    return res.status(404).json({
      success: false,
      error: `Accommodation draft not found for ID: ${draftId}`
    });
  }

  res.status(200).json({
    success: true,
    draft
  });
}

// Support dual mounting styles: app.use('/api/career', router) OR app.use('/api', router)
router.get('/jobs', handleGetJobs);
router.get('/career/jobs', handleGetJobs);

router.get('/jobs/:id', handleGetJobById);
router.get('/career/jobs/:id', handleGetJobById);

router.post('/accommodation-requests', handleCreateAccommodationRequest);
router.post('/career/accommodation-requests', handleCreateAccommodationRequest);

router.get('/accommodation-requests/:id', handleGetAccommodationDraft);
router.get('/career/accommodation-requests/:id', handleGetAccommodationDraft);

// Attach handlers for unit testing
router.handleGetJobs = handleGetJobs;
router.handleGetJobById = handleGetJobById;
router.handleCreateAccommodationRequest = handleCreateAccommodationRequest;
router.handleGetAccommodationDraft = handleGetAccommodationDraft;

export default router;
