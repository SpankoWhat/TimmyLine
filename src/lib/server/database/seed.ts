import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './index';

// Seed data for initial database setup
export async function seedDatabase() {
	if (!process.env.DATABASE_URL) {
		throw new Error('DATABASE_URL is not set');
	}

	const client = new Database(process.env.DATABASE_URL);
	const db = drizzle(client, { schema });

	console.log('🌱 Seeding database...');

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
	console.log('✓ Event types seeded');

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
	console.log('✓ Action types seeded');

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
	console.log('✓ Relation types seeded');

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
	console.log('✓ Annotation types seeded');

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
	console.log('✓ Entity types seeded');

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
	console.log('✓ Default analyst seeded');

	client.close();
	console.log('🎉 Database seeding completed!');
}

seedDatabase();