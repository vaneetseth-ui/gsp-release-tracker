/**
 * v1.3 Ch.27 — unit tests for Ask query routing (sample questions + edge cases).
 */
import { describe, it, expect } from 'vitest';
import { runAskQuery } from '../server/askEngine.js';

function mockDb({ releases = [], partners } = {}) {
  const rel = releases;
  return {
    getAllReleases: () => rel,
    getPartners: () =>
      partners ?? [...new Set(rel.map((r) => r.partner).filter(Boolean))].sort(),
  };
}

describe('runAskQuery', () => {
  it('Type 4 — Jira not in Monday (sample Q2)', () => {
    const db = mockDb({
      releases: [
        {
          partner: 'Acme',
          product: 'RingCX',
          is_unmanaged_jira: 1,
          include_in_matrix: 0,
        },
      ],
    });
    const r = runAskQuery('Which GSP Jira projects are not in Monday?', db);
    expect(r.askType).toBe(4);
    expect(r.intent).toBe('jira_not_monday');
    expect(r.rows).toHaveLength(1);
  });

  it('Type 3 — RingCX count with schedules (sample Q3)', () => {
    const db = mockDb({
      releases: [
        {
          partner: 'Telus',
          product: 'RingCX',
          product_track: 'RingCX',
          gsp_launch_date: '2026-06-01',
          source: 'monday',
          include_in_matrix: 1,
          is_unmanaged_jira: 0,
        },
      ],
    });
    const r = runAskQuery('How many RingCX projects are PMO-managed with schedules?', db);
    expect(r.askType).toBe(3);
    expect(r.count).toBe(1);
  });

  it('Type 1 — MCM Nova IVA (sample Q1)', () => {
    const db = mockDb({
      releases: [
        {
          partner: 'MCM',
          product: 'Nova IVA',
          product_track: 'Nova IVA',
          stage: 'GA',
          pmo_status: 'Done',
          include_in_matrix: 1,
          is_unmanaged_jira: 0,
        },
      ],
    });
    const r = runAskQuery("What is MCM's Nova IVA status?", db);
    expect(r.askType).toBe(1);
    expect(r.record).toBeTruthy();
    expect(r.record.partner).toBe('MCM');
  });

  it('honest uncertainty — empty cache', () => {
    const r = runAskQuery('Is Telus live on RCX?', mockDb({ releases: [] }));
    expect(r.message).toMatch(/not on record|No matches/i);
  });

  it('unknown intent for vague query', () => {
    const r = runAskQuery('asdfgh qwerty', mockDb({ releases: [] }));
    expect(r.askType).toBe(0);
    expect(r.intent).toBe('unknown');
  });
});
