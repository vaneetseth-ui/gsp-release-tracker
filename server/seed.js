/**
 * seed.js — Populate SQLite DB from mock data
 * Run: node server/seed.js
 * In production this is replaced by pipeline/sync_gsp_tracker.py
 */
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH   = join(__dirname, '..', 'gsp_tracker.db');
const SQL_PATH  = join(__dirname, 'schema.sql');

const db = new Database(DB_PATH);

// Apply schema
const schema = readFileSync(SQL_PATH, 'utf8');
db.exec(schema);
console.log('✅ Schema applied');

// ── Mock data (mirrors dashboard/src/data/mockData.js) ────────────────────────
const RELEASES = [
  // AT&T O@H
  { partner:'AT&T O@H',  product:'Nova IVA', stage:'GA',      target_date:'2025-09-15', actual_date:'2025-09-12', jira_number:'PTR-1042', pm:'Sarah Chen',  se_lead:'Mike Torres',  csm:'Dana Wu',     notes:'GA. All KPIs green.',                                  blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'AT&T O@H',  product:'RingCX',   stage:'Beta',    target_date:'2026-04-30', actual_date:null,         jira_number:'PTR-1103', pm:'Sarah Chen',  se_lead:'Mike Torres',  csm:'Dana Wu',     notes:'Beta with 3 pilot sites.',                             blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'AT&T O@H',  product:'AIR',      stage:'EAP',     target_date:'2026-06-15', actual_date:null,         jira_number:'PTR-1198', pm:'Raj Patel',   se_lead:'Mike Torres',  csm:'Dana Wu',     notes:'EAP approved. Sandbox provisioned.',                   blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'AT&T O@H',  product:'MVP',      stage:'GA',      target_date:'2024-11-01', actual_date:'2024-10-28', jira_number:'PTR-0881', pm:'James Liu',   se_lead:'Mike Torres',  csm:'Dana Wu',     notes:'Fully live. 2M+ users.',                               blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'AT&T O@H',  product:'ACO',      stage:'N/A',     target_date:null,         actual_date:null,         jira_number:null,       pm:null,          se_lead:null,           csm:'Dana Wu',     notes:'Not in scope.',                                        blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  // Avaya ACO
  { partner:'Avaya ACO', product:'Nova IVA', stage:'EAP',     target_date:'2026-03-01', actual_date:null,         jira_number:'PTR-1154', pm:'Sarah Chen',  se_lead:'Priya Nair',   csm:'Tom Blake',   notes:'102 days in EAP. Flag for review.',                    blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:102,  arr_at_risk:null },
  { partner:'Avaya ACO', product:'RingCX',   stage:'N/A',     target_date:null,         actual_date:null,         jira_number:null,       pm:null,          se_lead:null,           csm:'Tom Blake',   notes:'Not applicable.',                                      blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Avaya ACO', product:'AIR',      stage:'Dev',     target_date:'2026-07-30', actual_date:null,         jira_number:'GSP-0231', pm:'Raj Patel',   se_lead:'Priya Nair',   csm:'Tom Blake',   notes:'Dev started Q1 2026.',                                 blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Avaya ACO', product:'MVP',      stage:'N/A',     target_date:null,         actual_date:null,         jira_number:null,       pm:null,          se_lead:null,           csm:'Tom Blake',   notes:'Not applicable.',                                      blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Avaya ACO', product:'ACO',      stage:'Beta',    target_date:'2026-05-15', actual_date:null,         jira_number:'PTR-1201', pm:'James Liu',   se_lead:'Priya Nair',   csm:'Tom Blake',   notes:'Beta with Avaya enterprise.',                          blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  // BT
  { partner:'BT',        product:'Nova IVA', stage:'Beta',    target_date:'2026-04-01', actual_date:null,         jira_number:'PTR-1112', pm:'Sarah Chen',  se_lead:'Carlos Reyes', csm:'Lisa Park',   notes:'Beta with 5 UK enterprise accounts.',                  blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'BT',        product:'RingCX',   stage:'EAP',     target_date:'2026-05-30', actual_date:null,         jira_number:'PTR-1178', pm:'Sarah Chen',  se_lead:'Carlos Reyes', csm:'Lisa Park',   notes:'EAP. EU data residency in progress.',                  blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'BT',        product:'AIR',      stage:'Planned', target_date:'2026-09-30', actual_date:null,         jira_number:'GSP-0189', pm:'Raj Patel',   se_lead:'Carlos Reyes', csm:'Lisa Park',   notes:'Planned Q3 2026.',                                     blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'BT',        product:'MVP',      stage:'GA',      target_date:'2025-03-15', actual_date:'2025-03-18', jira_number:'PTR-0912', pm:'James Liu',   se_lead:'Carlos Reyes', csm:'Lisa Park',   notes:'GA. 850K users.',                                      blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'BT',        product:'ACO',      stage:'N/A',     target_date:null,         actual_date:null,         jira_number:null,       pm:null,          se_lead:null,           csm:'Lisa Park',   notes:'Not in BT roadmap.',                                   blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  // Charter ENT
  { partner:'Charter ENT', product:'Nova IVA', stage:'GA',    target_date:'2025-11-01', actual_date:'2025-10-30', jira_number:'PTR-1055', pm:'Sarah Chen',  se_lead:'Kim Nguyen',   csm:'Paul Adams',  notes:'GA. Strong hospitality vertical.',                     blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Charter ENT', product:'RingCX',   stage:'Dev',   target_date:'2026-08-15', actual_date:null,         jira_number:'GSP-0244', pm:'Sarah Chen',  se_lead:'Kim Nguyen',   csm:'Paul Adams',  notes:'Dev. Custom CCaaS integration req.',                   blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Charter ENT', product:'AIR',      stage:'EAP',   target_date:'2026-06-01', actual_date:null,         jira_number:'PTR-1204', pm:'Raj Patel',   se_lead:'Kim Nguyen',   csm:'Paul Adams',  notes:'EAP began March 2026.',                                blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Charter ENT', product:'MVP',      stage:'GA',    target_date:'2024-09-01', actual_date:'2024-08-28', jira_number:'PTR-0867', pm:'James Liu',   se_lead:'Kim Nguyen',   csm:'Paul Adams',  notes:'Fully live.',                                          blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Charter ENT', product:'ACO',      stage:'N/A',   target_date:null,         actual_date:null,         jira_number:null,       pm:null,          se_lead:null,           csm:'Paul Adams',  notes:'Not applicable.',                                      blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  // Charter SMB
  { partner:'Charter SMB', product:'Nova IVA', stage:'Planned', target_date:'2026-10-01', actual_date:null,       jira_number:'GSP-0255', pm:'Sarah Chen',  se_lead:'Kim Nguyen',   csm:'Paul Adams',  notes:'Planned Q4 2026.',                                     blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Charter SMB', product:'RingCX',   stage:'N/A',   target_date:null,         actual_date:null,         jira_number:null,       pm:null,          se_lead:null,           csm:'Paul Adams',  notes:'SMB: not in scope.',                                   blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Charter SMB', product:'AIR',      stage:'Dev',   target_date:'2026-09-15', actual_date:null,         jira_number:'GSP-0261', pm:'Raj Patel',   se_lead:'Kim Nguyen',   csm:'Paul Adams',  notes:'SMB packaging under review.',                          blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Charter SMB', product:'MVP',      stage:'Beta',  target_date:'2026-05-01', actual_date:null,         jira_number:'PTR-1215', pm:'James Liu',   se_lead:'Kim Nguyen',   csm:'Paul Adams',  notes:'Beta with 10 pilot accounts.',                         blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Charter SMB', product:'ACO',      stage:'N/A',   target_date:null,         actual_date:null,         jira_number:null,       pm:null,          se_lead:null,           csm:'Paul Adams',  notes:'Not applicable.',                                      blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  // DT
  { partner:'DT',          product:'Nova IVA', stage:'Beta',  target_date:'2026-05-15', actual_date:null,         jira_number:'PTR-1122', pm:'Sarah Chen',  se_lead:'Anna Schmidt', csm:'Eric Müller', notes:'Beta. GDPR review in progress.',                       blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'DT',          product:'RingCX',   stage:'EAP',   target_date:'2026-07-01', actual_date:null,         jira_number:'PTR-1188', pm:'Sarah Chen',  se_lead:'Anna Schmidt', csm:'Eric Müller', notes:'EAP. German language pack in progress.',               blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'DT',          product:'AIR',      stage:'Dev',   target_date:'2026-10-01', actual_date:null,         jira_number:'GSP-0271', pm:'Raj Patel',   se_lead:'Anna Schmidt', csm:'Eric Müller', notes:'Dev. EU AI Act assessment pending.',                   blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'DT',          product:'MVP',      stage:'GA',    target_date:'2025-01-15', actual_date:'2025-01-10', jira_number:'PTR-0895', pm:'James Liu',   se_lead:'Anna Schmidt', csm:'Eric Müller', notes:'GA. 1.2M business users.',                             blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'DT',          product:'ACO',      stage:'N/A',   target_date:null,         actual_date:null,         jira_number:null,       pm:null,          se_lead:null,           csm:'Eric Müller', notes:'Not in DT roadmap.',                                   blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  // DT-Unify
  { partner:'DT-Unify',    product:'Nova IVA', stage:'EAP',   target_date:'2026-04-15', actual_date:null,         jira_number:'PTR-1166', pm:null,          se_lead:'Anna Schmidt', csm:'Eric Müller', notes:'EAP in progress. PM unassigned.',                      blocked:0, red_account:0, missing_pm:1, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'DT-Unify',    product:'RingCX',   stage:'Dev',   target_date:'2026-08-30', actual_date:null,         jira_number:'GSP-0278', pm:null,          se_lead:'Anna Schmidt', csm:'Eric Müller', notes:'Dev. PM assignment pending.',                          blocked:0, red_account:0, missing_pm:1, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'DT-Unify',    product:'AIR',      stage:'Planned', target_date:'2027-01-01', actual_date:null,       jira_number:null,       pm:null,          se_lead:null,           csm:'Eric Müller', notes:'Planned 2027.',                                        blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'DT-Unify',    product:'MVP',      stage:'Beta',  target_date:'2026-06-01', actual_date:null,         jira_number:'PTR-1219', pm:'James Liu',   se_lead:'Anna Schmidt', csm:'Eric Müller', notes:'Beta underway.',                                       blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'DT-Unify',    product:'ACO',      stage:'N/A',   target_date:null,         actual_date:null,         jira_number:null,       pm:null,          se_lead:null,           csm:'Eric Müller', notes:'Not applicable.',                                      blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  // Ecotel
  { partner:'Ecotel',      product:'Nova IVA', stage:'Blocked', target_date:'2026-02-01', actual_date:null,       jira_number:'PTR-1091', pm:'Sarah Chen',  se_lead:'Anna Schmidt', csm:'Tina Braun',  notes:'Blocked 50 days. Network upgrade dependency. Escalated to VP Eng.', blocked:1, red_account:0, missing_pm:0, days_overdue:50, days_in_eap:null, arr_at_risk:null },
  { partner:'Ecotel',      product:'RingCX',   stage:'N/A',   target_date:null,         actual_date:null,         jira_number:null,       pm:null,          se_lead:null,           csm:'Tina Braun',  notes:'Not in scope.',                                        blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Ecotel',      product:'AIR',      stage:'N/A',   target_date:null,         actual_date:null,         jira_number:null,       pm:null,          se_lead:null,           csm:'Tina Braun',  notes:'Not in scope.',                                        blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Ecotel',      product:'MVP',      stage:'EAP',   target_date:'2026-05-01', actual_date:null,         jira_number:'PTR-1207', pm:'James Liu',   se_lead:'Anna Schmidt', csm:'Tina Braun',  notes:'EAP proceeding normally.',                             blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Ecotel',      product:'ACO',      stage:'N/A',   target_date:null,         actual_date:null,         jira_number:null,       pm:null,          se_lead:null,           csm:'Tina Braun',  notes:'Not applicable.',                                      blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  // Frontier
  { partner:'Frontier',    product:'Nova IVA', stage:'Beta',  target_date:'2026-04-30', actual_date:null,         jira_number:'PTR-1130', pm:'Sarah Chen',  se_lead:'Luis Garcia',  csm:'Amy Ross',    notes:'Beta. SMB adoption exceeding forecast.',               blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Frontier',    product:'RingCX',   stage:'N/A',   target_date:null,         actual_date:null,         jira_number:null,       pm:null,          se_lead:null,           csm:'Amy Ross',    notes:'Not in roadmap.',                                      blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Frontier',    product:'AIR',      stage:'Dev',   target_date:'2026-09-01', actual_date:null,         jira_number:'GSP-0289', pm:'Raj Patel',   se_lead:'Luis Garcia',  csm:'Amy Ross',    notes:'Dev. Rural network optimization req.',                 blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Frontier',    product:'MVP',      stage:'EAP',   target_date:'2026-05-30', actual_date:null,         jira_number:'PTR-1209', pm:'James Liu',   se_lead:'Luis Garcia',  csm:'Amy Ross',    notes:'EAP in progress. Good velocity.',                      blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Frontier',    product:'ACO',      stage:'N/A',   target_date:null,         actual_date:null,         jira_number:null,       pm:null,          se_lead:null,           csm:'Amy Ross',    notes:'Not applicable.',                                      blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  // MCM
  { partner:'MCM',         product:'Nova IVA', stage:'EAP',   target_date:'2026-02-15', actual_date:null,         jira_number:'PTR-1098', pm:'Sarah Chen',  se_lead:'Carlos Reyes', csm:'Ben Hall',    notes:'102 days in EAP. SFDC red account — $1.2M ARR at risk.',blocked:0, red_account:1, missing_pm:0, days_overdue:null, days_in_eap:102,  arr_at_risk:1200000 },
  { partner:'MCM',         product:'RingCX',   stage:'Beta',  target_date:'2026-06-30', actual_date:null,         jira_number:'PTR-1192', pm:'Sarah Chen',  se_lead:'Carlos Reyes', csm:'Ben Hall',    notes:'Beta on track.',                                       blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'MCM',         product:'AIR',      stage:'Planned', target_date:'2026-12-01', actual_date:null,       jira_number:null,       pm:'Raj Patel',   se_lead:null,           csm:'Ben Hall',    notes:'Planned Q4 2026.',                                     blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'MCM',         product:'MVP',      stage:'GA',    target_date:'2025-06-01', actual_date:'2025-05-29', jira_number:'PTR-0942', pm:'James Liu',   se_lead:'Carlos Reyes', csm:'Ben Hall',    notes:'GA. Stable.',                                          blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'MCM',         product:'ACO',      stage:'N/A',   target_date:null,         actual_date:null,         jira_number:null,       pm:null,          se_lead:null,           csm:'Ben Hall',    notes:'Not applicable.',                                      blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  // RISE Amer
  { partner:'RISE Amer',   product:'Nova IVA', stage:'GA',    target_date:'2025-10-01', actual_date:'2025-09-28', jira_number:'PTR-1063', pm:'Sarah Chen',  se_lead:'Luis Garcia',  csm:'Nina Ford',   notes:'GA. Americas rollout complete.',                       blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'RISE Amer',   product:'RingCX',   stage:'GA',    target_date:'2025-12-15', actual_date:'2025-12-12', jira_number:'PTR-1079', pm:'Sarah Chen',  se_lead:'Luis Garcia',  csm:'Nina Ford',   notes:'GA. Strongest performing partner.',                    blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'RISE Amer',   product:'AIR',      stage:'Beta',  target_date:'2026-05-01', actual_date:null,         jira_number:'PTR-1145', pm:'Raj Patel',   se_lead:'Luis Garcia',  csm:'Nina Ford',   notes:'Beta. Multi-region failover passed.',                  blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'RISE Amer',   product:'MVP',      stage:'GA',    target_date:'2024-07-01', actual_date:'2024-06-25', jira_number:'PTR-0842', pm:'James Liu',   se_lead:'Luis Garcia',  csm:'Nina Ford',   notes:'Flagship MVP deployment.',                             blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'RISE Amer',   product:'ACO',      stage:'N/A',   target_date:null,         actual_date:null,         jira_number:null,       pm:null,          se_lead:null,           csm:'Nina Ford',   notes:'Not in scope.',                                        blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  // RISE Int'l
  { partner:"RISE Int'l",  product:'Nova IVA', stage:'EAP',   target_date:'2026-05-01', actual_date:null,         jira_number:'PTR-1160', pm:'Sarah Chen',  se_lead:'Priya Nair',   csm:'Nina Ford',   notes:'Intl EAP. Multi-language testing.',                    blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:"RISE Int'l",  product:'RingCX',   stage:'Dev',   target_date:'2026-09-30', actual_date:null,         jira_number:'GSP-0298', pm:'Sarah Chen',  se_lead:'Priya Nair',   csm:'Nina Ford',   notes:'Dev. APAC data residency complex.',                    blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:"RISE Int'l",  product:'AIR',      stage:'Planned', target_date:'2027-01-15', actual_date:null,       jira_number:null,       pm:'Raj Patel',   se_lead:null,           csm:'Nina Ford',   notes:'Planned 2027. 6-country regulatory approval.',        blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:"RISE Int'l",  product:'MVP',      stage:'Beta',  target_date:'2026-06-15', actual_date:null,         jira_number:'PTR-1222', pm:'James Liu',   se_lead:'Priya Nair',   csm:'Nina Ford',   notes:'Beta in APAC.',                                        blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:"RISE Int'l",  product:'ACO',      stage:'N/A',   target_date:null,         actual_date:null,         jira_number:null,       pm:null,          se_lead:null,           csm:'Nina Ford',   notes:'Not applicable.',                                      blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  // Telus
  { partner:'Telus',       product:'Nova IVA', stage:'Beta',  target_date:'2026-05-15', actual_date:null,         jira_number:'PTR-1135', pm:'Sarah Chen',  se_lead:'Kim Nguyen',   csm:'Marc Dubois', notes:'Beta. French language pack ready.',                    blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Telus',       product:'RingCX',   stage:'EAP',   target_date:'2026-07-15', actual_date:null,         jira_number:'PTR-1193', pm:'Sarah Chen',  se_lead:'Kim Nguyen',   csm:'Marc Dubois', notes:'EAP. CRTC compliance scheduled.',                      blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Telus',       product:'AIR',      stage:'Dev',   target_date:'2026-10-30', actual_date:null,         jira_number:'GSP-0305', pm:'Raj Patel',   se_lead:'Kim Nguyen',   csm:'Marc Dubois', notes:'Dev. Canadian privacy review pending.',                blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Telus',       product:'MVP',      stage:'GA',    target_date:'2025-04-01', actual_date:'2025-04-03', jira_number:'PTR-0921', pm:'James Liu',   se_lead:'Kim Nguyen',   csm:'Marc Dubois', notes:'GA in Canada.',                                        blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Telus',       product:'ACO',      stage:'N/A',   target_date:null,         actual_date:null,         jira_number:null,       pm:null,          se_lead:null,           csm:'Marc Dubois', notes:'Not in Telus roadmap.',                                blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  // Unify
  { partner:'Unify',       product:'Nova IVA', stage:'Planned', target_date:'2026-11-01', actual_date:null,       jira_number:null,       pm:'Sarah Chen',  se_lead:null,           csm:'Eric Müller', notes:'Planned Q4 2026.',                                     blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Unify',       product:'RingCX',   stage:'N/A',   target_date:null,         actual_date:null,         jira_number:null,       pm:null,          se_lead:null,           csm:'Eric Müller', notes:'Not in roadmap.',                                      blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Unify',       product:'AIR',      stage:'N/A',   target_date:null,         actual_date:null,         jira_number:null,       pm:null,          se_lead:null,           csm:'Eric Müller', notes:'Not applicable.',                                      blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Unify',       product:'MVP',      stage:'EAP',   target_date:'2026-06-30', actual_date:null,         jira_number:'PTR-1213', pm:'James Liu',   se_lead:'Anna Schmidt', csm:'Eric Müller', notes:'EAP with Unify Connect pilot.',                        blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Unify',       product:'ACO',      stage:'N/A',   target_date:null,         actual_date:null,         jira_number:null,       pm:null,          se_lead:null,           csm:'Eric Müller', notes:'Not applicable.',                                      blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  // Verizon
  { partner:'Verizon',     product:'Nova IVA', stage:'GA',    target_date:'2025-08-01', actual_date:'2025-07-30', jira_number:'PTR-1048', pm:'Sarah Chen',  se_lead:'Mike Torres',  csm:'Dana Wu',     notes:'GA. 500K call minutes/day.',                           blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Verizon',     product:'RingCX',   stage:'Beta',  target_date:'2026-04-15', actual_date:null,         jira_number:'PTR-1107', pm:'Sarah Chen',  se_lead:'Mike Torres',  csm:'Dana Wu',     notes:'Beta with 8 enterprise call centers.',                 blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Verizon',     product:'AIR',      stage:'EAP',   target_date:'2026-06-30', actual_date:null,         jira_number:'PTR-1199', pm:'Raj Patel',   se_lead:'Mike Torres',  csm:'Dana Wu',     notes:'EAP. Real-time transcription pilot live.',             blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Verizon',     product:'MVP',      stage:'GA',    target_date:'2024-05-15', actual_date:'2024-05-14', jira_number:'PTR-0821', pm:'James Liu',   se_lead:'Mike Torres',  csm:'Dana Wu',     notes:'GA. Core Verizon Business product.',                   blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Verizon',     product:'ACO',      stage:'Beta',  target_date:'2026-05-30', actual_date:null,         jira_number:'PTR-1224', pm:'James Liu',   se_lead:'Mike Torres',  csm:'Dana Wu',     notes:'ACO Beta with Verizon One Business.',                  blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  // Versatel
  { partner:'Versatel',    product:'Nova IVA', stage:'Blocked', target_date:'2026-01-15', actual_date:null,       jira_number:'PTR-1082', pm:'Sarah Chen',  se_lead:'Anna Schmidt', csm:'Tina Braun',  notes:'Blocked 67 days. SIP trunk issue. Network team unresponsive.', blocked:1, red_account:0, missing_pm:0, days_overdue:67, days_in_eap:null, arr_at_risk:null },
  { partner:'Versatel',    product:'RingCX',   stage:'N/A',   target_date:null,         actual_date:null,         jira_number:null,       pm:null,          se_lead:null,           csm:'Tina Braun',  notes:'Not in scope.',                                        blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Versatel',    product:'AIR',      stage:'Planned', target_date:'2026-12-15', actual_date:null,       jira_number:null,       pm:'Raj Patel',   se_lead:null,           csm:'Tina Braun',  notes:'Planned Q4 2026. Dependent on Nova IVA unblocking.',  blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Versatel',    product:'MVP',      stage:'Dev',   target_date:'2026-07-01', actual_date:null,         jira_number:'GSP-0311', pm:'James Liu',   se_lead:'Anna Schmidt', csm:'Tina Braun',  notes:'Dev proceeding despite Nova IVA block.',               blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Versatel',    product:'ACO',      stage:'N/A',   target_date:null,         actual_date:null,         jira_number:null,       pm:null,          se_lead:null,           csm:'Tina Braun',  notes:'Not applicable.',                                      blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  // Vodafone
  { partner:'Vodafone',    product:'Nova IVA', stage:'Beta',  target_date:'2026-05-01', actual_date:null,         jira_number:'PTR-1140', pm:'Sarah Chen',  se_lead:'Carlos Reyes', csm:'Lisa Park',   notes:'Beta UK + DE. 12 enterprise pilots.',                  blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Vodafone',    product:'RingCX',   stage:'EAP',   target_date:'2026-07-30', actual_date:null,         jira_number:'PTR-1196', pm:'Sarah Chen',  se_lead:'Carlos Reyes', csm:'Lisa Park',   notes:'EAP. CCaaS replacement evaluation.',                   blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Vodafone',    product:'AIR',      stage:'Dev',   target_date:'2026-10-15', actual_date:null,         jira_number:'GSP-0318', pm:'Raj Patel',   se_lead:'Carlos Reyes', csm:'Lisa Park',   notes:'Dev. Offline transcription mode requested.',           blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Vodafone',    product:'MVP',      stage:'GA',    target_date:'2025-05-15', actual_date:'2025-05-13', jira_number:'PTR-0935', pm:'James Liu',   se_lead:'Carlos Reyes', csm:'Lisa Park',   notes:'GA across 8 European markets.',                        blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
  { partner:'Vodafone',    product:'ACO',      stage:'N/A',   target_date:null,         actual_date:null,         jira_number:null,       pm:null,          se_lead:null,           csm:'Lisa Park',   notes:'Not in Vodafone roadmap.',                             blocked:0, red_account:0, missing_pm:0, days_overdue:null, days_in_eap:null, arr_at_risk:null },
];

const CHANGELOG = [
  { change_date:'2026-03-22', partner:'AT&T O@H',    product:'RingCX',   from_stage:'EAP',     to_stage:'Beta',    author:'Sarah Chen',  note:'Beta approved after successful EAP pilot.' },
  { change_date:'2026-03-20', partner:'Verizon',      product:'AIR',      from_stage:'Planned', to_stage:'EAP',     author:'Raj Patel',   note:'EAP launched. Real-time transcription pilot now live.' },
  { change_date:'2026-03-19', partner:'RISE Amer',    product:'AIR',      from_stage:'EAP',     to_stage:'Beta',    author:'Raj Patel',   note:'Promoted to Beta. Multi-region failover test passed.' },
  { change_date:'2026-03-18', partner:'Charter ENT',  product:'AIR',      from_stage:'Planned', to_stage:'EAP',     author:'Raj Patel',   note:'Charter ENT EAP approved Q1 2026.' },
  { change_date:'2026-03-17', partner:'Versatel',     product:'Nova IVA', from_stage:'EAP',     to_stage:'Blocked', author:'Sarah Chen',  note:'BLOCKED: SIP trunk issue escalated. Day 67 without resolution.' },
  { change_date:'2026-03-15', partner:'MCM',          product:'RingCX',   from_stage:'EAP',     to_stage:'Beta',    author:'Sarah Chen',  note:'MCM RingCX progresses to Beta despite Nova IVA delay.' },
  { change_date:'2026-03-14', partner:'BT',           product:'RingCX',   from_stage:'Planned', to_stage:'EAP',     author:'Sarah Chen',  note:'BT EAP approval received. EU data residency config started.' },
  { change_date:'2026-03-12', partner:'Telus',        product:'RingCX',   from_stage:'Planned', to_stage:'EAP',     author:'Sarah Chen',  note:'Telus EAP in progress. CRTC compliance review scheduled.' },
  { change_date:'2026-03-10', partner:'Ecotel',       product:'Nova IVA', from_stage:'Dev',     to_stage:'Blocked', author:'Sarah Chen',  note:'BLOCKED: Ecotel network upgrade dependency. Day 50 overdue.' },
  { change_date:'2026-03-08', partner:'DT',           product:'RingCX',   from_stage:'Planned', to_stage:'EAP',     author:'Sarah Chen',  note:'DT EAP approved. German language pack customization started.' },
  { change_date:'2026-03-05', partner:'Vodafone',     product:'RingCX',   from_stage:'Planned', to_stage:'EAP',     author:'Sarah Chen',  note:'Vodafone CCaaS evaluation EAP approved.' },
  { change_date:'2026-03-01', partner:'Frontier',     product:'MVP',      from_stage:'Dev',     to_stage:'EAP',     author:'James Liu',   note:'Frontier MVP EAP launched. Rural optimization tested.' },
];

// ── Insert data ───────────────────────────────────────────────────────────────
const insertRelease = db.prepare(`
  INSERT OR REPLACE INTO releases
    (partner, product, stage, target_date, actual_date, jira_number, pm, se_lead, csm,
     notes, blocked, red_account, missing_pm, days_overdue, days_in_eap, arr_at_risk, source)
  VALUES
    (@partner, @product, @stage, @target_date, @actual_date, @jira_number, @pm, @se_lead, @csm,
     @notes, @blocked, @red_account, @missing_pm, @days_overdue, @days_in_eap, @arr_at_risk, 'seed')
`);

const insertChange = db.prepare(`
  INSERT INTO changelog (change_date, partner, product, from_stage, to_stage, author, note, source)
  VALUES (@change_date, @partner, @product, @from_stage, @to_stage, @author, @note, 'seed')
`);

const seedAll = db.transaction(() => {
  // Clear existing seed data
  db.prepare("DELETE FROM releases WHERE source = 'seed'").run();
  db.prepare("DELETE FROM changelog WHERE source = 'seed'").run();

  for (const r of RELEASES) insertRelease.run(r);
  for (const c of CHANGELOG) insertChange.run(c);
});

seedAll();

const rCount = db.prepare('SELECT COUNT(*) as n FROM releases').get().n;
const cCount = db.prepare('SELECT COUNT(*) as n FROM changelog').get().n;
console.log(`✅ Seeded ${rCount} releases, ${cCount} changelog entries`);
console.log(`   DB: ${DB_PATH}`);

// Log the seed run
db.prepare(`INSERT INTO sync_log (source, records_in, records_out, status, message)
            VALUES ('seed', ?, ?, 'ok', 'Initial seed from mock data')`)
  .run(RELEASES.length, rCount);

db.close();
console.log('✅ Done — gsp_tracker.db ready');
