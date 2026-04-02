import { beforeEach, describe, expect, it } from 'vitest';
import * as db from '../server/db.js';

describe('db.getSummary', () => {
  beforeEach(async () => {
    delete process.env.DATABASE_URL;
    await db.initDataStore();
  });

  it('returns mondayRowsWithJiraKey without throwing', async () => {
    await db.applyIngest({
      releases: [
        {
          release_key: 'monday:123',
          partner: 'Telus',
          product: 'RingCX',
          source: 'monday',
          stage: 'Beta',
          jira_number: 'GSP-123',
          monday_item_id: '123',
          monday_board_id: '111',
          monday_board_name: 'GSP Priorities',
          include_in_matrix: 1,
          is_unmanaged_jira: 0,
        },
      ],
      meta: {
        fetchedAt: '2026-04-01T00:00:00.000Z',
        source: 'unit-test',
        mondayPriorities: 1,
        trackerRows: 0,
        jiraGsp: 1,
        mondayApiVersion: '2026-04',
        boardStats: [{ key: 'priorities', id: '111', name: 'GSP Priorities', items: 1 }],
      },
    });

    expect(db.getSummary()).toMatchObject({
      total: 1,
      unmanagedJiraRows: 0,
      mondayRowsWithJiraKey: 1,
      lastPullSnapshot: {
        source: 'unit-test',
        mondayApiVersion: '2026-04',
      },
    });
  });
});
