/**
 * Incident Export HTML Template Engine
 *
 * Generates a single self-contained interactive HTML file from an ExportPayload.
 * Includes all CSS (terminal aesthetic), data (embedded JSON), and vanilla JS
 * for expand/collapse, tabs, accordions, JSON syntax highlighting, and
 * relationship tree rendering.
 */

import type { ExportPayload } from './exportIncident';

/**
 * Renders the export payload into a complete self-contained HTML string.
 */
export function renderExportHtml(payload: ExportPayload): string {
	const dataJson = JSON.stringify(payload);
	const incidentTitle = escapeHtml(payload.incident.title);
	const exportDate = new Date(payload.exportedAt).toLocaleString('en-US', {
		year: 'numeric', month: '2-digit', day: '2-digit',
		hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
	});

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TimmyLine Export — ${incidentTitle}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>${getStyles()}</style>
</head>
<body>
<div id="app">
	<!-- Header -->
	<header class="export-header">
		<div class="header-left">
			<span class="app-name">TimmyLine</span>
			<span class="header-divider">│</span>
			<span class="incident-title">${incidentTitle}</span>
		</div>
		<div class="header-right">
			<span class="header-meta">Status: <strong>${escapeHtml(payload.incident.status)}</strong></span>
			<span class="header-divider">│</span>
			<span class="header-meta">Priority: <strong>${escapeHtml(payload.incident.priority)}</strong></span>
			<span class="header-divider">│</span>
			<span class="header-meta">Exported: ${exportDate}</span>
		</div>
	</header>

	<!-- Stats Bar -->
	<div class="stats-bar">
		<div class="stat-card success">
			<span class="stat-label">Total</span>
			<span class="stat-value">${payload.stats.totalItems}</span>
		</div>
		<span class="stat-divider">|</span>
		<div class="stat-card info">
			<span class="stat-label">Events</span>
			<span class="stat-value">${payload.stats.events}</span>
		</div>
		<div class="stat-card info">
			<span class="stat-label">Actions</span>
			<span class="stat-value">${payload.stats.actions}</span>
		</div>
		<span class="stat-divider">|</span>
		<div class="stat-card info">
			<span class="stat-label">Entities</span>
			<span class="stat-value">${payload.stats.entities}</span>
		</div>
		<div class="stat-card info">
			<span class="stat-label">Annotations</span>
			<span class="stat-value">${payload.stats.annotations}</span>
		</div>
	</div>

	<!-- Main Content -->
	<div class="main-content">
		<!-- Timeline Section -->
		<div class="timeline-section">
			<div class="section-header">
				<span>Timeline Events</span>
				<div class="header-actions">
					<button class="toggle-btn" id="toggleEntitiesBtn" onclick="toggleEntitiesPanel()">◆ Entities</button>
				</div>
			</div>
			<div class="section-content">
				<div id="timelineList" class="timeline-list"></div>
			</div>
		</div>

		<!-- Entities/Annotations Sidebar -->
		<div id="entitiesPanel" class="entities-panel hidden">
			<div class="panel-container">
				<div class="tab-headers">
					<button class="tab-btn active" data-tab="entities" onclick="switchTab('entities')">
						<span class="tab-icon">◆</span> Entities
						<span class="tab-count" id="entitiesCount">0</span>
					</button>
					<button class="tab-btn" data-tab="annotations" onclick="switchTab('annotations')">
						<span class="tab-icon">◇</span> Annotations
						<span class="tab-count" id="annotationsCount">0</span>
					</button>
				</div>
				<div class="tab-content" id="entitiesTabContent"></div>
				<div class="tab-content hidden" id="annotationsTabContent"></div>
			</div>
		</div>
	</div>
</div>

<script>
// ============================================================================
// EMBEDDED DATA
// ============================================================================
const DATA = ${dataJson};

// ============================================================================
// DISPLAY FIELD CONFIGURATION (mirrors displayFieldsConfig.ts)
// ============================================================================
const displayFieldsConfig = {
	event: [
		{ key: 'event_type', label: 'Event Type', pinned: true, showInNote: false, order: 1 },
		{ key: 'severity', label: 'Severity', pinned: true, showInNote: false, order: 2 },
		{ key: 'source', label: 'Source', pinned: true, showInNote: false, order: 3 },
		{ key: 'source_reliability', label: 'Reliability', pinned: true, showInNote: false, order: 4 },
		{ key: 'notes', label: 'Notes', pinned: false, showInNote: true, order: 100, hideFromUser: true },
		{ key: 'event_data', label: 'Event Data', pinned: false, showInNote: false, order: 105, allowDynamicFieldRendering: true, hideFromUser: true },
		{ key: 'confidence', label: 'Confidence', pinned: false, showInNote: false, order: 101 },
		{ key: 'occurred_at', label: 'Occurred At', pinned: false, showInNote: false, order: 102 },
		{ key: 'discovered_at', label: 'Discovered At', pinned: false, showInNote: false, order: 103 },
		{ key: 'tags', label: 'Tags', pinned: false, showInNote: false, order: 104 },
	],
	action: [
		{ key: 'action_type', label: 'Action Type', pinned: true, showInNote: false, order: 1 },
		{ key: 'result', label: 'Result', pinned: true, showInNote: false, order: 2 },
		{ key: 'tool_used', label: 'Tool', pinned: true, showInNote: false, order: 3 },
		{ key: 'notes', label: 'Notes', pinned: false, showInNote: true, order: 100, hideFromUser: true },
		{ key: 'outcome', label: 'Outcome', pinned: false, showInNote: false, order: 101 },
		{ key: 'next_steps', label: 'Next Steps', pinned: false, showInNote: false, order: 102 },
		{ key: 'performed_at', label: 'Performed At', pinned: false, showInNote: false, order: 103 },
		{ key: 'action_data', label: 'Action Data', pinned: false, showInNote: false, order: 104, allowDynamicFieldRendering: true, hideFromUser: true },
		{ key: 'tags', label: 'Tags', pinned: false, showInNote: false, order: 105 },
	]
};

// ============================================================================
// UTILITY FUNCTIONS (ported from dynamicFields.ts)
// ============================================================================

function formatDynamicValue(value) {
	if (value === null || value === undefined) return '—';
	if (Array.isArray(value)) return value.map(v => formatDynamicValue(v)).join(', ');
	if (typeof value === 'object') return JSON.stringify(value);
	return String(value);
}

function safeJsonParse(jsonString) {
	if (!jsonString || typeof jsonString !== 'string') return null;
	try {
		const parsed = JSON.parse(jsonString);
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
		return null;
	} catch { return null; }
}

function getNestedValue(obj, path) {
	const parts = path.split('.');
	let current = obj;
	for (const part of parts) {
		if (current === null || current === undefined) return undefined;
		if (typeof current === 'object') { current = current[part]; } else { return undefined; }
	}
	return current;
}

function getFieldValue(data, field) {
	if (field.isDynamic && field.parentKey) {
		const parsed = safeJsonParse(data[field.parentKey]);
		if (parsed) {
			const subKey = field.key.replace(field.parentKey + '.', '');
			return formatDynamicValue(getNestedValue(parsed, subKey));
		}
		return '—';
	}
	const value = data[field.key];
	if (field.allowDynamicFieldRendering) {
		const parsed = safeJsonParse(value);
		if (parsed) return '{' + Object.keys(parsed).length + ' fields}';
	}
	return formatDynamicValue(value);
}

function discoverDynamicFields(items, fieldConfig, itemType) {
	const discoveredFields = new Map();
	const seenKeys = new Map();
	const dynamicParentFields = fieldConfig[itemType].filter(f => f.allowDynamicFieldRendering);
	if (dynamicParentFields.length === 0) return discoveredFields;
	for (const pf of dynamicParentFields) {
		seenKeys.set(pf.key, new Set());
		discoveredFields.set(pf.key, []);
	}
	for (const item of items) {
		if (item.type !== itemType) continue;
		for (const pf of dynamicParentFields) {
			const parsed = safeJsonParse(item.data[pf.key]);
			if (parsed) {
				const seen = seenKeys.get(pf.key);
				for (const subKey of Object.keys(parsed)) {
					if (!seen.has(subKey)) {
						seen.add(subKey);
						discoveredFields.get(pf.key).push({
							key: pf.key + '.' + subKey,
							label: subKey.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\\b\\w/g, c => c.toUpperCase()),
							pinned: true,
							showInNote: false,
							order: pf.order + seen.size,
							isDynamic: true,
							parentKey: pf.key
						});
					}
				}
			}
		}
	}
	return discoveredFields;
}

