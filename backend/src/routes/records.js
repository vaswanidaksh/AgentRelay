import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireTeamMember } from '../middleware/rbac.js';
import { validateContextRecord } from '../core/schema.js';
import { scrubObject, SCRUBBER_VERSION } from '../core/scrubber.js';
import {
  upsertPromotedRecord,
  pullRecords,
  getRecord,
  withdrawRecord
} from '../db/queries/records.js';
import { logAuditEvent } from '../db/queries/audit.js';
import { ValidationError, ForbiddenError, NotFoundError } from '../core/errors.js';

const router = express.Router();

/**
 * Promotes a context record to a team (PRD FR-019).
 * Re-scrubs deterministically on the server and enforces provenance/evidence validity.
 */
router.put(
  '/teams/:id/records/:recordId/versions/:v',
  requireAuth,
  requireTeamMember,
  (req, res, next) => {
    try {
      const { id: teamId, recordId, v } = req.params;
      const version = parseInt(v, 10);

      if (isNaN(version) || version < 1) {
        throw new ValidationError('Version parameter must be a positive integer.');
      }

      const rawRecord = req.body;
      validateContextRecord(rawRecord);

      if (rawRecord.recordId !== recordId) {
        throw new ValidationError(`Route recordId (${recordId}) does not match payload recordId (${rawRecord.recordId}).`);
      }

      if (rawRecord.version !== version) {
        throw new ValidationError(`Route version (${version}) does not match payload version (${rawRecord.version}).`);
      }

      if (!rawRecord.visibility?.shareable) {
        throw new ForbiddenError('Only records marked as shareable can be promoted to a team.');
      }

      if (rawRecord.feedback?.status === 'rejected') {
        throw new ForbiddenError('Rejected records cannot be promoted.');
      }

      // Server-side deterministic re-scrubbing (defense-in-depth)
      const { data: scrubbedRecord, redactionCounts } = scrubObject(rawRecord);

      // Merge server redactions into sensitivity metadata
      const totalRedactions = {
        ...(scrubbedRecord.sensitivity?.redactionCounts || {}),
      };
      for (const [k, count] of Object.entries(redactionCounts)) {
        totalRedactions[k] = (totalRedactions[k] || 0) + count;
      }

      scrubbedRecord.sensitivity = {
        ...scrubbedRecord.sensitivity,
        serverScrubberVersion: SCRUBBER_VERSION,
        redactionCounts: totalRedactions,
      };

      // Ensure teamId is set in ACL and visibility
      scrubbedRecord.visibility.teamId = teamId;
      scrubbedRecord.visibility.promotedAt = new Date().toISOString();
      scrubbedRecord.acl.teamId = teamId;

      const stored = upsertPromotedRecord({
        recordId,
        version,
        teamId,
        authorId: req.user.id,
        projectTag: scrubbedRecord.acl?.projectTag || scrubbedRecord.source?.projectTag || 'default',
        schemaVersion: scrubbedRecord.schemaVersion,
        json: scrubbedRecord,
        sensitivity: scrubbedRecord.sensitivity.label,
      });

      logAuditEvent({
        actorId: req.user.id,
        action: 'record_promoted',
        teamId,
        recordId,
        metadata: {
          version,
          serverRedactions: redactionCounts,
          seq: stored.seq
        }
      });

      res.status(200).json({
        message: 'Record successfully promoted.',
        seq: stored.seq,
        record: scrubbedRecord
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Incremental pull for team records after a given sequence cursor (PRD FR-020).
 */
router.get(
  '/teams/:id/records',
  requireAuth,
  requireTeamMember,
  (req, res, next) => {
    try {
      const since = parseInt(req.query.since || '0', 10);
      const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);

      const items = pullRecords({
        teamId: req.teamId,
        since: isNaN(since) ? 0 : since,
        limit
      });

      const nextCursor = items.length > 0 ? items[items.length - 1].seq : since;
      const hasMore = items.length === limit;

      logAuditEvent({
        actorId: req.user.id,
        action: 'records_pulled',
        teamId: req.teamId,
        metadata: { since, count: items.length, nextCursor }
      });

      res.json({
        records: items,
        cursor: nextCursor,
        hasMore
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Fetches a single record by recordId.
 */
router.get(
  '/teams/:id/records/:recordId',
  requireAuth,
  requireTeamMember,
  (req, res, next) => {
    try {
      const record = getRecord(req.teamId, req.params.recordId);
      if (!record) {
        throw new NotFoundError('Record not found or withdrawn.');
      }
      res.json({ record: record.record });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Withdraws a promoted record (PRD FR-022 tombstone).
 */
router.delete(
  '/teams/:id/records/:recordId',
  requireAuth,
  requireTeamMember,
  (req, res, next) => {
    try {
      const { recordId } = req.params;
      const existing = getRecord(req.teamId, recordId);
      if (!existing) {
        throw new NotFoundError('Record not found.');
      }

      // Only the author or a team admin can withdraw
      if (existing.author_id !== req.user.id && req.membership.role !== 'admin') {
        throw new ForbiddenError('Only the author or a team admin can withdraw this record.');
      }

      withdrawRecord(req.teamId, recordId);

      logAuditEvent({
        actorId: req.user.id,
        action: 'record_withdrawn',
        teamId: req.teamId,
        recordId,
        metadata: { version: existing.version }
      });

      res.json({ message: 'Record withdrawn successfully.' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
