/**
 * Voice4All — Support Routes
 * 
 * Endpoints:
 * - POST /api/support/requests
 * - GET  /api/support/requests/:id
 * - GET  /api/support/faqs
 */

import { createRequire } from 'node:module';
import * as supportService from '../services/support.service.js';

const require = createRequire(import.meta.url);

// Graceful Express Router instantiation (works with Express, or standalone mock)
let createRouter;
try {
  const express = require('express');
  createRouter = () => express.Router();
} catch (err) {
  // Standalone router mock for testing when express node_modules are not yet installed
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
 * POST /requests (also matches /support/requests)
 * Initiates a support request with message, language, context, and consent verification.
 */
export function handleCreateSupportRequest(req, res) {
  try {
    const payload = req.body || {};
    const ticket = supportService.createSupportRequest(payload);

    res.status(201).json({
      success: true,
      requestId: ticket.requestId,
      status: ticket.status,
      isSimulated: ticket.isSimulated,
      simulationNotice: ticket.simulationNotice,
      estimatedWaitMinutes: ticket.estimatedWaitMinutes,
      queuePosition: ticket.queuePosition,
      ticket: {
        requestId: ticket.requestId,
        status: ticket.status,
        language: ticket.language,
        context: ticket.context,
        consent: ticket.consent,
        createdAt: ticket.createdAt
      }
    });
  } catch (err) {
    const status = err.statusCode || 400;
    res.status(status).json({
      success: false,
      error: err.message,
      field: err.field || null,
      isSimulated: true,
      simulationNotice: 'A local screen-capture preview is not a real human support connection.'
    });
  }
}

/**
 * GET /requests/:id
 * Fetches status of an existing support request.
 */
export function handleGetSupportRequest(req, res) {
  const requestId = req.params?.id || req.params?.requestId || (req.url && req.url.split('/').pop());
  const ticket = supportService.getSupportRequest(requestId);

  if (!ticket) {
    return res.status(404).json({
      success: false,
      error: `Support request not found for ID: ${requestId}`
    });
  }

  res.status(200).json({
    success: true,
    ticket
  });
}

/**
 * GET /faqs
 * Retrieves support FAQs with optional category / search filters.
 */
export function handleGetFaqs(req, res) {
  const query = req.query || {};
  const faqs = supportService.getFaqs(query);
  res.status(200).json({
    success: true,
    total: faqs.length,
    faqs
  });
}

// Support dual mounting styles: app.use('/api/support', router) OR app.use('/api', router)
router.post('/requests', handleCreateSupportRequest);
router.post('/support/requests', handleCreateSupportRequest);

router.get('/requests/:id', handleGetSupportRequest);
router.get('/support/requests/:id', handleGetSupportRequest);

router.get('/faqs', handleGetFaqs);
router.get('/support/faqs', handleGetFaqs);

// Attach handlers for unit testing
router.handleCreateSupportRequest = handleCreateSupportRequest;
router.handleGetSupportRequest = handleGetSupportRequest;
router.handleGetFaqs = handleGetFaqs;

export default router;