function mergeFieldConfigs(staticConfig, dynamicFieldsMap) {
	const result = [];
	for (const field of staticConfig) {
		result.push({ ...field });
		if (field.allowDynamicFieldRendering && dynamicFieldsMap.has(field.key)) {
			for (const df of dynamicFieldsMap.get(field.key)) {
				result.push({ ...df });
			}
		}
	}
	return result;
}

// ============================================================================
// FORMATTING
// ============================================================================

function formatTimestamp(epochTime) {
	if (!epochTime) return 'N/A';
	const ts = epochTime.toString().length === 10 ? epochTime * 1000 : epochTime;
	const date = new Date(ts);
	if (isNaN(date.getTime())) return 'Invalid Date';
	return date.toLocaleString('en-US', {
		year: 'numeric', month: '2-digit', day: '2-digit',
		hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
	});
}

function escapeHtml(str) {
	if (!str) return '';
	return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============================================================================
// JSON VIEWER (ported from JsonViewer.svelte)
// ============================================================================

function tokenizeJsonLine(line) {
	const tokens = [];
	let i = 0;
	while (i < line.length) {
		const ch = line[i];
		if (ch === ' ' || ch === '\\t') {
			let ws = '';
			while (i < line.length && (line[i] === ' ' || line[i] === '\\t')) { ws += line[i]; i++; }
			tokens.push({ type: 'punctuation', text: ws });
			continue;
		}
		if ('{}[],:'.includes(ch)) { tokens.push({ type: 'punctuation', text: ch }); i++; continue; }
		if (ch === '"') {
			let str = '"'; i++;
			while (i < line.length && line[i] !== '"') {
				if (line[i] === '\\\\') { str += line[i] + (line[i+1] || ''); i += 2; }
				else { str += line[i]; i++; }
			}
			str += '"'; i++;
			let la = i;
			while (la < line.length && (line[la] === ' ' || line[la] === '\\t')) la++;
			const isKey = la < line.length && line[la] === ':';
			tokens.push({ type: isKey ? 'key' : 'string', text: str });
			continue;
		}
		if (ch === '-' || (ch >= '0' && ch <= '9')) {
			let num = '';
			while (i < line.length && /[\\d.eE+\\-]/.test(line[i])) { num += line[i]; i++; }
			tokens.push({ type: 'number', text: num });
			continue;
		}
		if (line.startsWith('true', i)) { tokens.push({ type: 'boolean', text: 'true' }); i += 4; continue; }
		if (line.startsWith('false', i)) { tokens.push({ type: 'boolean', text: 'false' }); i += 5; continue; }
		if (line.startsWith('null', i)) { tokens.push({ type: 'null', text: 'null' }); i += 4; continue; }
		tokens.push({ type: 'punctuation', text: ch }); i++;
	}
	return tokens;
}

function renderJsonViewer(jsonString) {
	try {
		const parsed = JSON.parse(jsonString);
		if (typeof parsed !== 'object' || parsed === null) return '<span class="json-raw">' + escapeHtml(jsonString) + '</span>';
		const pretty = JSON.stringify(parsed, null, 2);
		const lines = pretty.split('\\n');
		let html = '<div class="json-viewer-container"><div class="json-content">';
		for (const line of lines) {
			html += '<div class="json-line">';
			for (const token of tokenizeJsonLine(line)) {
				html += '<span class="json-token json-' + token.type + '">' + escapeHtml(token.text) + '</span>';
			}
			html += '</div>';
		}
		html += '</div></div>';
		return html;
	} catch {
		return '<span class="json-raw">' + escapeHtml(jsonString) + '</span>';
	}
}

// ============================================================================
// TIMELINE RENDERING
// ============================================================================

// Discover dynamic fields for the export data
const eventDynamic = discoverDynamicFields(DATA.timeline, displayFieldsConfig, 'event');
const actionDynamic = discoverDynamicFields(DATA.timeline, displayFieldsConfig, 'action');
const mergedEventFields = mergeFieldConfigs(displayFieldsConfig.event, eventDynamic);
const mergedActionFields = mergeFieldConfigs(displayFieldsConfig.action, actionDynamic);

function renderTimelineRow(item) {
	const fields = item.type === 'event' ? mergedEventFields : mergedActionFields;
	const pinnedFields = fields.filter(f => f.pinned && !f.showInNote).sort((a, b) => a.order - b.order);
	const noteFields = fields.filter(f => f.showInNote);
	const uuid = item.uuid;

	let html = '<div class="timeline-item" data-timeline-uuid="' + uuid + '" onclick="toggleDetails(\\'' + uuid + '\\')">';

	// Main row
	html += '<div class="main-row"><div class="data-row">';
	html += '<div class="data-section timestamp"><span class="field-prefix">│</span><span class="title">TIME</span><span class="value">' + formatTimestamp(item.timestamp) + '</span></div>';
	for (const field of pinnedFields) {
		const val = getFieldValue(item.data, field);
		if (val && val !== '—') {
			const pfx = field.isDynamic ? '◈' : '│';
			const dynClass = field.isDynamic ? ' dynamic-field' : '';
			html += '<div class="data-section datafield' + dynClass + '"><span class="field-prefix">' + pfx + '</span><span class="title">' + escapeHtml((field.label || '-').toUpperCase()) + '</span><span class="value">' + escapeHtml(val) + '</span></div>';
		}
	}
	html += '</div></div>';

	// Secondary row
	html += '<div class="secondary-row"><div class="note-snippet">';
	for (const field of noteFields) {
		const val = getFieldValue(item.data, field);
		const pfx = field.isDynamic ? '  ◈─' : '  └─';
		html += '<div class="note-section"><span class="field-prefix">' + pfx + '</span><span class="value">' + escapeHtml(val) + '</span></div>';
	}
	html += '</div><div class="item-type-badge badge-' + item.type + '">' + item.displayType + '</div></div>';

	html += '</div>';

	// Expanded details (hidden by default)
	html += '<div class="expanded-details hidden" id="details-' + uuid + '">';
	html += renderTimelineRowDetails(item);
	html += '</div>';

	return html;
}

function renderTimelineRowDetails(item) {
	const data = item.data;
	const type = item.type;
	const jsonFieldKeys = new Set(['event_data', 'action_data']);

	// Related entities
	const relatedEntities = type === 'event'
		? (data.eventEntities || [])
		: type === 'action'
		? (data.actionEntities || [])
		: [];
	const linkedEvents = type === 'action' ? (data.actionEvents || []) : [];

	let html = '<div class="details-container">';

	// Left column — full details
	html += '<div class="details-column">';
	html += '<div class="column-header">┌─ FULL DETAILS ─────────────────────────────</div>';
	html += '<div class="details-grid">';
	for (const [key, value] of Object.entries(data)) {
		if (value && typeof value !== 'object') {
			if (jsonFieldKeys.has(key)) {
				html += '<div class="detail-item"><span class="detail-label">│ ' + escapeHtml(key.replace(/_/g, ' ')) + ':</span><span class="detail-value"></span></div>';
				html += '<div class="json-viewer-slot">' + renderJsonViewer(String(value)) + '</div>';
			} else {
				html += '<div class="detail-item"><span class="detail-label">│ ' + escapeHtml(key.replace(/_/g, ' ')) + ':</span><span class="detail-value">' + escapeHtml(String(value)) + '</span></div>';
			}
		}
	}
	html += '</div>';
	html += '<div class="column-footer">└────────────────────────────────────────────</div>';
	html += '</div>';

	// Right column — relationships
	html += '<div class="graph-column">';
	html += '<div class="column-header">┌─ RELATIONSHIPS ────────────────────────────</div>';
	html += '<div class="relationship-tree">';
	html += '<div class="tree-root">│ ' + (type === 'event' ? '◉ EVENT' : '◆ ACTION') + ': ' + escapeHtml(data[type === 'event' ? 'event_type' : 'action_type'] || '') + '</div>';

	if (relatedEntities.length > 0) {
		html += '<div class="tree-branch"><div class="branch-header">├─ Entities (' + relatedEntities.length + ')</div>';
		relatedEntities.forEach((rel, idx) => {
			const isLast = idx === relatedEntities.length - 1 && linkedEvents.length === 0;
			const connector = isLast ? '└─' : '├─';
			html += '<div class="tree-node entity-node"><span class="node-connector">' + connector + '</span>';
			html += '<span class="node-type">[' + escapeHtml(rel.entity?.entity_type || '?') + ']</span>';
			html += '<span class="node-value">' + escapeHtml(rel.entity?.identifier || '?') + '</span>';
			const meta = rel.relation_type || rel.role;
			if (meta) html += '<span class="node-meta">(' + escapeHtml(meta) + ')</span>';
			html += '</div>';
		});
		html += '</div>';
	}

	if (linkedEvents.length > 0) {
		html += '<div class="tree-branch"><div class="branch-header">└─ Linked Events (' + linkedEvents.length + ')</div>';
		linkedEvents.forEach((le, idx) => {
			const connector = idx === linkedEvents.length - 1 ? '  └─' : '  ├─';
			html += '<div class="tree-node event-node"><span class="node-connector">' + connector + '</span>';
			html += '<span class="node-type">[EVENT]</span>';
			html += '<span class="node-value">' + escapeHtml(le.event?.event_type || '?') + '</span>';
			if (le.relation_type) html += '<span class="node-meta">(' + escapeHtml(le.relation_type) + ')</span>';
			html += '</div>';
		});
		html += '</div>';
	}

	if (relatedEntities.length === 0 && linkedEvents.length === 0) {
		html += '<div class="tree-empty">└─ <span class="empty-text">No relationships found</span></div>';
	}

	html += '</div>';
	html += '<div class="column-footer">└────────────────────────────────────────────</div>';
	html += '</div>';

	html += '</div>';
	return html;
}

// ============================================================================
// ENTITIES & ANNOTATIONS PANEL
// ============================================================================

function renderEntitiesPanel() {
	const entsByType = {};
	for (const entity of DATA.entities) {
		const t = entity.entity_type || 'unknown';
		if (!entsByType[t]) entsByType[t] = [];
		entsByType[t].push(entity);
	}

	let html = '';
	const types = Object.keys(entsByType).sort();
	if (types.length === 0) {
		html += '<div class="empty-state"><span class="empty-icon">◇</span><div class="empty-text">No entities found</div></div>';
	} else {
		for (const type of types) {
			const ents = entsByType[type];
			html += '<div class="type-group">';
			html += '<div class="type-header" onclick="toggleAccordion(this)"><span class="expand-icon">▶</span><span class="type-label">' + escapeHtml(type) + '</span><span class="type-count">(' + ents.length + ')</span></div>';
			html += '<div class="type-items hidden">';
			for (const e of ents) {
				html += '<div class="item-row entity-row"><span class="item-connector">├─</span>';
				html += '<span class="item-identifier">' + escapeHtml(e.identifier) + '</span>';
				if (e.display_name && e.display_name !== e.identifier) html += '<span class="item-name">(' + escapeHtml(e.display_name) + ')</span>';
				html += '<span class="item-status status-' + (e.status || 'unknown') + '">[' + escapeHtml(e.status || 'unknown') + ']</span>';
				html += '</div>';
			}
			html += '</div></div>';
		}
	}
	return html;
}

function renderAnnotationsPanel() {
	const annsByType = {};
	for (const ann of DATA.annotations) {
		const t = ann.annotation_type || 'unknown';
		if (!annsByType[t]) annsByType[t] = [];
		annsByType[t].push(ann);
	}

	let html = '';
	const types = Object.keys(annsByType).sort();
	if (types.length === 0) {
		html += '<div class="empty-state"><span class="empty-icon">◇</span><div class="empty-text">No annotations found</div></div>';
	} else {
		for (const type of types) {
			const anns = annsByType[type];
			html += '<div class="type-group">';
			html += '<div class="type-header" onclick="toggleAccordion(this)"><span class="expand-icon">▶</span><span class="type-label">' + escapeHtml(type) + '</span><span class="type-count">(' + anns.length + ')</span></div>';
			html += '<div class="type-items hidden">';
			for (const a of anns) {
				const content = a.content && a.content.length > 60 ? a.content.substring(0, 60) + '...' : (a.content || '—');
				const confClass = 'confidence-' + (a.confidence || 'unknown');
				html += '<div class="item-row annotation-row"><span class="item-connector">├─</span>';
				html += '<span class="item-content">' + escapeHtml(content) + '</span>';
				html += '<span class="item-confidence ' + confClass + '">[' + escapeHtml(a.confidence || 'unknown') + ']</span>';
				html += '</div>';
			}
			html += '</div></div>';
		}
	}
	return html;
}

// ============================================================================
// INTERACTIVITY
// ============================================================================

function toggleDetails(uuid) {
	const el = document.getElementById('details-' + uuid);
	if (el) el.classList.toggle('hidden');
}

function toggleEntitiesPanel() {
	const panel = document.getElementById('entitiesPanel');
	const btn = document.getElementById('toggleEntitiesBtn');
	panel.classList.toggle('hidden');
	btn.classList.toggle('active');
}

function switchTab(tab) {
	const entTab = document.getElementById('entitiesTabContent');
	const annTab = document.getElementById('annotationsTabContent');
	const btns = document.querySelectorAll('.tab-btn');
	btns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
	if (tab === 'entities') {
		entTab.classList.remove('hidden');
		annTab.classList.add('hidden');
	} else {
		entTab.classList.add('hidden');
		annTab.classList.remove('hidden');
	}
}

function toggleAccordion(headerEl) {
	const items = headerEl.nextElementSibling;
	const icon = headerEl.querySelector('.expand-icon');
	items.classList.toggle('hidden');
	icon.textContent = items.classList.contains('hidden') ? '▶' : '▼';
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
	// Render timeline
	const timelineList = document.getElementById('timelineList');
	if (DATA.timeline.length === 0) {
		timelineList.innerHTML = '<div class="empty-state info"><span class="empty-icon">📊</span><div class="empty-title">No timeline data found</div><div class="empty-description">No timeline events or investigation actions found for this incident.</div></div>';
	} else {
		let html = '';
		for (const item of DATA.timeline) {
			html += renderTimelineRow(item);
		}
		timelineList.innerHTML = html;
	}

	// Render entities & annotations panels
	document.getElementById('entitiesTabContent').innerHTML = renderEntitiesPanel();
	document.getElementById('annotationsTabContent').innerHTML = renderAnnotationsPanel();
	document.getElementById('entitiesCount').textContent = DATA.entities.length;
	document.getElementById('annotationsCount').textContent = DATA.annotations.length;
});
<\/script>
</body>
</html>`;
}

// ============================================================================
// CSS STYLES
// ============================================================================

function getStyles(): string {
	return `
