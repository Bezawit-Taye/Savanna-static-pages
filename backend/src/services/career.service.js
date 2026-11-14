/**
 * Voice4All — Career Service
 * 
 * Provides access to sample inclusive job opportunities and allows learners
 * to prepare, refine, and store workplace accommodation request drafts.
 * 
 * IMPORTANT: Accommodation requests are strictly saved as DRAFTS.
 * They are NEVER transmitted to external employers.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory store for accommodation request drafts in this session
const accommodationDrafts = new Map();

/**
 * Safely resolves the path to jobs.json
 */
export function getJobsPath() {
  const directPath = path.resolve(__dirname, '../../data/jobs.json');
  if (fs.existsSync(directPath)) return directPath;
  const fallback = path.resolve(process.cwd(), 'backend/data/jobs.json');
  if (fs.existsSync(fallback)) return fallback;
  return path.resolve(process.cwd(), 'Savanna-static-pages/backend/data/jobs.json');
}

/**
 * Retrieves all sample jobs with optional query filtering.
 * 
 * @param {Object} [filters={}]
 * @returns {{jobs: Array<Object>, total: number, isSampleDataset: boolean, datasetNotice: string}}
 */
export function getJobs(filters = {}) {
  try {
    const filePath = getJobsPath();
    const data = fs.readFileSync(filePath, 'utf8');
    let jobs = JSON.parse(data);

    if (filters.search) {
      const term = filters.search.toLowerCase();
      jobs = jobs.filter(j =>
        (j.title && j.title.toLowerCase().includes(term)) ||
        (j.description && j.description.toLowerCase().includes(term)) ||
        (j.organization && j.organization.toLowerCase().includes(term)) ||
        (j.accessibilityOrAccommodation && j.accessibilityOrAccommodation.toLowerCase().includes(term))
      );
    }

    if (filters.location) {
      const loc = filters.location.toLowerCase();
      jobs = jobs.filter(j => j.location && j.location.toLowerCase().includes(loc));
    }

    return {
      total: jobs.length,
      isSampleDataset: true,
      datasetNotice: 'SIMULATED SAMPLE OPPORTUNITIES — For accessibility demonstration and accommodation drafting practice only. Not active employer vacancies.',
      jobs
    };
  } catch (err) {
    return {
      total: 0,
      isSampleDataset: true,
      datasetNotice: 'SIMULATED SAMPLE OPPORTUNITIES — Could not load sample jobs dataset.',
      jobs: []
    };
  }
}

/**
 * Retrieves a single sample job by ID.
 * @param {string} jobId
 * @returns {Object|null}
 */
export function getJobById(jobId) {
  if (!jobId) return null;
  const { jobs } = getJobs();
  return jobs.find(j => j.id === jobId) || null;
}

/**
 * Prepares an accommodation request draft.
 * Explicitly marks draft status and guarantees it has NOT been sent to any employer.
 * 
 * @param {Object} payload
 * @param {string} payload.jobId - Target job ID from sample dataset
 * @param {string[]|string} payload.accommodations - Requested accommodations (or requestedAccommodations)
 * @param {string} [payload.justification] - Reason or context for requested accommodations
 * @param {string} [payload.learnerIdentifier] - Safe, non-PII learner identifier (e.g. "Learner-Amara")
 * @returns {Object} Draft accommodation request record
 */
export function createAccommodationRequest(payload = {}) {
  const jobId = typeof payload.jobId === 'string' ? payload.jobId.trim() : '';

  if (!jobId) {
    const error = new Error('A valid jobId is required to draft an accommodation request.');
    error.statusCode = 400;
    error.field = 'jobId';
    throw error;
  }

  // Validate that the job exists in the sample dataset
  const job = getJobById(jobId);
  if (!job) {
    const error = new Error(`Sample job not found for ID: ${jobId}`);
    error.statusCode = 404;
    error.field = 'jobId';
    throw error;
  }

  // Normalize requested accommodations
  const rawAccommodations = payload.accommodations || payload.requestedAccommodations;
  let accommodationsList = [];
  if (Array.isArray(rawAccommodations)) {
    accommodationsList = rawAccommodations.map(a => String(a).trim()).filter(Boolean);
  } else if (typeof rawAccommodations === 'string' && rawAccommodations.trim()) {
    accommodationsList = [rawAccommodations.trim()];
  }

  if (accommodationsList.length === 0) {
    const error = new Error('At least one accommodation must be specified in the request draft.');
    error.statusCode = 400;
    error.field = 'accommodations';
    throw error;
  }

  const justification = typeof payload.justification === 'string' ? payload.justification.trim() : '';
  const learnerIdentifier = typeof payload.learnerIdentifier === 'string' && payload.learnerIdentifier.trim()
    ? payload.learnerIdentifier.trim()
    : 'Simulated Learner Draft';

  const draftId = 'draft_acc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const now = new Date().toISOString();

  const draftRecord = {
    draftId,
    status: 'draft',
    // Explicit delivery transparency:
    isDelivered: false,
    deliveryStatus: 'NOT_SENT_DRAFT_ONLY',
    deliveryNotice: 'DRAFT ONLY: This accommodation request is saved locally as a self-advocacy draft. It has NOT been sent to the employer or any external party.',
    job: {
      id: job.id,
      title: job.title,
      organization: job.organization,
      location: job.location,
      isSample: job.isSample
    },
    learnerIdentifier,
    requestedAccommodations: accommodationsList,
    justification,
    createdAt: now,
    updatedAt: now
  };

  accommodationDrafts.set(draftId, draftRecord);

  return draftRecord;
}

/**
 * Retrieves a previously prepared accommodation draft by ID.
 * @param {string} draftId
 * @returns {Object|null}
 */
export function getAccommodationDraft(draftId) {
  if (!draftId) return null;
  return accommodationDrafts.get(draftId) || null;
}

/**
 * Lists all accommodation drafts created in this session.
 * @returns {Array<Object>}
 */
export function listAccommodationDrafts() {
  return Array.from(accommodationDrafts.values());
}

export default {
  getJobs,
  getJobById,
  createAccommodationRequest,
  getAccommodationDraft,
  listAccommodationDrafts,
  getJobsPath
};
