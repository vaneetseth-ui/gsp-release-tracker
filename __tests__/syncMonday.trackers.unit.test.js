import { describe, expect, it } from 'vitest';
import {
  buildTrackerContext,
  matchTrackerEntryForRelease,
  parseTracker1Entries,
  parseTracker2Entries,
} from '../server/sync_monday.js';

function timelineValue(start, end) {
  return JSON.stringify({ from: start, to: end });
}

function col(id, text, type = 'text', value = null) {
  return { id, text, type, value };
}

const fieldRefs = {
  dri: { id: 'dri', title: 'DRI', type: 'dropdown' },
  timeline: { id: 'timeline', title: 'Timeline', type: 'timeline' },
  status: { id: 'status', title: 'Status', type: 'status' },
  comment: { id: 'comment', title: 'Comment', type: 'long_text' },
  jiraTickets: { id: 'jira', title: 'JIRA Tickets / Links', type: 'long_text' },
  criticalDependency: null,
  dependency: { id: 'dependency', title: 'Dependency', type: 'dependency' },
};

describe('tracker parsers', () => {
  it('parses tracker 1 partner rows into milestone summaries', () => {
    const bundle = {
      boardId: '18399812494',
      boardName: 'Tracker 1',
      fieldRefs,
      items: [
        {
          id: 'partner-row',
          name: 'AT&T',
          url: 'https://ringcentral.monday.com/boards/18399812494/pulses/partner-row',
          group: { id: 'g1', title: 'EX - AT&T LTE Desk Phone - Yealink [AT&T]' },
          column_values: [col('dri', 'Ehab'), col('comment', 'Partner-level comment')],
          subitems: [
            {
              id: 'pr-root',
              name: 'Product Readiness',
              parent_item: { id: 'partner-row', name: 'AT&T' },
              column_values: [
                col('dri', 'Jan Johansson'),
                col('comment', 'Readiness root comment'),
              ],
            },
            {
              id: 'launch-root',
              name: 'AT&T Launch',
              parent_item: { id: 'partner-row', name: 'AT&T' },
              column_values: [col('dri', 'Rob Leasure')],
            },
            {
              id: 'pr-task',
              name: 'Functional requirements sign-off',
              parent_item: { id: 'pr-root', name: 'Product Readiness' },
              column_values: [
                col('dri', 'Jan Johansson'),
                col('timeline', 'May 1 - May 29', 'timeline', timelineValue('2026-05-01', '2026-05-29')),
                col('status', 'Working on it', 'status'),
                col('comment', 'Requirement sign-off in motion'),
                col('jira', 'INIT-27079', 'long_text'),
                col('dependency', 'CSO approval', 'dependency'),
              ],
            },
            {
              id: 'launch-task',
              name: 'Carrier launch readiness',
              parent_item: { id: 'launch-root', name: 'AT&T Launch' },
              column_values: [
                col('dri', 'Rob Leasure'),
                col('timeline', 'Jun 1 - Jun 30', 'timeline', timelineValue('2026-06-01', '2026-06-30')),
                col('status', 'At Risk', 'status'),
                col('jira', 'GSP-2533', 'long_text'),
              ],
            },
          ],
        },
      ],
    };

    const [entry] = parseTracker1Entries(bundle);
    expect(entry).toMatchObject({
      projectTitle: 'EX - AT&T LTE Desk Phone - Yealink [AT&T]',
      partner: 'AT&T',
      product_readiness_date: '2026-05-29',
      gsp_launch_date: '2026-06-30',
    });
    expect(entry.milestones.product_readiness).toMatchObject({
      dri: 'Jan Johansson',
      status: 'In Progress',
      timeline_start: '2026-05-01',
      timeline_end: '2026-05-29',
      comment: 'Readiness root comment',
    });
    expect(entry.milestones.gsp_launch).toMatchObject({
      dri: 'Rob Leasure',
      status: 'At Risk',
      timeline_end: '2026-06-30',
    });
  });

  it('parses tracker 2 milestone-first groups into partner-specific entries', () => {
    const bundle = {
      boardId: '18399616718',
      boardName: 'Tracker 2',
      fieldRefs,
      items: [
        {
          id: 'group-pr',
          name: 'Product Readiness',
          url: 'https://ringcentral.monday.com/boards/18399616718/pulses/group-pr',
          group: { id: 'g2', title: 'EX - Charter: Support account level fax cover sheets [Charter]' },
          column_values: [],
          subitems: [
            {
              id: 'charter-pr',
              name: 'Product Readiness - Charter',
              parent_item: { id: 'group-pr', name: 'Product Readiness' },
              column_values: [col('dri', 'Jan Johansson'), col('comment', 'Ready for UAT')],
            },
            {
              id: 'charter-pr-task',
              name: 'Fax cover sheet validation',
              parent_item: { id: 'charter-pr', name: 'Product Readiness - Charter' },
              column_values: [
                col('timeline', 'Apr 1 - Apr 12', 'timeline', timelineValue('2026-04-01', '2026-04-12')),
                col('status', 'Done', 'status'),
              ],
            },
          ],
        },
        {
          id: 'group-launch',
          name: 'GSP Launch',
          url: 'https://ringcentral.monday.com/boards/18399616718/pulses/group-launch',
          group: { id: 'g2', title: 'EX - Charter: Support account level fax cover sheets [Charter]' },
          column_values: [],
          subitems: [
            {
              id: 'charter-launch',
              name: 'GSP Launch - Charter',
              parent_item: { id: 'group-launch', name: 'GSP Launch' },
              column_values: [col('dri', 'Rob Leasure')],
            },
            {
              id: 'charter-launch-task',
              name: 'Launch checklist',
              parent_item: { id: 'charter-launch', name: 'GSP Launch - Charter' },
              column_values: [
                col('timeline', 'Apr 15 - Apr 25', 'timeline', timelineValue('2026-04-15', '2026-04-25')),
                col('status', 'Working on it', 'status'),
              ],
            },
          ],
        },
      ],
    };

    const [entry] = parseTracker2Entries(bundle, ['Charter']);
    expect(entry).toMatchObject({
      projectTitle: 'EX - Charter: Support account level fax cover sheets [Charter]',
      partner: 'Charter',
      product_readiness_date: '2026-04-12',
      gsp_launch_date: '2026-04-25',
    });
    expect(entry.milestones.product_readiness?.dri).toBe('Jan Johansson');
    expect(entry.milestones.gsp_launch?.dri).toBe('Rob Leasure');
  });

  it('matches tracker entries by link first, then exact normalized title + partner, with no partner-only fallback', () => {
    const tracker1 = {
      boardId: '18399812494',
      boardName: 'Tracker 1',
      fieldRefs,
      items: [
        {
          id: 'top-1',
          name: 'AT&T',
          url: 'https://ringcentral.monday.com/boards/18399812494/pulses/top-1',
          group: { id: 'g1', title: 'EX - AT&T LTE Desk Phone - Yealink [AT&T]' },
          column_values: [],
          subitems: [
            {
              id: 'pr-1',
              name: 'Product Readiness',
              parent_item: { id: 'top-1', name: 'AT&T' },
              column_values: [col('dri', 'Jan')],
            },
          ],
        },
      ],
    };
    const tracker2 = {
      boardId: '18399616718',
      boardName: 'Tracker 2',
      fieldRefs,
      items: [
        {
          id: 'charter-pr',
          name: 'Product Readiness',
          url: 'https://ringcentral.monday.com/boards/18399616718/pulses/charter-pr',
          group: { id: 'g2', title: 'EX - Charter: Support account level fax cover sheets [Charter]' },
          column_values: [],
          subitems: [
            {
              id: 'charter-pr-root',
              name: 'Product Readiness - Charter',
              parent_item: { id: 'charter-pr', name: 'Product Readiness' },
              column_values: [col('dri', 'Jan')],
            },
          ],
        },
      ],
    };

    const context = buildTrackerContext([tracker1, tracker2], ['AT&T', 'Charter']);

    const linked = matchTrackerEntryForRelease(
      context,
      {
        linkedId: 'top-1',
        scheduleUrl: 'https://ringcentral.monday.com/boards/18399812494/views/240444897',
        partner: 'AT&T',
        priorityTitle: 'LTE Desk Phone - (Yealink T77)',
      },
      []
    );
    expect(linked?.partner).toBe('AT&T');

    const titleMatch = matchTrackerEntryForRelease(
      context,
      {
        linkedId: null,
        scheduleUrl: 'https://ringcentral.monday.com/boards/18399616718',
        partner: 'Charter',
        priorityTitle: 'Charter: Support account level fax cover sheets',
      },
      []
    );
    expect(titleMatch?.partner).toBe('Charter');

    const noFallback = matchTrackerEntryForRelease(
      context,
      {
        linkedId: null,
        scheduleUrl: 'https://ringcentral.monday.com/boards/18399616718',
        partner: 'Charter',
        priorityTitle: 'Unrelated project title',
      },
      []
    );
    expect(noFallback).toBeNull();
  });
});