/* ---- CSS Variables (from app.css) ---- */
:root {
	--color-bg-primary: #0f1419;
	--color-bg-secondary: #1a1f2e;
	--color-bg-tertiary: #242b3d;
	--color-bg-hover: #2a3244;
	--color-border-subtle: rgba(148, 163, 184, 0.1);
	--color-border-medium: rgba(148, 163, 184, 0.2);
	--color-border-strong: rgba(148, 163, 184, 0.3);
	--color-text-primary: #e2e8f0;
	--color-text-secondary: #94a3b8;
	--color-text-tertiary: #64748b;
	--color-text-dim: #475569;
	--color-accent-primary: #60a5fa;
	--color-accent-secondary: #818cf8;
	--color-accent-success: #34d399;
	--color-accent-warning: #fbbf24;
	--color-accent-error: #f87171;
	--spacing-xs: 0.25rem;
	--spacing-sm: 0.5rem;
	--spacing-md: 0.75rem;
	--spacing-lg: 1rem;
	--spacing-xl: 1.5rem;
	--spacing-2xl: 2rem;
	--font-size-xs: 0.6875rem;
	--font-size-sm: 0.75rem;
	--font-size-base: 0.875rem;
	--font-size-md: 0.9375rem;
	--font-size-lg: 1rem;
	--font-weight-normal: 400;
	--font-weight-medium: 500;
	--font-weight-semibold: 600;
	--border-radius-sm: 0.25rem;
	--border-radius-md: 0.375rem;
	--border-radius-lg: 0.5rem;
	--transition-fast: 150ms ease;
	--transition-normal: 200ms ease;
}

