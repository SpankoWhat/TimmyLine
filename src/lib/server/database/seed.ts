import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './index';
import { dbLogger as logger } from '../logging';
import { DATABASE_URL } from '$env/static/private';

const moduleFilePath = import.meta.url.replace('file://', '').replace(/%20/g, ' ');
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
	process.exit(1);
}

logger.info('Executing database seeding script directly');
seedDatabase();