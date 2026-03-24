/**
 * GSP Release Tracker — Mock Dataset  v1.0
 * 17 Partners × products per PRODUCT_AREAS in constants.js
 * Includes realistic exceptions: blocked items, overdue targets, SFDC red accounts
 */

import { MATRIX_PRODUCT_ORDER } from './constants.js';

export const PRODUCTS = MATRIX_PRODUCT_ORDER;

export const PARTNERS = [
  'AT&T O@H', 'Avaya ACO', 'BT', 'Charter ENT', 'Charter SMB',
  'DT', 'DT-Unify', 'Ecotel', 'Frontier', 'MCM',
  'RISE Amer', 'RISE Int\'l', 'Telus', 'Unify', 'Verizon',
  'Versatel', 'Vodafone',
];

// Canonical stages — soft pills (ring + light fill) for readability
export const STAGES = {
  GA:       { label: 'GA',       color: 'bg-emerald-500', text: 'text-white', badge: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100/90',  order: 1 },
  Beta:     { label: 'Beta',     color: 'bg-blue-500',    text: 'text-white', badge: 'bg-sky-50 text-sky-800 ring-1 ring-sky-100/90',            order: 2 },
  EAP:      { label: 'EAP',      color: 'bg-amber-400',   text: 'text-gray-900', badge: 'bg-amber-50 text-amber-900 ring-1 ring-amber-100/90', order: 3 },
  Dev:      { label: 'Dev',      color: 'bg-orange-400',  text: 'text-white', badge: 'bg-orange-50 text-orange-900 ring-1 ring-orange-100/80', order: 4 },
  Planned:  { label: 'Planned',  color: 'bg-slate-400',   text: 'text-white', badge: 'bg-slate-50 text-slate-700 ring-1 ring-slate-200/80',   order: 5 },
  Blocked:  { label: 'Blocked',  color: 'bg-red-500',     text: 'text-white', badge: 'bg-red-50 text-red-800 ring-1 ring-red-100/90',       order: 6 },
  'N/A':    { label: 'N/A',      color: 'bg-gray-200',    text: 'text-gray-400', badge: 'bg-slate-50 text-slate-400 ring-1 ring-slate-100', order: 7 },
};

// ─── Release Records ──────────────────────────────────────────────────────────
// Each record: { partner, product, stage, target_date, actual_date, jira, pm, se_lead, csm, notes, daysOverdue, redAccount }
export const RELEASES = [

  // ── AT&T O@H ──
  { partner: 'AT&T O@H', product: 'Nova IVA', stage: 'GA',      target_date: '2025-09-15', actual_date: '2025-09-12', jira: 'PTR-1042', pm: 'Sarah Chen',     se_lead: 'Mike Torres',   csm: 'Dana Wu',     notes: 'Deployed successfully. All KPIs green.' },
  { partner: 'AT&T O@H', product: 'RingCX',   stage: 'Beta',    target_date: '2026-04-30', actual_date: null,         jira: 'PTR-1103', pm: 'Sarah Chen',     se_lead: 'Mike Torres',   csm: 'Dana Wu',     notes: 'Beta with 3 pilot sites. Minor IVR integration issue tracked in PTR-1105.' },
  { partner: 'AT&T O@H', product: 'AIR',      stage: 'EAP',     target_date: '2026-06-15', actual_date: null,         jira: 'PTR-1198', pm: 'Raj Patel',      se_lead: 'Mike Torres',   csm: 'Dana Wu',     notes: 'EAP approved. Sandbox provisioned.' },
  { partner: 'AT&T O@H', product: 'MVP',       stage: 'GA',      target_date: '2024-11-01', actual_date: '2024-10-28', jira: 'PTR-0881', pm: 'James Liu',      se_lead: 'Mike Torres',   csm: 'Dana Wu',     notes: 'Fully live. 2M+ users on platform.' },
  { partner: 'AT&T O@H', product: 'ACO',       stage: 'N/A',     target_date: null,         actual_date: null,         jira: null,       pm: null,             se_lead: null,            csm: 'Dana Wu',     notes: 'Not in scope for AT&T.' },

  // ── Avaya ACO ──
  { partner: 'Avaya ACO', product: 'Nova IVA', stage: 'EAP',     target_date: '2026-03-01', actual_date: null,         jira: 'PTR-1154', pm: 'Sarah Chen',     se_lead: 'Priya Nair',   csm: 'Tom Blake',   notes: 'In EAP since Jan 2026. 102 days in EAP — flag for review.', daysInEAP: 102 },
  { partner: 'Avaya ACO', product: 'RingCX',   stage: 'N/A',     target_date: null,         actual_date: null,         jira: null,       pm: null,             se_lead: null,            csm: 'Tom Blake',   notes: 'Avaya uses ACO product stack — RingCX not applicable.' },
  { partner: 'Avaya ACO', product: 'AIR',      stage: 'Dev',     target_date: '2026-07-30', actual_date: null,         jira: 'GSP-0231', pm: 'Raj Patel',      se_lead: 'Priya Nair',   csm: 'Tom Blake',   notes: 'Development started Q1 2026. Architecture review complete.' },
  { partner: 'Avaya ACO', product: 'MVP',       stage: 'N/A',     target_date: null,         actual_date: null,         jira: null,       pm: null,             se_lead: null,            csm: 'Tom Blake',   notes: 'Not applicable — Avaya on ACO bundle.' },
  { partner: 'Avaya ACO', product: 'ACO',       stage: 'Beta',    target_date: '2026-05-15', actual_date: null,         jira: 'PTR-1201', pm: 'James Liu',      se_lead: 'Priya Nair',   csm: 'Tom Blake',   notes: 'Beta with Avaya direct enterprise customers.' },

  // ── BT ──
  { partner: 'BT',        product: 'Nova IVA', stage: 'Beta',    target_date: '2026-04-01', actual_date: null,         jira: 'PTR-1112', pm: 'Sarah Chen',     se_lead: 'Carlos Reyes', csm: 'Lisa Park',   notes: 'Beta with 5 UK enterprise accounts.' },
  { partner: 'BT',        product: 'RingCX',   stage: 'EAP',     target_date: '2026-05-30', actual_date: null,         jira: 'PTR-1178', pm: 'Sarah Chen',     se_lead: 'Carlos Reyes', csm: 'Lisa Park',   notes: 'EAP approved Q1 2026. EU data residency config in progress.' },
  { partner: 'BT',        product: 'AIR',      stage: 'Planned', target_date: '2026-09-30', actual_date: null,         jira: 'GSP-0189', pm: 'Raj Patel',      se_lead: 'Carlos Reyes', csm: 'Lisa Park',   notes: 'Planned for Q3 2026. Waiting on BT network certification.' },
  { partner: 'BT',        product: 'MVP',       stage: 'GA',      target_date: '2025-03-15', actual_date: '2025-03-18', jira: 'PTR-0912', pm: 'James Liu',      se_lead: 'Carlos Reyes', csm: 'Lisa Park',   notes: 'GA. 850K users across BT Business.' },
  { partner: 'BT',        product: 'ACO',       stage: 'N/A',     target_date: null,         actual_date: null,         jira: null,       pm: null,             se_lead: null,            csm: 'Lisa Park',   notes: 'Not in current BT roadmap.' },

  // ── Charter ENT ──
  { partner: 'Charter ENT', product: 'Nova IVA', stage: 'GA',    target_date: '2025-11-01', actual_date: '2025-10-30', jira: 'PTR-1055', pm: 'Sarah Chen',     se_lead: 'Kim Nguyen',   csm: 'Paul Adams',  notes: 'Charter Enterprise GA. Strong adoption in hospitality vertical.' },
  { partner: 'Charter ENT', product: 'RingCX',   stage: 'Dev',   target_date: '2026-08-15', actual_date: null,         jira: 'GSP-0244', pm: 'Sarah Chen',     se_lead: 'Kim Nguyen',   csm: 'Paul Adams',  notes: 'Development phase. Charter requesting custom integration with existing CCaaS.' },
  { partner: 'Charter ENT', product: 'AIR',      stage: 'EAP',   target_date: '2026-06-01', actual_date: null,         jira: 'PTR-1204', pm: 'Raj Patel',      se_lead: 'Kim Nguyen',   csm: 'Paul Adams',  notes: 'EAP began March 2026.' },
  { partner: 'Charter ENT', product: 'MVP',       stage: 'GA',    target_date: '2024-09-01', actual_date: '2024-08-28', jira: 'PTR-0867', pm: 'James Liu',      se_lead: 'Kim Nguyen',   csm: 'Paul Adams',  notes: 'Fully live.' },
  { partner: 'Charter ENT', product: 'ACO',       stage: 'N/A',   target_date: null,         actual_date: null,         jira: null,       pm: null,             se_lead: null,            csm: 'Paul Adams',  notes: 'Not applicable.' },

  // ── Charter SMB ──
  { partner: 'Charter SMB', product: 'Nova IVA', stage: 'Planned', target_date: '2026-10-01', actual_date: null,       jira: 'GSP-0255', pm: 'Sarah Chen',     se_lead: 'Kim Nguyen',   csm: 'Paul Adams',  notes: 'Planned Q4 2026. SMB market assessment complete.' },
  { partner: 'Charter SMB', product: 'RingCX',   stage: 'N/A',     target_date: null,         actual_date: null,       jira: null,       pm: null,             se_lead: null,            csm: 'Paul Adams',  notes: 'SMB segment: RingCX not in scope.' },
  { partner: 'Charter SMB', product: 'AIR',      stage: 'Dev',     target_date: '2026-09-15', actual_date: null,       jira: 'GSP-0261', pm: 'Raj Patel',      se_lead: 'Kim Nguyen',   csm: 'Paul Adams',  notes: 'Early development. SMB-specific packaging under review.' },
  { partner: 'Charter SMB', product: 'MVP',       stage: 'Beta',    target_date: '2026-05-01', actual_date: null,       jira: 'PTR-1215', pm: 'James Liu',      se_lead: 'Kim Nguyen',   csm: 'Paul Adams',  notes: 'Beta with 10 SMB pilot accounts.' },
  { partner: 'Charter SMB', product: 'ACO',       stage: 'N/A',     target_date: null,         actual_date: null,       jira: null,       pm: null,             se_lead: null,            csm: 'Paul Adams',  notes: 'Not applicable.' },

  // ── DT (Deutsche Telekom) ──
  { partner: 'DT',          product: 'Nova IVA', stage: 'Beta',    target_date: '2026-05-15', actual_date: null,       jira: 'PTR-1122', pm: 'Sarah Chen',     se_lead: 'Anna Schmidt', csm: 'Eric Müller', notes: 'Beta in Germany. GDPR compliance review in progress.' },
  { partner: 'DT',          product: 'RingCX',   stage: 'EAP',     target_date: '2026-07-01', actual_date: null,       jira: 'PTR-1188', pm: 'Sarah Chen',     se_lead: 'Anna Schmidt', csm: 'Eric Müller', notes: 'EAP approved. German language pack customization required.' },
  { partner: 'DT',          product: 'AIR',      stage: 'Dev',     target_date: '2026-10-01', actual_date: null,       jira: 'GSP-0271', pm: 'Raj Patel',      se_lead: 'Anna Schmidt', csm: 'Eric Müller', notes: 'Development phase. EU AI Act compliance assessment pending.' },
  { partner: 'DT',          product: 'MVP',       stage: 'GA',      target_date: '2025-01-15', actual_date: '2025-01-10', jira: 'PTR-0895', pm: 'James Liu',  se_lead: 'Anna Schmidt', csm: 'Eric Müller', notes: 'GA. 1.2M business users.' },
  { partner: 'DT',          product: 'ACO',       stage: 'N/A',     target_date: null,         actual_date: null,       jira: null,       pm: null,             se_lead: null,            csm: 'Eric Müller', notes: 'Not in DT roadmap.' },

  // ── DT-Unify ──
  { partner: 'DT-Unify',    product: 'Nova IVA', stage: 'EAP',     target_date: '2026-04-15', actual_date: null,       jira: 'PTR-1166', pm: null,             se_lead: 'Anna Schmidt', csm: 'Eric Müller', notes: 'EAP in progress. ⚠️ PM unassigned — escalation needed.', missingPM: true },
  { partner: 'DT-Unify',    product: 'RingCX',   stage: 'Dev',     target_date: '2026-08-30', actual_date: null,       jira: 'GSP-0278', pm: null,             se_lead: 'Anna Schmidt', csm: 'Eric Müller', notes: 'Dev phase. PM assignment pending org restructure.', missingPM: true },
  { partner: 'DT-Unify',    product: 'AIR',      stage: 'Planned', target_date: '2027-01-01', actual_date: null,       jira: null,       pm: null,             se_lead: null,            csm: 'Eric Müller', notes: 'Planned 2027. DT-Unify org merge review ongoing.' },
  { partner: 'DT-Unify',    product: 'MVP',       stage: 'Beta',    target_date: '2026-06-01', actual_date: null,       jira: 'PTR-1219', pm: 'James Liu',      se_lead: 'Anna Schmidt', csm: 'Eric Müller', notes: 'Beta underway.' },
  { partner: 'DT-Unify',    product: 'ACO',       stage: 'N/A',     target_date: null,         actual_date: null,       jira: null,       pm: null,             se_lead: null,            csm: 'Eric Müller', notes: 'Not applicable.' },

  // ── Ecotel ──
  { partner: 'Ecotel',      product: 'Nova IVA', stage: 'Blocked', target_date: '2026-02-01', actual_date: null,       jira: 'PTR-1091', pm: 'Sarah Chen',     se_lead: 'Anna Schmidt', csm: 'Tina Braun',  notes: '🚫 Blocked 45 days past target. Ecotel network upgrade dependency. Escalated to VP Engineering.', daysOverdue: 50, blocked: true },
  { partner: 'Ecotel',      product: 'RingCX',   stage: 'N/A',     target_date: null,         actual_date: null,       jira: null,       pm: null,             se_lead: null,            csm: 'Tina Braun',  notes: 'Not in Ecotel scope.' },
  { partner: 'Ecotel',      product: 'AIR',      stage: 'N/A',     target_date: null,         actual_date: null,       jira: null,       pm: null,             se_lead: null,            csm: 'Tina Braun',  notes: 'Not in Ecotel scope.' },
  { partner: 'Ecotel',      product: 'MVP',       stage: 'EAP',     target_date: '2026-05-01', actual_date: null,       jira: 'PTR-1207', pm: 'James Liu',      se_lead: 'Anna Schmidt', csm: 'Tina Braun',  notes: 'EAP proceeding normally.' },
  { partner: 'Ecotel',      product: 'ACO',       stage: 'N/A',     target_date: null,         actual_date: null,       jira: null,       pm: null,             se_lead: null,            csm: 'Tina Braun',  notes: 'Not applicable.' },

  // ── Frontier ──
  { partner: 'Frontier',    product: 'Nova IVA', stage: 'Beta',    target_date: '2026-04-30', actual_date: null,       jira: 'PTR-1130', pm: 'Sarah Chen',     se_lead: 'Luis Garcia',  csm: 'Amy Ross',    notes: 'Beta running well. Frontier SMB adoption exceeding forecast.' },
  { partner: 'Frontier',    product: 'RingCX',   stage: 'N/A',     target_date: null,         actual_date: null,       jira: null,       pm: null,             se_lead: null,            csm: 'Amy Ross',    notes: 'Not in current Frontier roadmap.' },
  { partner: 'Frontier',    product: 'AIR',      stage: 'Dev',     target_date: '2026-09-01', actual_date: null,       jira: 'GSP-0289', pm: 'Raj Patel',      se_lead: 'Luis Garcia',  csm: 'Amy Ross',    notes: 'Development started. Frontier requesting rural network optimization.' },
  { partner: 'Frontier',    product: 'MVP',       stage: 'EAP',     target_date: '2026-05-30', actual_date: null,       jira: 'PTR-1209', pm: 'James Liu',      se_lead: 'Luis Garcia',  csm: 'Amy Ross',    notes: 'EAP in progress. Good velocity.' },
  { partner: 'Frontier',    product: 'ACO',       stage: 'N/A',     target_date: null,         actual_date: null,       jira: null,       pm: null,             se_lead: null,            csm: 'Amy Ross',    notes: 'Not applicable.' },

  // ── MCM ──
  { partner: 'MCM',         product: 'Nova IVA', stage: 'EAP',     target_date: '2026-02-15', actual_date: null,       jira: 'PTR-1098', pm: 'Sarah Chen',     se_lead: 'Carlos Reyes', csm: 'Ben Hall',    notes: '⚠️ 102 days in EAP. Target passed. SFDC red account — $1.2M ARR at risk.', daysInEAP: 102, redAccount: true, arrAtRisk: 1200000 },
  { partner: 'MCM',         product: 'RingCX',   stage: 'Beta',    target_date: '2026-06-30', actual_date: null,       jira: 'PTR-1192', pm: 'Sarah Chen',     se_lead: 'Carlos Reyes', csm: 'Ben Hall',    notes: 'Beta on track.' },
  { partner: 'MCM',         product: 'AIR',      stage: 'Planned', target_date: '2026-12-01', actual_date: null,       jira: null,       pm: 'Raj Patel',      se_lead: null,            csm: 'Ben Hall',    notes: 'Planned Q4 2026.' },
  { partner: 'MCM',         product: 'MVP',       stage: 'GA',      target_date: '2025-06-01', actual_date: '2025-05-29', jira: 'PTR-0942', pm: 'James Liu',  se_lead: 'Carlos Reyes', csm: 'Ben Hall',    notes: 'GA. Stable.' },
  { partner: 'MCM',         product: 'ACO',       stage: 'N/A',     target_date: null,         actual_date: null,       jira: null,       pm: null,             se_lead: null,            csm: 'Ben Hall',    notes: 'Not applicable.' },

  // ── RISE Amer ──
  { partner: 'RISE Amer',   product: 'Nova IVA', stage: 'GA',      target_date: '2025-10-01', actual_date: '2025-09-28', jira: 'PTR-1063', pm: 'Sarah Chen',   se_lead: 'Luis Garcia',  csm: 'Nina Ford',   notes: 'GA. Americas rollout complete.' },
  { partner: 'RISE Amer',   product: 'RingCX',   stage: 'GA',      target_date: '2025-12-15', actual_date: '2025-12-12', jira: 'PTR-1079', pm: 'Sarah Chen',   se_lead: 'Luis Garcia',  csm: 'Nina Ford',   notes: 'GA. Strongest performing partner this quarter.' },
  { partner: 'RISE Amer',   product: 'AIR',      stage: 'Beta',    target_date: '2026-05-01', actual_date: null,         jira: 'PTR-1145', pm: 'Raj Patel',    se_lead: 'Luis Garcia',  csm: 'Nina Ford',   notes: 'Beta progressing well. RISE requesting multi-region failover.' },
  { partner: 'RISE Amer',   product: 'MVP',       stage: 'GA',      target_date: '2024-07-01', actual_date: '2024-06-25', jira: 'PTR-0842', pm: 'James Liu',    se_lead: 'Luis Garcia',  csm: 'Nina Ford',   notes: 'Flagship MVP deployment.' },
  { partner: 'RISE Amer',   product: 'ACO',       stage: 'N/A',     target_date: null,         actual_date: null,         jira: null,       pm: null,           se_lead: null,            csm: 'Nina Ford',   notes: 'Not in RISE Amer scope.' },

  // ── RISE Int'l ──
  { partner: "RISE Int'l",  product: 'Nova IVA', stage: 'EAP',     target_date: '2026-05-01', actual_date: null,         jira: 'PTR-1160', pm: 'Sarah Chen',   se_lead: 'Priya Nair',   csm: 'Nina Ford',   notes: 'International EAP. Multi-language support in testing.' },
  { partner: "RISE Int'l",  product: 'RingCX',   stage: 'Dev',     target_date: '2026-09-30', actual_date: null,         jira: 'GSP-0298', pm: 'Sarah Chen',   se_lead: 'Priya Nair',   csm: 'Nina Ford',   notes: 'Dev. Asia-Pacific data residency requirements complex.' },
  { partner: "RISE Int'l",  product: 'AIR',      stage: 'Planned', target_date: '2027-01-15', actual_date: null,         jira: null,       pm: 'Raj Patel',    se_lead: null,            csm: 'Nina Ford',   notes: 'Planned for 2027. Regulatory approvals required in 6 countries.' },
  { partner: "RISE Int'l",  product: 'MVP',       stage: 'Beta',    target_date: '2026-06-15', actual_date: null,         jira: 'PTR-1222', pm: 'James Liu',    se_lead: 'Priya Nair',   csm: 'Nina Ford',   notes: 'Beta in APAC region.' },
  { partner: "RISE Int'l",  product: 'ACO',       stage: 'N/A',     target_date: null,         actual_date: null,         jira: null,       pm: null,           se_lead: null,            csm: 'Nina Ford',   notes: 'Not applicable.' },

  // ── Telus ──
  { partner: 'Telus',       product: 'Nova IVA', stage: 'Beta',    target_date: '2026-05-15', actual_date: null,         jira: 'PTR-1135', pm: 'Sarah Chen',   se_lead: 'Kim Nguyen',   csm: 'Marc Dubois', notes: 'Beta with Telus Business customers. French language pack ready.' },
  { partner: 'Telus',       product: 'RingCX',   stage: 'EAP',     target_date: '2026-07-15', actual_date: null,         jira: 'PTR-1193', pm: 'Sarah Chen',   se_lead: 'Kim Nguyen',   csm: 'Marc Dubois', notes: 'EAP in progress. CRTC compliance check scheduled.' },
  { partner: 'Telus',       product: 'AIR',      stage: 'Dev',     target_date: '2026-10-30', actual_date: null,         jira: 'GSP-0305', pm: 'Raj Patel',    se_lead: 'Kim Nguyen',   csm: 'Marc Dubois', notes: 'Development ongoing. Canadian privacy regulations review pending.' },
  { partner: 'Telus',       product: 'MVP',       stage: 'GA',      target_date: '2025-04-01', actual_date: '2025-04-03', jira: 'PTR-0921', pm: 'James Liu',    se_lead: 'Kim Nguyen',   csm: 'Marc Dubois', notes: 'GA in Canada.' },
  { partner: 'Telus',       product: 'ACO',       stage: 'N/A',     target_date: null,         actual_date: null,         jira: null,       pm: null,           se_lead: null,            csm: 'Marc Dubois', notes: 'Not in Telus roadmap.' },

  // ── Unify ──
  { partner: 'Unify',       product: 'Nova IVA', stage: 'Planned', target_date: '2026-11-01', actual_date: null,         jira: null,       pm: 'Sarah Chen',   se_lead: null,            csm: 'Eric Müller', notes: 'Planned Q4 2026. Unify migration from OpenScape in planning.' },
  { partner: 'Unify',       product: 'RingCX',   stage: 'N/A',     target_date: null,         actual_date: null,         jira: null,       pm: null,           se_lead: null,            csm: 'Eric Müller', notes: 'Not in current Unify roadmap.' },
  { partner: 'Unify',       product: 'AIR',      stage: 'N/A',     target_date: null,         actual_date: null,         jira: null,       pm: null,           se_lead: null,            csm: 'Eric Müller', notes: 'Not applicable.' },
  { partner: 'Unify',       product: 'MVP',       stage: 'EAP',     target_date: '2026-06-30', actual_date: null,         jira: 'PTR-1213', pm: 'James Liu',    se_lead: 'Anna Schmidt', csm: 'Eric Müller', notes: 'EAP with Unify Connect enterprise pilot.' },
  { partner: 'Unify',       product: 'ACO',       stage: 'N/A',     target_date: null,         actual_date: null,         jira: null,       pm: null,           se_lead: null,            csm: 'Eric Müller', notes: 'Not applicable.' },

  // ── Verizon ──
  { partner: 'Verizon',     product: 'Nova IVA', stage: 'GA',      target_date: '2025-08-01', actual_date: '2025-07-30', jira: 'PTR-1048', pm: 'Sarah Chen',   se_lead: 'Mike Torres',  csm: 'Dana Wu',     notes: 'GA. Largest Nova IVA deployment. 500K call minutes/day.' },
  { partner: 'Verizon',     product: 'RingCX',   stage: 'Beta',    target_date: '2026-04-15', actual_date: null,         jira: 'PTR-1107', pm: 'Sarah Chen',   se_lead: 'Mike Torres',  csm: 'Dana Wu',     notes: 'Beta with 8 enterprise call centers.' },
  { partner: 'Verizon',     product: 'AIR',      stage: 'EAP',     target_date: '2026-06-30', actual_date: null,         jira: 'PTR-1199', pm: 'Raj Patel',    se_lead: 'Mike Torres',  csm: 'Dana Wu',     notes: 'EAP approved. Real-time transcription pilot live.' },
  { partner: 'Verizon',     product: 'MVP',       stage: 'GA',      target_date: '2024-05-15', actual_date: '2024-05-14', jira: 'PTR-0821', pm: 'James Liu',    se_lead: 'Mike Torres',  csm: 'Dana Wu',     notes: 'GA. Core Verizon Business product.' },
  { partner: 'Verizon',     product: 'ACO',       stage: 'Beta',    target_date: '2026-05-30', actual_date: null,         jira: 'PTR-1224', pm: 'James Liu',    se_lead: 'Mike Torres',  csm: 'Dana Wu',     notes: 'ACO Beta with Verizon One Business.' },

  // ── Versatel ──
  { partner: 'Versatel',    product: 'Nova IVA', stage: 'Blocked', target_date: '2026-01-15', actual_date: null,         jira: 'PTR-1082', pm: 'Sarah Chen',   se_lead: 'Anna Schmidt', csm: 'Tina Braun',  notes: '🚫 Blocked 67 days. SIP trunk compatibility issue unresolved. Versatel network team unresponsive.', daysOverdue: 67, blocked: true },
  { partner: 'Versatel',    product: 'RingCX',   stage: 'N/A',     target_date: null,         actual_date: null,         jira: null,       pm: null,           se_lead: null,            csm: 'Tina Braun',  notes: 'Not in scope.' },
  { partner: 'Versatel',    product: 'AIR',      stage: 'Planned', target_date: '2026-12-15', actual_date: null,         jira: null,       pm: 'Raj Patel',    se_lead: null,            csm: 'Tina Braun',  notes: 'Planned Q4 2026. Dependent on Nova IVA unblocking.' },
  { partner: 'Versatel',    product: 'MVP',       stage: 'Dev',     target_date: '2026-07-01', actual_date: null,         jira: 'GSP-0311', pm: 'James Liu',    se_lead: 'Anna Schmidt', csm: 'Tina Braun',  notes: 'Development proceeding despite Nova IVA block.' },
  { partner: 'Versatel',    product: 'ACO',       stage: 'N/A',     target_date: null,         actual_date: null,         jira: null,       pm: null,           se_lead: null,            csm: 'Tina Braun',  notes: 'Not applicable.' },

  // ── Vodafone ──
  { partner: 'Vodafone',    product: 'Nova IVA', stage: 'Beta',    target_date: '2026-05-01', actual_date: null,         jira: 'PTR-1140', pm: 'Sarah Chen',   se_lead: 'Carlos Reyes', csm: 'Lisa Park',   notes: 'Beta across Vodafone Business UK + DE. 12 enterprise pilots.' },
  { partner: 'Vodafone',    product: 'RingCX',   stage: 'EAP',     target_date: '2026-07-30', actual_date: null,         jira: 'PTR-1196', pm: 'Sarah Chen',   se_lead: 'Carlos Reyes', csm: 'Lisa Park',   notes: 'EAP. Vodafone Business CCaaS replacement evaluation.' },
  { partner: 'Vodafone',    product: 'AIR',      stage: 'Dev',     target_date: '2026-10-15', actual_date: null,         jira: 'GSP-0318', pm: 'Raj Patel',    se_lead: 'Carlos Reyes', csm: 'Lisa Park',   notes: 'Development. Vodafone requesting offline transcription mode.' },
  { partner: 'Vodafone',    product: 'MVP',       stage: 'GA',      target_date: '2025-05-15', actual_date: '2025-05-13', jira: 'PTR-0935', pm: 'James Liu',    se_lead: 'Carlos Reyes', csm: 'Lisa Park',   notes: 'GA across 8 European markets.' },
  { partner: 'Vodafone',    product: 'ACO',       stage: 'N/A',     target_date: null,         actual_date: null,         jira: null,       pm: null,           se_lead: null,            csm: 'Lisa Park',   notes: 'Not in Vodafone roadmap.' },
];

// ─── Changelog (recent status changes) ───────────────────────────────────────
export const CHANGELOG = [
  { date: '2026-03-22', partner: 'AT&T O@H',    product: 'RingCX',   from: 'EAP',     to: 'Beta',    author: 'Sarah Chen',   note: 'Beta approved after successful EAP pilot with 3 enterprise sites.' },
  { date: '2026-03-20', partner: 'Verizon',      product: 'AIR',      from: 'Planned', to: 'EAP',     author: 'Raj Patel',    note: 'EAP launched. Real-time transcription pilot now live.' },
  { date: '2026-03-19', partner: 'RISE Amer',    product: 'AIR',      from: 'EAP',     to: 'Beta',    author: 'Raj Patel',    note: 'Promoted to Beta. Multi-region failover test passed.' },
  { date: '2026-03-18', partner: 'Charter ENT',  product: 'AIR',      from: 'Planned', to: 'EAP',     author: 'Raj Patel',    note: 'Charter ENT EAP approved Q1 2026.' },
  { date: '2026-03-17', partner: 'Versatel',     product: 'Nova IVA', from: 'EAP',     to: 'Blocked', author: 'Sarah Chen',   note: 'BLOCKED: SIP trunk issue escalated. Day 67 without resolution.' },
  { date: '2026-03-15', partner: 'MCM',          product: 'RingCX',   from: 'EAP',     to: 'Beta',    author: 'Sarah Chen',   note: 'MCM RingCX progresses to Beta despite Nova IVA EAP delay.' },
  { date: '2026-03-14', partner: 'BT',           product: 'RingCX',   from: 'Planned', to: 'EAP',     author: 'Sarah Chen',   note: 'BT EAP approval received. EU data residency config started.' },
  { date: '2026-03-12', partner: 'Telus',        product: 'RingCX',   from: 'Planned', to: 'EAP',     author: 'Sarah Chen',   note: 'Telus EAP in progress. CRTC compliance review scheduled.' },
  { date: '2026-03-10', partner: 'Ecotel',       product: 'Nova IVA', from: 'Dev',     to: 'Blocked', author: 'Sarah Chen',   note: 'BLOCKED: Ecotel network upgrade dependency. Day 50 overdue.' },
  { date: '2026-03-08', partner: 'DT',           product: 'RingCX',   from: 'Planned', to: 'EAP',     author: 'Sarah Chen',   note: 'DT EAP approved. German language pack customization started.' },
  { date: '2026-03-05', partner: 'Vodafone',     product: 'RingCX',   from: 'Planned', to: 'EAP',     author: 'Sarah Chen',   note: 'Vodafone Business CCaaS evaluation EAP approved.' },
  { date: '2026-03-01', partner: 'Frontier',     product: 'MVP',      from: 'Dev',     to: 'EAP',     author: 'James Liu',    note: 'Frontier MVP EAP launched. Rural network optimization feature tested.' },
];

// ─── Derived helpers ──────────────────────────────────────────────────────────

/** Look up a release record by partner + product */
export function getRelease(partner, product) {
  return RELEASES.find(r => r.partner === partner && r.product === product) || null;
}

/** Get all releases for a given partner */
export function getPartnerReleases(partner) {
  return RELEASES.filter(r => r.partner === partner);
}

/** Get exception records (blocked, overdue, red accounts, missing PM) */
export function getExceptions() {
  return RELEASES.filter(r =>
    r.blocked || r.redAccount || r.missingPM || (r.daysInEAP && r.daysInEAP > 90)
  );
}

/** Compute summary stats */
export function getSummary() {
  const active = RELEASES.filter(r => r.stage !== 'N/A');
  const counts = {};
  Object.keys(STAGES).forEach(s => { counts[s] = 0; });
  active.forEach(r => { if (counts[r.stage] !== undefined) counts[r.stage]++; });
  return {
    total: active.length,
    byStage: counts,
    blocked: active.filter(r => r.stage === 'Blocked').length,
    redAccounts: active.filter(r => r.redAccount).length,
    missingPM: active.filter(r => r.missingPM).length,
    overdue: active.filter(r => r.daysOverdue > 0).length,
  };
}
