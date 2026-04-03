import { beforeEach, describe, expect, it } from 'vitest';
import * as db from '../server/db.js';

describe('db.mergeJiraReleases', () => {
  beforeEach(async () => {
    delete process.env.DATABASE_URL;
    await db.initDataStore();
  });

  it('enriches Monday rows by Jira key without adding unmatched Jira issues by default', async () => {
    await db.applyIngest({
      releases: [
        {
          release_key: 'monday:123',
          partner: 'AT&T',
          product: 'RingCX',
          source: 'monday',
          stage: 'Beta',
          jira_number: 'GSP-123',
          pmo_status: 'On Track',
          monday_item_id: '123',
          include_in_matrix: 1,
          is_unmanaged_jira: 0,
        },
      ],
      meta: { fetchedAt: '2026-04-02T00:00:00.000Z', source: 'unit-test' },
    });

    const result = await db.mergeJiraReleases(
      [
        {
          release_key: 'jira:GSP-123',
          jira_number: 'GSP-123',
          jira_status: 'In Progress',
          project_title: 'AT&T RingCX launch hardening',
          impact_summary: 'Launch blocker mitigation',
          partner: 'AT&T',
          product: 'RingCX',
          source: 'jira',
        },
        {
          release_key: 'jira:GSP-999',
          jira_number: 'GSP-999',
          jira_status: 'Open',
          project_title: 'Unmatched Jira issue',
          partner: 'BT',
          product: 'AIR',
          source: 'jira',
        },
      ],
      { fetchedAt: '2026-04-02T01:00:00.000Z' }
    );

    expect(result).toMatchObject({
      linked: 1,
      unmanaged: 0,
      skippedUnmanaged: 1,
      total: 1,
    });

    const releases = db.getAllReleases();
    expect(releases).toHaveLength(1);
    expect(releases[0]).toMatchObject({
      release_key: 'monday:123',
      jira_number: 'GSP-123',
      jira_status: 'In Progress',
      project_title: 'AT&T RingCX launch hardening',
      impact_summary: 'Launch blocker mitigation',
      is_unmanaged_jira: 0,
      include_in_matrix: 1,
    });
  });

  it('can optionally retain unmatched Jira issues as exceptions-only rows', async () => {
    const { releases, linked, unmanaged, skippedUnmanaged } = db.mergeJiraIntoExisting(
      [
        {
          release_key: 'monday:123',
          partner: 'AT&T',
          product: 'RingCX',
          source: 'monday',
          stage: 'Beta',
          jira_number: 'GSP-123',
          include_in_matrix: 1,
          is_unmanaged_jira: 0,
        },
      ],
      [
        {
          release_key: 'jira:GSP-999',
          jira_number: 'GSP-999',
          jira_status: 'Open',
          project_title: 'Unmatched Jira issue',
          partner: 'BT',
          product: 'AIR',
          source: 'jira',
        },
      ],
      { includeUnmanaged: true }
    );

    expect({ linked, unmanaged, skippedUnmanaged }).toEqual({
      linked: 0,
      unmanaged: 1,
      skippedUnmanaged: 0,
    });
    expect(releases).toHaveLength(2);
    expect(releases.find((r) => r.jira_number === 'GSP-999')).toMatchObject({
      source: 'jira',
      is_unmanaged_jira: 1,
      include_in_matrix: 0,
    });
  });
});