* { box-sizing: border-box; margin: 0; padding: 0; font-family: 'JetBrains Mono', monospace; }
body { background-color: var(--color-bg-primary); color: var(--color-text-primary); font-size: var(--font-size-base); -webkit-font-smoothing: antialiased; }
.hidden { display: none !important; }

/* Scrollbar */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--color-bg-secondary); }
::-webkit-scrollbar-thumb { background: var(--color-border-strong); border-radius: var(--border-radius-sm); }
::-webkit-scrollbar-thumb:hover { background: var(--color-text-dim); }

/* ---- Export Header ---- */
.export-header {
	display: flex; justify-content: space-between; align-items: center;
	padding: var(--spacing-sm) var(--spacing-lg);
	background: var(--color-bg-secondary);
	border-bottom: 1px solid var(--color-border-medium);
	position: sticky; top: 0; z-index: 100;
}
.header-left, .header-right { display: flex; align-items: center; gap: var(--spacing-sm); }
.app-name { color: var(--color-accent-primary); font-weight: var(--font-weight-semibold); font-size: var(--font-size-base); }
.incident-title { color: var(--color-text-primary); font-weight: var(--font-weight-semibold); font-size: var(--font-size-sm); }
.header-divider { color: var(--color-text-tertiary); }
.header-meta { color: var(--color-text-secondary); font-size: var(--font-size-xs); }
.header-meta strong { color: var(--color-text-primary); }

