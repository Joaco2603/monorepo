import { describe, expect, it } from 'vitest'
import {
  buildStatusTimeline,
  canFileDispute,
  validateDescription,
  descriptionCharsRemaining,
  validateEvidenceFiles,
  validateResolutionText,
  evidenceKind,
  DISPUTE_REASON_LABELS,
  MAX_EVIDENCE_FILES,
} from '@/lib/disputeTimeline'

describe('buildStatusTimeline', () => {
  it('marks past steps complete, current step current, future upcoming', () => {
    const steps = buildStatusTimeline('under_review', {
      pending: '2026-01-01T00:00:00Z',
      under_review: '2026-01-02T00:00:00Z',
    })
    expect(steps.map((s) => s.state)).toEqual(['complete', 'current', 'upcoming'])
    expect(steps[0].timestamp).toBe('2026-01-01T00:00:00Z')
    expect(steps[2].label).toBe('Resolved')
  })

  it('shows the rejected outcome as the terminal step', () => {
    const steps = buildStatusTimeline('rejected')
    expect(steps.map((s) => s.label)).toEqual(['Filed', 'Under Review', 'Rejected'])
    expect(steps[2].state).toBe('current')
  })

  it('shows the resolved outcome with all prior steps complete', () => {
    const steps = buildStatusTimeline('resolved')
    expect(steps.map((s) => s.state)).toEqual(['complete', 'complete', 'current'])
  })

  it('a freshly filed dispute has only the first step current', () => {
    const steps = buildStatusTimeline('pending')
    expect(steps.map((s) => s.state)).toEqual(['current', 'upcoming', 'upcoming'])
  })
})

describe('canFileDispute', () => {
  it('blocks a second pending dispute for the same payment', () => {
    const existing = [{ paymentId: 'p1', status: 'pending' as const }]
    expect(canFileDispute(existing, 'p1')).toBe(false)
  })

  it('allows a new dispute when prior ones are resolved/rejected', () => {
    const existing = [
      { paymentId: 'p1', status: 'resolved' as const },
      { paymentId: 'p1', status: 'rejected' as const },
    ]
    expect(canFileDispute(existing, 'p1')).toBe(true)
  })

  it('allows a dispute for a different payment', () => {
    expect(canFileDispute([{ paymentId: 'p2', status: 'pending' }], 'p1')).toBe(true)
  })
})

describe('description validation', () => {
  it('rejects too-short and too-long descriptions', () => {
    expect(validateDescription('short').valid).toBe(false)
    expect(validateDescription('a'.repeat(1001)).valid).toBe(false)
  })

  it('accepts a valid description', () => {
    expect(validateDescription('This charge looks wrong to me.').valid).toBe(true)
  })

  it('counts remaining characters', () => {
    expect(descriptionCharsRemaining('hello')).toBe(995)
  })
})

describe('evidence validation', () => {
  it('rejects more than the max files', () => {
    const files = Array.from({ length: MAX_EVIDENCE_FILES + 1 }, () => ({ type: 'image/png' }))
    expect(validateEvidenceFiles(files).valid).toBe(false)
  })

  it('rejects unsupported types', () => {
    expect(validateEvidenceFiles([{ type: 'application/zip' }]).valid).toBe(false)
  })

  it('accepts images and pdfs up to the limit', () => {
    expect(
      validateEvidenceFiles([{ type: 'image/jpeg' }, { type: 'application/pdf' }]).valid,
    ).toBe(true)
  })
})

describe('resolution validation', () => {
  it('requires non-empty text', () => {
    expect(validateResolutionText('   ').valid).toBe(false)
    expect(validateResolutionText('Refund issued.').valid).toBe(true)
  })
})

describe('evidenceKind', () => {
  it('classifies images, pdfs, and other', () => {
    expect(evidenceKind('receipts/scan.PNG')).toBe('image')
    expect(evidenceKind('proof.pdf')).toBe('pdf')
    expect(evidenceKind('notes.docx')).toBe('other')
  })
})

describe('DISPUTE_REASON_LABELS', () => {
  it('covers every backend reason', () => {
    expect(Object.keys(DISPUTE_REASON_LABELS)).toEqual([
      'amount_discrepancy',
      'duplicate_charge',
      'service_not_received',
      'early_termination',
      'property_issue',
      'other',
    ])
  })
})
