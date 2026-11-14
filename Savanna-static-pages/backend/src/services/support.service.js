/**
 * Voice4All — Human Support Service
 * 
 * Handles support request triage, context association, and consent management.
 * Explicitly identifies simulated workflows and enforces learner consent policies
 * for screen capture and diagnostic context sharing.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory repository for support requests in this session
const supportRequests = new Map();

/**
 * Helper to locate faqs.json safely across working directories
 */
export function getFaqsPath() {
  const directPath = path.resolve(__dirname, '../../data/faqs.json');
  if (fs.existsSync(directPath)) return directPath;
  const fallback = path.resolve(process.cwd(), 'backend/data/faqs.json');
  if (fs.existsSync(fallback)) return fallback;
  return path.resolve(process.cwd(), 'Savanna-static-pages/backend/data/faqs.json');
}

/**
 * Validates and normalizes consent information.
 * Enforces explicit learner consent for screen sharing.
 * 
 * @param {Object} consentInput
 * @param {boolean} [screenShareRequested=false]
 * @returns {{isValid: boolean, error?: string, consent: Object}}
 */
export function validateConsent(consentInput, screenShareRequested = false) {
  const consent = {
    screenShareRequested: Boolean(screenShareRequested || consentInput?.screenShareRequested),
    screenShareConsent: Boolean(consentInput?.screenShareConsent),
    contextSharingConsent: consentInput?.contextSharingConsent !== false, // default true for support
    diagnosticsConsent: Boolean(consentInput?.diagnosticsConsent),
    consentedAt: consentInput?.consentedAt || new Date().toISOString()
  };

  // Explicit consent verification:
  // If screen sharing was requested, learner MUST explicitly grant screenShareConsent.
  if (consent.screenShareRequested && !consent.screenShareConsent) {
    return {
      isValid: false,
      error: 'Screen sharing requires explicit learner consent. A local screen-capture preview is not a real human support connection.',
      consent
    };
  }

  return { isValid: true, consent };
}

/**
 * Creates a new support request.
 * 
 * @param {Object} payload
 * @param {string} payload.message - The learner's question or issue description
 * @param {string} [payload.language='en'] - Preferred language
 * @param {Object} [payload.context] - Course context { courseTitle, moduleTitle, lessonTitle, lessonText }
 * @param {Object} [payload.consent] - Consent information
 * @param {boolean} [payload.screenShareRequested=false] - Whether screen sharing was initiated
 * @returns {Object} Created support request ticket
 */
export function createSupportRequest(payload = {}) {
  const message = typeof payload.message === 'string' ? payload.message.trim() : '';

  if (!message) {
    const error = new Error('A support message is required.');
    error.statusCode = 400;
    error.field = 'message';
    throw error;
  }

  const screenShareRequested = Boolean(
    payload.screenShareRequested ||
    payload.screenSharing ||
    payload.consent?.screenShareRequested ||
    payload.consentInformation?.screenShareRequested
  );

  const rawConsent = payload.consent || payload.consentInformation || {};
  const consentValidation = validateConsent(rawConsent, screenShareRequested);

  if (!consentValidation.isValid) {
    const error = new Error(consentValidation.error);
    error.statusCode = 400;
    error.field = 'consent';
    throw error;
  }

  // Sanitize course context
  const rawContext = payload.context || {};
  const context = {
    courseTitle: typeof rawContext.courseTitle === 'string' ? rawContext.courseTitle.trim() : '',
    moduleTitle: typeof rawContext.moduleTitle === 'string' ? rawContext.moduleTitle.trim() : '',
    lessonTitle: typeof rawContext.lessonTitle === 'string' ? rawContext.lessonTitle.trim() : '',
    lessonText: typeof rawContext.lessonText === 'string' ? rawContext.lessonText.trim().substring(0, 1000) : ''
  };

  const language = typeof payload.language === 'string' && payload.language.trim() ? payload.language.trim() : 'en';

  const requestId = 'supp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const now = new Date().toISOString();

  const ticket = {
    requestId,
    status: 'queued',
    message,
    language,
    context,
    consent: consentValidation.consent,
    // Explicit simulation transparency:
    isSimulated: true,
    simulationNotice: 'SIMULATED HUMAN SUPPORT: This ticket has been placed into the Voice4All demonstration support queue. A local screen-capture preview does not establish a live human connection.',
    estimatedWaitMinutes: 4,
    queuePosition: supportRequests.size + 1,
    createdAt: now,
    updatedAt: now
  };

  supportRequests.set(requestId, ticket);

  return ticket;
}

/**
 * Retrieves a support request by ID.
 * @param {string} requestId
 * @returns {Object|null}
 */
export function getSupportRequest(requestId) {
  if (!requestId) return null;
  return supportRequests.get(requestId) || null;
}

/**
 * Lists all support requests in current session.
 * @returns {Array<Object>}
 */
export function listSupportRequests() {
  return Array.from(supportRequests.values());
}

/**
 * Loads FAQ items with optional search and category filters.
 * @param {Object} [query={}]
 * @returns {Array<Object>}
 */
export function getFaqs(query = {}) {
  try {
    const filePath = getFaqsPath();
    const data = fs.readFileSync(filePath, 'utf8');
    let faqs = JSON.parse(data);

    if (query.category) {
      const cat = query.category.toLowerCase();
      faqs = faqs.filter(f => f.category && f.category.toLowerCase().includes(cat));
    }

    if (query.search) {
      const term = query.search.toLowerCase();
      faqs = faqs.filter(f =>
        (f.question && f.question.toLowerCase().includes(term)) ||
        (f.answer && f.answer.toLowerCase().includes(term)) ||
        (f.tags && f.tags.some(t => t.toLowerCase().includes(term)))
      );
    }

    return faqs;
  } catch (err) {
    return [];
  }
}

export default {
  createSupportRequest,
  getSupportRequest,
  listSupportRequests,
  validateConsent,
  getFaqs,
  getFaqsPath
};