/* ---- Stats Bar ---- */
.stats-bar {
	display: flex; align-items: center; gap: var(--spacing-sm);
	padding: var(--spacing-xs) var(--spacing-lg);
	background: var(--color-bg-secondary);
	border-bottom: 1px solid var(--color-border-subtle);
}
.stat-card { display: flex; gap: var(--spacing-xs); align-items: center; padding: var(--spacing-xs) var(--spacing-md); background: var(--color-bg-tertiary); border: 1px solid var(--color-border-medium); border-radius: var(--border-radius-md); }
.stat-label { font-size: var(--font-size-xs); color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; }
.stat-value { font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); }
.stat-card.success .stat-value { color: var(--color-accent-success); }
.stat-card.info .stat-value { color: var(--color-accent-primary); }
.stat-divider { color: var(--color-text-tertiary); font-size: var(--font-size-sm); }

/* ---- Main Layout ---- */
.main-content { display: flex; gap: 0; max-width: 1600px; margin: 0 auto; padding: var(--spacing-sm); }
.timeline-section { flex: 1; min-width: 0; background: var(--color-bg-secondary); border: 1px solid var(--color-border-medium); border-radius: var(--border-radius-md); }
.entities-panel { width: 340px; flex-shrink: 0; margin-left: var(--spacing-sm); }

