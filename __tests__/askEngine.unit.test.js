/**
 * Ask query routing — v1.3 Ch.27 + v1.4 core queries (RCS count, top partner projects).
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

  it('Type 3 — RCS / RingCX count with schedule URL (v1.4)', () => {
    const row = {
      partner: 'Telus',
      product: 'RingCX',
      product_track: 'RingCX',
      stage: 'Beta',
      pmo_status: 'Working on it',
      gsp_launch_date: '2026-06-01',
      schedule_url: 'https://example.com/schedule',
      source: 'monday',
      include_in_matrix: 1,
      is_unmanaged_jira: 0,
      priority_number: 2,
    };
    const db = mockDb({ releases: [row] });
    const r = runAskQuery('How many RCS projects does PMO manage with a schedule?', db);
    expect(r.askType).toBe(3);
    expect(r.intent).toBe('count_scheduled_rcx');
    expect(r.count).toBe(1);
    expect(r.message).toMatch(/PMO manages 1/);
    expect(r.message).toMatch(/Telus — RingCX/);
    expect(r.topRows).toHaveLength(1);
  });

  it('Type 3 — no match without schedule_url', () => {
    const db = mockDb({
      releases: [
        {
          partner: 'Telus',
          product: 'RingCX',
          product_track: 'RingCX',
          stage: 'Beta',
          gsp_launch_date: '2026-06-01',
          include_in_matrix: 1,
          is_unmanaged_jira: 0,
        },
      ],
    });
    const r = runAskQuery('How many RingCX projects are PMO-managed with schedules?', db);
    expect(r.askType).toBe(3);
    expect(r.count).toBe(0);
  });

  it('Type 2 — Top 5 AT&T by Monday priority ascending (v1.4)', () => {
    const db = mockDb({
      partners: ['AT&T', 'Telus'],
      releases: [
        {
          partner: 'AT&T',
          product: 'RingCX Migration',
          product_track: 'RingCX',
          stage: 'Beta',
          pmo_status: 'On Track',
          priority_number: 2,
          monday_comment: 'Phase 2',
          include_in_matrix: 1,
          is_unmanaged_jira: 0,
        },
        {
          partner: 'AT&T',
          product: 'RingEX Rollout',
          product_track: 'RingEX',
          stage: 'Beta',
          pmo_status: 'At Risk',
          priority_number: 1,
          monday_comment: 'Infra dependency',
          include_in_matrix: 1,
          is_unmanaged_jira: 0,
        },
      ],
    });
    const r = runAskQuery('Top 5 AT&T projects', db);
    expect(r.askType).toBe(2);
    expect(r.intent).toBe('top_partner_priority');
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0].priority_number).toBe(1);
    expect(r.rows[1].priority_number).toBe(2);
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
