import { describe, expect, it } from 'vitest';
import { resolveBoardFieldRefs } from '../server/sync_monday.js';

describe('resolveBoardFieldRefs', () => {
  it('resolves the required Monday priority field aliases by stable column id', () => {
    const refs = resolveBoardFieldRefs(
      [
        { id: 'partner__1', title: 'Partner', type: 'text' },
        { id: 'status__1', title: 'Status', type: 'status' },
        { id: 'comment__1', title: 'Comment', type: 'long_text' },
        { id: 'se__1', title: 'SE Lead', type: 'people' },
        { id: 'schedule__1', title: 'Schedule link', type: 'board_relation' },
        { id: 'jira__1', title: 'Jira Number', type: 'text' },
        { id: 'pm__1', title: 'Product Manager', type: 'people' },
        { id: 'market__1', title: 'Market Type', type: 'status' },
        { id: 'track__1', title: 'Product Track', type: 'dropdown' },
      ],
      {
        partner: { aliases: ['Partner'], required: true },
        status: { aliases: ['Status'], required: true },
        comment: { aliases: ['Comment', 'Notes'], required: true },
        seLead: { aliases: ['SE Lead'], required: true },
        schedule: { aliases: ['Schedule', 'Schedule link'], required: true },
        jiraNumber: { aliases: ['Jira Number', 'Jira'], required: true },
        productManager: { aliases: ['Product Manager', 'PM'], required: true },
        marketType: { aliases: ['Market Type'], required: true },
        productTrack: { aliases: ['Product Track', 'Product'], required: true },
      },
      'GSP Priorities'
    );

    expect(refs.schedule).toMatchObject({ id: 'schedule__1', title: 'Schedule link' });
    expect(refs.productManager).toMatchObject({ id: 'pm__1', title: 'Product Manager' });
  });

  it('throws when a required Monday field is missing', () => {
    expect(() =>
      resolveBoardFieldRefs(
        [{ id: 'partner__1', title: 'Partner', type: 'text' }],
        {
          partner: { aliases: ['Partner'], required: true },
          status: { aliases: ['Status'], required: true },
        },
        'GSP Priorities'
      )
    ).toThrow(/missing required columns: Status/i);
  });
});