.section-header {
	padding: var(--spacing-xs); border-bottom: 1px solid var(--color-border-subtle);
	font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold);
	color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;
	display: flex; justify-content: space-between; align-items: center;
}
.header-actions { display: flex; gap: var(--spacing-xs); align-items: center; }
.section-content { padding: var(--spacing-xs); }

.toggle-btn {
	background: none; border: 1px solid var(--color-border-medium);
	color: var(--color-text-secondary); cursor: pointer;
	font-size: var(--font-size-xs); padding: var(--spacing-xs) var(--spacing-sm);
	border-radius: var(--border-radius-sm); transition: all 0.2s;
}
.toggle-btn:hover { border-color: var(--color-accent-warning); color: var(--color-accent-warning); }
.toggle-btn.active { border-color: var(--color-accent-warning); color: var(--color-accent-warning); background: rgba(251, 191, 36, 0.15); }

/* ---- Timeline Items ---- */
.timeline-list { display: flex; flex-direction: column; gap: var(--spacing-xs); }
.timeline-item {
	display: flex; flex-direction: column;
	background: var(--color-bg-secondary); border: 1px solid var(--color-border-medium);
	border-radius: 2px; margin-bottom: 2px;
	font-family: 'Courier New', monospace; cursor: pointer;
	transition: all 0.15s ease; font-size: var(--font-size-xs); line-height: 1.2;
}
.timeline-item:hover { background: var(--color-bg-hover); border-color: var(--color-accent-primary); box-shadow: 0 0 4px rgba(0, 255, 0, 0.1); }

.main-row { display: flex; width: 100%; justify-content: space-between; padding: 2px 4px; }
.secondary-row { display: flex; width: 100%; justify-content: space-between; align-items: center; padding: 0 4px 2px 4px; }
.data-row { display: flex; gap: 8px; flex-wrap: nowrap; flex: 1; overflow: hidden; }
.data-section { display: flex; align-items: baseline; gap: 4px; min-width: fit-content; white-space: nowrap; }
.field-prefix { color: var(--color-border-medium); font-weight: bold; user-select: none; }
.data-section .title { font-size: 10px; color: var(--color-accent-primary); font-weight: bold; text-transform: uppercase; letter-spacing: 0.03em; }
.data-section .value { font-size: 11px; font-weight: bold; color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; }
.dynamic-field .field-prefix { color: var(--color-accent-warning); font-size: 8px; }
.dynamic-field .title { color: var(--color-accent-warning); }
.dynamic-field .value { color: var(--color-text-secondary); }

.note-snippet { font-style: italic; font-size: 10px; color: var(--color-text-secondary); flex: 1; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.note-section { display: flex; gap: 2px; }

.item-type-badge {
	font-size: 9px; font-weight: var(--font-weight-semibold);
	padding: 1px 6px; border-radius: 2px; text-transform: uppercase; letter-spacing: 0.05em;
}
.badge-event { color: var(--color-accent-primary); border: 1px solid var(--color-accent-primary); }
.badge-action { color: var(--color-accent-secondary); border: 1px solid var(--color-accent-secondary); }

/* ---- Expanded Details ---- */
.expanded-details { width: 100%; background: var(--color-bg-tertiary); border: 1px solid var(--color-border-medium); border-radius: var(--border-radius-sm); }
.details-container { display: grid; grid-template-columns: 0.7fr 0.3fr; gap: var(--spacing-sm); padding: var(--spacing-sm); }
.details-container * { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.details-column, .graph-column { display: flex; flex-direction: column; min-height: 200px; }
.column-header, .column-footer { font-family: 'Courier New', monospace; font-size: var(--font-size-xs); color: var(--color-accent-primary); user-select: none; }
.details-grid { display: flex; flex-direction: column; font-family: 'Courier New', monospace; font-size: var(--font-size-xs); line-height: normal; }
.detail-item { display: grid; grid-template-columns: 200px 1fr; gap: var(--spacing-sm); }
.detail-label { color: var(--color-accent-primary); text-transform: uppercase; font-size: var(--font-size-xs); }
.detail-value { color: var(--color-text-primary); }
.json-viewer-slot { margin-left: var(--spacing-sm); }

/* ---- Relationship Tree ---- */
.relationship-tree { font-family: 'Courier New', monospace; font-size: var(--font-size-xs); color: var(--color-text-primary); }
.tree-root { color: var(--color-accent-primary); font-weight: bold; }
.branch-header { color: var(--color-accent-secondary); font-weight: bold; }
.tree-node { display: flex; align-items: baseline; padding-left: var(--spacing-sm); transition: background 0.15s ease; }
.tree-node:hover { background: var(--color-bg-hover); }
.node-connector { color: var(--color-border-medium); user-select: none; min-width: 20px; }
.node-type { color: var(--color-accent-warning); font-weight: bold; min-width: 80px; }
.node-value { color: var(--color-text-primary); font-weight: bold; }
.node-meta { color: var(--color-text-secondary); font-style: italic; font-size: calc(var(--font-size-xs) - 1px); }
.tree-empty { padding-left: var(--spacing-xs); color: var(--color-border-medium); }
.empty-text { color: var(--color-text-tertiary); font-style: italic; }
.entity-node .node-type { color: var(--color-accent-warning); }
.event-node .node-type { color: var(--color-accent-primary); }

/* ---- JSON Viewer ---- */
.json-viewer-container { display: flex; overflow-y: auto; overflow-x: hidden; font-family: 'Courier New', monospace; font-size: var(--font-size-xs); max-height: 128px; }
.json-viewer-container::-webkit-scrollbar { width: 4px; }
.json-viewer-container::-webkit-scrollbar-track { background: var(--color-bg-secondary); }
.json-viewer-container::-webkit-scrollbar-thumb { background: var(--color-border-medium); border-radius: 2px; }
.json-content { flex: 1; min-width: 0; overflow-x: auto; background: var(--color-bg-primary); border-left: 2px solid var(--color-border-medium); padding: var(--spacing-xs); border-radius: var(--border-radius-sm); }
.json-line { line-height: 16px; height: 16px; white-space: pre; }
.json-token { white-space: pre; }
.json-key { color: var(--color-accent-primary); font-weight: bold; }
.json-string { color: var(--color-accent-success); }
.json-number { color: var(--color-accent-warning); }
.json-boolean { color: var(--color-accent-secondary); font-weight: bold; }
.json-null { color: var(--color-text-tertiary); font-style: italic; }
.json-punctuation { color: var(--color-text-secondary); }
.json-raw { color: var(--color-text-primary); }

/* ---- Entities/Annotations Panel ---- */
.panel-container {
	background: var(--color-bg-secondary); border: 1px solid var(--color-border-medium);
	border-radius: var(--border-radius-md); display: flex; flex-direction: column;
	max-height: calc(100vh - 120px); position: sticky; top: 50px;
}
.tab-headers { display: flex; border-bottom: 1px solid var(--color-border-subtle); }
.tab-btn {
	flex: 1; background: none; border: none;
	padding: var(--spacing-sm) var(--spacing-md);
	color: var(--color-text-secondary); font-size: var(--font-size-xs);
	font-family: inherit; cursor: pointer;
	display: flex; align-items: center; justify-content: center; gap: var(--spacing-xs);
	transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.05em;
}
.tab-btn:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
.tab-btn.active { color: var(--color-accent-primary); border-bottom: 2px solid var(--color-accent-primary); background: var(--color-bg-tertiary); }
.tab-icon { font-size: var(--font-size-sm); }
.tab-count { background: var(--color-bg-tertiary); padding: 2px 6px; border-radius: var(--border-radius-sm); font-size: 10px; }
.tab-btn.active .tab-count { background: var(--color-accent-primary); color: var(--color-bg-primary); }
.tab-content { flex: 1; overflow-y: auto; padding: var(--spacing-sm); }
.empty-state { text-align: center; padding: var(--spacing-xl); color: var(--color-text-tertiary); }
.empty-icon { font-size: 1.5rem; display: block; margin-bottom: var(--spacing-sm); opacity: 0.5; }
.empty-state.info .empty-icon { color: var(--color-accent-primary); }
.empty-state.info .empty-title { color: var(--color-accent-primary); }
.empty-title { font-size: var(--font-size-base); color: var(--color-text-secondary); margin-bottom: var(--spacing-xs); }
.empty-description { font-size: var(--font-size-xs); color: var(--color-text-tertiary); }
.type-group { margin-bottom: var(--spacing-xs); }
.type-header {
	display: flex; align-items: center; gap: var(--spacing-xs);
	padding: var(--spacing-xs) var(--spacing-sm);
	background: var(--color-bg-tertiary); border-radius: var(--border-radius-sm);
	cursor: pointer; transition: background 0.15s;
}
.type-header:hover { background: var(--color-bg-hover); }
.expand-icon { font-size: 10px; color: var(--color-text-tertiary); width: 12px; }
.type-label { font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); color: var(--color-accent-warning); text-transform: uppercase; letter-spacing: 0.03em; }
.type-count { font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-left: auto; }
.type-items { padding-left: var(--spacing-sm); border-left: 1px solid var(--color-border-subtle); margin-left: var(--spacing-sm); margin-top: var(--spacing-xs); }
.item-row {
	display: flex; align-items: baseline; gap: var(--spacing-xs);
	padding: var(--spacing-xs) var(--spacing-sm);
	font-family: 'JetBrains Mono', 'Courier New', monospace;
	font-size: var(--font-size-xs); border-radius: var(--border-radius-sm);
	transition: background 0.15s;
}
.item-row:hover { background: var(--color-bg-hover); }
.item-connector { color: var(--color-border-medium); user-select: none; }
.item-identifier { color: var(--color-text-primary); font-weight: var(--font-weight-semibold); word-break: break-all; }
.item-name { color: var(--color-text-secondary); font-style: italic; }
.item-content { color: var(--color-text-primary); flex: 1; min-width: 0; }
.item-status, .item-confidence { font-size: 9px; margin-left: auto; flex-shrink: 0; }
.status-active { color: var(--color-accent-success); }
.status-inactive { color: var(--color-text-tertiary); }
.status-unknown { color: var(--color-text-tertiary); }
.confidence-confirmed { color: var(--color-accent-success); }
.confidence-high { color: var(--color-accent-primary); }
.confidence-medium { color: var(--color-accent-warning); }
.confidence-low { color: var(--color-accent-error); }
.confidence-unknown { color: var(--color-text-tertiary); }

/* ---- Print ---- */
@media print {
	body { background: white; color: black; }
	.export-header { position: static; }
	.toggle-btn { display: none; }
}
`;
}

// ============================================================================
// HTML Escaping Utility
// ============================================================================

function escapeHtml(str: string): string {
	if (!str) return '';
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
