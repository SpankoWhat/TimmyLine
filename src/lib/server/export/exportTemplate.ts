/**
 * Incident Export HTML Template Engine
 *
 * Generates a single self-contained interactive HTML file from an ExportPayload.
 *
 * KEY DESIGN DECISIONS:
 * ─────────────────────
 * 1. CSS tokens are auto-extracted from `src/app.css` at runtime via extractStyles.ts,
 *    so the export always matches the live app's design system.
 * 2. `displayFieldsConfig` is imported directly — no duplication.
 * 3. `fieldUtils` logic (getFieldValue, discoverDynamicFields, mergeFieldConfigs)
 *    is serialized into the embedded <script> as vanilla JS for offline interactivity.
 * 4. The HTML structure mirrors the live Svelte components:
 *    - TimelineRow.svelte        → renderTimelineRow()
 *    - TimelineRowDetails.svelte → renderTimelineRowDetails()
 *    - EntitiesAnnotationsPanel  → renderEntitiesPanel() / renderAnnotationsPanel()
 *    - JsonViewer.svelte         → renderJsonViewer()
 *    - IncidentStats.svelte      → stats bar
 */

import type { ExportPayload } from './exportIncident';
import { getAppCss } from './extractStyles';
import { displayFieldsConfig } from '$lib/config/displayFieldsConfig';
import {
	formatTimestampForUi,
	resolveTimePreferences,
	type TimeDisplayPreferences
} from '$lib/utils/dateTime';

export interface ExportRenderOptions {
	timePreferences?: Partial<TimeDisplayPreferences> | null;
}

/**
 * Renders the export payload into a complete self-contained HTML string.
 */
export function renderExportHtml(payload: ExportPayload, options: ExportRenderOptions = {}): string {
	const dataJson = JSON.stringify(payload);
	const resolvedTimePreferences = resolveTimePreferences(options.timePreferences);
	const resolvedTimePreferencesJson = JSON.stringify(resolvedTimePreferences);
	const incidentTitle = escapeHtml(payload.incident.title);
	const exportedAtEpochMs = Date.parse(payload.exportedAt);
	const exportedAtEpoch = Number.isFinite(exportedAtEpochMs)
		? Math.trunc(exportedAtEpochMs / 1000)
		: null;
	const exportDate =
		exportedAtEpoch === null
			? payload.exportedAt
			: formatTimestampForUi(exportedAtEpoch, resolvedTimePreferences).text;

	// Serialize the real displayFieldsConfig for the embedded JS
	const fieldConfigJson = JSON.stringify(displayFieldsConfig);

	// Get the live app CSS
	const appCss = getAppCss();

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TimmyLine Export — ${incidentTitle}</title>
<style>
/* ═══════════════════════════════════════════════════════════════════════════
   AUTO-EXTRACTED FROM src/app.css — DO NOT EDIT MANUALLY
   This ensures the export always matches the live app design tokens.
   ═══════════════════════════════════════════════════════════════════════════ */
${appCss}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORT-SPECIFIC OVERRIDES
   Styles unique to the self-contained HTML export (no sidebar, no socket.io).
   All values reference the design tokens above.
   ═══════════════════════════════════════════════════════════════════════════ */
${getExportStyles()}
</style>
</head>
<body>
<div id="app">
	<!-- ──────── Header ──────── -->
	<header class="export-header">
		<div class="header-left">
			<svg class="logo-mark" viewBox="0 0 28 28" width="22" height="22" aria-hidden="true">
				<rect width="28" height="28" rx="6" fill="hsl(36, 100%, 50%)" />
			</svg>
			<span class="app-name">TimmyLine</span>
			<span class="header-sep">│</span>
			<span class="incident-title">${incidentTitle}</span>
		</div>
		<div class="header-right">
			<span class="header-meta">Status: <strong>${escapeHtml(payload.incident.status)}</strong></span>
			<span class="header-sep">│</span>
			<span class="header-meta">Priority: <strong class="priority-value">${escapeHtml(payload.incident.priority)}</strong></span>
			<span class="header-sep">│</span>
			<span class="header-meta">Exported: ${exportDate}</span>
		</div>
	</header>

	<!-- ──────── Stats Bar (mirrors IncidentStats.svelte) ──────── -->
	<div class="stats-bar">
		<div class="stat-card stat-total">
			<span class="stat-value">${payload.stats.totalItems}</span>
			<span class="stat-label">Total Items</span>
		</div>
		<div class="stat-card stat-events">
			<span class="stat-value">${payload.stats.events}</span>
			<span class="stat-label">Events</span>
		</div>
		<div class="stat-card stat-actions">
			<span class="stat-value">${payload.stats.actions}</span>
			<span class="stat-label">Actions</span>
		</div>
		<div class="stat-card stat-entities">
			<span class="stat-value">${payload.stats.entities}</span>
			<span class="stat-label">Entities</span>
		</div>
		<div class="stat-card stat-annotations">
			<span class="stat-value">${payload.stats.annotations}</span>
			<span class="stat-label">Annotations</span>
		</div>
	</div>

	<!-- ──────── Main Content ──────── -->
	<div class="main-content">
		<!-- Timeline Section -->
		<div class="timeline-section">
			<div class="toolbar">
				<span class="toolbar-title">Timeline</span>
				<div class="toolbar-spacer"></div>
				<button class="btn-ghost btn-sm" id="toggleEntitiesBtn" onclick="toggleEntitiesPanel()">◆ Entities &amp; Annotations</button>
			</div>
			<div id="timelineList" class="timeline-list"></div>
		</div>

		<!-- Entities/Annotations Side Panel (mirrors EntitiesAnnotationsPanel.svelte) -->
		<aside id="entitiesPanel" class="side-panel hidden">
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
		</aside>
	</div>

	<!-- ──────── Footer ──────── -->
	<footer class="export-footer">
		<span>TimmyLine Incident Export</span>
		<span class="footer-sep">│</span>
		<span>Generated ${exportDate}</span>
		<span class="footer-sep">│</span>
		<span>${payload.stats.totalItems} timeline items · ${payload.stats.entities} entities · ${payload.stats.annotations} annotations</span>
	</footer>
</div>

<script>
// ════════════════════════════════════════════════════════════════════════════
// EMBEDDED DATA
// ════════════════════════════════════════════════════════════════════════════
var DATA = ${dataJson};
var TIME_PREFERENCES = ${resolvedTimePreferencesJson};

// ════════════════════════════════════════════════════════════════════════════
// DISPLAY FIELD CONFIG (auto-imported from displayFieldsConfig.ts)
// ════════════════════════════════════════════════════════════════════════════
var displayFieldsConfig = ${fieldConfigJson};

// ════════════════════════════════════════════════════════════════════════════
// FIELD UTILITIES (ported from fieldUtils.ts — kept in sync by structure)
// ════════════════════════════════════════════════════════════════════════════

function keyToLabel(key) {
	return key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\\b\\w/g, function(c) { return c.toUpperCase(); });
}

function safeJsonParse(jsonStr) {
	if (!jsonStr || typeof jsonStr !== 'string') return null;
	try {
		var parsed = JSON.parse(jsonStr);
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
		return null;
	} catch(e) { return null; }
}

function formatDynamicValue(value) {
	if (value === null || value === undefined) return '\\u2014';
	if (Array.isArray(value)) return value.map(formatDynamicValue).join(', ');
	if (typeof value === 'object') return JSON.stringify(value);
	return String(value);
}

function getNestedValue(obj, path) {
	var parts = path.split('.');
	var current = obj;
	for (var i = 0; i < parts.length; i++) {
		if (current === null || current === undefined) return undefined;
		if (typeof current === 'object') current = current[parts[i]];
		else return undefined;
	}
	return current;
}

function getFieldValue(data, field) {
	if (field.kind === 'dynamic') {
		var parentVal = data[field.parentKey];
		var parsed = safeJsonParse(parentVal);
		if (parsed) {
			var subKey = field.key.replace(field.parentKey + '.', '');
			return formatDynamicValue(getNestedValue(parsed, subKey));
		}
		return '\\u2014';
	}
	var value = data[field.key];
	if (field.kind === 'system' && field.allowDynamicFieldRendering) {
		var p = safeJsonParse(value);
		if (p) return '{' + Object.keys(p).length + ' fields}';
	}
	return formatValueWithSemantics(field.key, value).text;
}

function discoverDynamicFields(items, config, itemType) {
	var discovered = {};
	var seen = {};
	var parentFields = config[itemType].filter(function(f) { return f.kind === 'system' && f.allowDynamicFieldRendering; });
	if (parentFields.length === 0) return discovered;
	parentFields.forEach(function(pf) { seen[pf.key] = {}; discovered[pf.key] = []; });
	items.forEach(function(item) {
		if (item.type !== itemType) return;
		parentFields.forEach(function(pf) {
			var parsed = safeJsonParse(item.data[pf.key]);
			if (!parsed) return;
			var seenSet = seen[pf.key];
			Object.keys(parsed).forEach(function(subKey) {
				if (!seenSet[subKey]) {
					seenSet[subKey] = true;
					var count = Object.keys(seenSet).length;
					discovered[pf.key].push({
						kind: 'dynamic',
						key: pf.key + '.' + subKey,
						label: keyToLabel(subKey),
						pinned: false,
						order: pf.order + count,
						parentKey: pf.key
					});
				}
			});
		});
	});
	return discovered;
}

function mergeFieldConfigs(staticConfig, dynamicMap) {
	var result = [];
	staticConfig.forEach(function(field) {
		result.push(Object.assign({}, field));
		if (field.kind === 'system' && field.allowDynamicFieldRendering && dynamicMap[field.key]) {
			dynamicMap[field.key].forEach(function(df) { result.push(Object.assign({}, df)); });
		}
	});
	return result;
}

// ════════════════════════════════════════════════════════════════════════════
// FORMATTING
// ════════════════════════════════════════════════════════════════════════════

var COMMON_EPOCH_FIELD_REGEX = /(timestamp|_at$|occurred|discovered|performed|created|updated|deleted|expires|last_used)/i;
var ANALYST_UUID_FIELD_REGEX = /(^|_)(discovered_by|actioned_by|entered_by|noted_by|analyst_uuid)$/i;

function isValidTimeZone(timezone) {
	if (!timezone || typeof timezone !== 'string') return false;
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: timezone });
		return true;
	} catch (e) {
		return false;
	}
}

function normalizeEpoch(value) {
	if (value === null || value === undefined) return null;

	var numericValue;
	if (value instanceof Date) {
		numericValue = value.getTime();
	} else if (typeof value === 'string') {
		numericValue = Number(value);
	} else if (typeof value === 'number') {
		numericValue = value;
	} else {
		return null;
	}

	if (!Number.isFinite(numericValue)) return null;

	var abs = Math.abs(numericValue);
	if (abs > 1e11) {
		return Math.trunc(numericValue / 1000);
	}

	return Math.trunc(numericValue);
}

function partsToObject(parts) {
	var collected = {};
	parts.forEach(function(part) {
		if (part.type !== 'literal') {
			collected[part.type] = part.value;
		}
	});
	return collected;
}

function formatIsoLike(date, timezone) {
	var formatter = new Intl.DateTimeFormat('en-CA', {
		timeZone: timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
		timeZoneName: 'short'
	});

	var p = partsToObject(formatter.formatToParts(date));
	var year = p.year || '0000';
	var month = p.month || '00';
	var day = p.day || '00';
	var hour = p.hour || '00';
	var minute = p.minute || '00';
	var second = p.second || '00';
	var zone = p.timeZoneName || timezone;

	return year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second + ' ' + zone;
}

function formatUtcFixed(date) {
	var year = date.getUTCFullYear();
	var month = String(date.getUTCMonth() + 1).padStart(2, '0');
	var day = String(date.getUTCDate()).padStart(2, '0');
	var hour = String(date.getUTCHours()).padStart(2, '0');
	var minute = String(date.getUTCMinutes()).padStart(2, '0');
	var second = String(date.getUTCSeconds()).padStart(2, '0');

	return year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second + ' UTC';
}

function formatAbsoluteTimestamp(epochTime) {
	var epochSeconds = normalizeEpoch(epochTime);
	if (epochSeconds === null) return '\u2014';

	var date = new Date(epochSeconds * 1000);
	if (isNaN(date.getTime())) return '\u2014';

	var timezone = isValidTimeZone(TIME_PREFERENCES.timezone)
		? TIME_PREFERENCES.timezone
		: 'UTC';
	var format = TIME_PREFERENCES.absoluteFormat;

	if (format === 'utc-fixed') {
		return formatUtcFixed(date);
	}

	if (format === 'iso-like') {
		return formatIsoLike(date, timezone);
	}

	return new Intl.DateTimeFormat(undefined, {
		timeZone: timezone,
		dateStyle: 'medium',
		timeStyle: 'short'
	}).format(date);
}

function formatRelativeTimestamp(epochTime, nowEpochSeconds) {
	var target = normalizeEpoch(epochTime);
	if (target === null) return '\u2014';

	var now = normalizeEpoch(nowEpochSeconds);
	if (now === null) now = Math.floor(Date.now() / 1000);

	var delta = target - now;
	var absDelta = Math.abs(delta);

	if (absDelta < 10) {
		return 'just now';
	}

	var units = [
		['y', 31536000],
		['mo', 2592000],
		['w', 604800],
		['d', 86400],
		['h', 3600],
		['m', 60],
		['s', 1]
	];

	for (var i = 0; i < units.length; i++) {
		var label = units[i][0];
		var size = units[i][1];
		if (absDelta >= size) {
			var amount = Math.floor(absDelta / size);
			return delta < 0 ? amount + label + ' ago' : 'in ' + amount + label;
		}
	}

	return 'just now';
}

function formatTimestampForDisplay(epochTime) {
	var absolute = formatAbsoluteTimestamp(epochTime);
	var relative = formatRelativeTimestamp(epochTime, Math.floor(Date.now() / 1000));
	var text = TIME_PREFERENCES.displayMode === 'relative' ? relative : absolute;
	var tooltip = null;

	if (TIME_PREFERENCES.showTooltipAlternate) {
		tooltip = TIME_PREFERENCES.displayMode === 'relative' ? absolute : relative;
	}

	return {
		text: text,
		tooltip: tooltip,
		absolute: absolute,
		relative: relative
	};
}

function resolveAnalyst(analystUuid) {
	if (!analystUuid || !DATA.analysts) return null;
	var analyst = DATA.analysts[analystUuid];
	if (!analyst) return null;
	return analyst;
}

function enrichAnalystUuid(analystUuid) {
	if (!analystUuid) return '\u2014';
	var analyst = resolveAnalyst(analystUuid);
	if (!analyst) return analystUuid;

	var fullName = typeof analyst.full_name === 'string' ? analyst.full_name.trim() : '';
	if (fullName) return fullName;

	var username = typeof analyst.username === 'string' ? analyst.username.trim() : '';
	if (username) return username;

	return analystUuid;
}

function formatValueWithSemantics(fieldKey, value) {
	if (typeof fieldKey === 'string' && ANALYST_UUID_FIELD_REGEX.test(fieldKey)) {
		return { text: enrichAnalystUuid(typeof value === 'string' ? value : String(value || '')), tooltip: null };
	}

	if (typeof fieldKey === 'string' && COMMON_EPOCH_FIELD_REGEX.test(fieldKey) && normalizeEpoch(value) !== null) {
		var tsUi = formatTimestampForDisplay(value);
		return { text: tsUi.text, tooltip: tsUi.tooltip };
	}

	return { text: formatDynamicValue(value), tooltip: null };
}

function esc(str) {
	if (!str) return '';
	return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ════════════════════════════════════════════════════════════════════════════
// JSON VIEWER (mirrors JsonViewer.svelte)
// ════════════════════════════════════════════════════════════════════════════

function tokenizeJsonLine(line) {
	var tokens = [];
	var i = 0;
	while (i < line.length) {
		var ch = line[i];
		if (ch === ' ' || ch === '\\t') {
			var ws = '';
			while (i < line.length && (line[i] === ' ' || line[i] === '\\t')) { ws += line[i]; i++; }
			tokens.push({ type: 'punctuation', text: ws });
			continue;
		}
		if ('{}[],:'.indexOf(ch) !== -1) { tokens.push({ type: 'punctuation', text: ch }); i++; continue; }
		if (ch === '"') {
			var str = '"'; i++;
			while (i < line.length && line[i] !== '"') {
				if (line[i] === '\\\\') { str += line[i] + (line[i+1] || ''); i += 2; }
				else { str += line[i]; i++; }
			}
			str += '"'; i++;
			var la = i;
			while (la < line.length && (line[la] === ' ' || line[la] === '\\t')) la++;
			var isKey = la < line.length && line[la] === ':';
			tokens.push({ type: isKey ? 'key' : 'string', text: str });
			continue;
		}
		if (ch === '-' || (ch >= '0' && ch <= '9')) {
			var num = '';
			while (i < line.length && /[\\d.eE+\\-]/.test(line[i])) { num += line[i]; i++; }
			tokens.push({ type: 'number', text: num });
			continue;
		}
		if (line.substr(i, 4) === 'true') { tokens.push({ type: 'boolean', text: 'true' }); i += 4; continue; }
		if (line.substr(i, 5) === 'false') { tokens.push({ type: 'boolean', text: 'false' }); i += 5; continue; }
		if (line.substr(i, 4) === 'null') { tokens.push({ type: 'null', text: 'null' }); i += 4; continue; }
		tokens.push({ type: 'punctuation', text: ch }); i++;
	}
	return tokens;
}

function renderJsonViewer(jsonString) {
	try {
		var parsed = JSON.parse(jsonString);
		if (typeof parsed !== 'object' || parsed === null) return '<span class="json-raw">' + esc(jsonString) + '</span>';
		var pretty = JSON.stringify(parsed, null, 2);
		var lines = pretty.split('\\n');
		var html = '<div class="json-viewer-container"><div class="json-content">';
		lines.forEach(function(line) {
			html += '<div class="json-line">';
			tokenizeJsonLine(line).forEach(function(token) {
				html += '<span class="json-token json-' + token.type + '">' + esc(token.text) + '</span>';
			});
			html += '</div>';
		});
		html += '</div></div>';
		return html;
	} catch(e) {
		return '<span class="json-raw">' + esc(jsonString) + '</span>';
	}
}

// ════════════════════════════════════════════════════════════════════════════
// TIMELINE RENDERING (mirrors TimelineRow.svelte + TimelineRowDetails.svelte)
// ════════════════════════════════════════════════════════════════════════════

// Discover dynamic fields
var eventDynamic = discoverDynamicFields(DATA.timeline, displayFieldsConfig, 'event');
var actionDynamic = discoverDynamicFields(DATA.timeline, displayFieldsConfig, 'action');
var mergedEventFields = mergeFieldConfigs(displayFieldsConfig.event, eventDynamic);
var mergedActionFields = mergeFieldConfigs(displayFieldsConfig.action, actionDynamic);

function renderTimelineRow(item) {
	var fields = item.type === 'event' ? mergedEventFields : mergedActionFields;
	var pinnedFields = fields.filter(function(f) { return f.pinned && f.kind !== 'system'; }).sort(function(a, b) { return a.order - b.order; });
	var noteFields = fields.filter(function(f) { return f.kind === 'system' && f.showInNote; });
	var uuid = item.uuid;
	var timestampUi = formatTimestampForDisplay(item.timestamp);
	var timestampTitleAttr = timestampUi.tooltip ? ' title="' + esc(timestampUi.tooltip) + '"' : '';

	var html = '<div class="timeline-item" data-timeline-uuid="' + uuid + '" onclick="toggleDetails(\\'' + uuid + '\\')" role="button" tabindex="0" onkeydown="if(event.key===\\'Enter\\')toggleDetails(\\'' + uuid + '\\')">';

	// Main row (mirrors TimelineRow.svelte .main-row)
	html += '<div class="main-row"><div class="data-row">';
	html += '<div class="data-field timestamp-field"><span class="field-prefix">│</span><span class="field-label">TIME</span><span class="field-value"' + timestampTitleAttr + '>' + esc(timestampUi.text) + '</span></div>';
	pinnedFields.forEach(function(field) {
		var val = getFieldValue(item.data, field);
		if (val && val !== '\\u2014') {
			var pfx = field.kind === 'dynamic' ? '◈' : '│';
			var cls = field.kind === 'dynamic' ? ' dynamic-field' : '';
			html += '<div class="data-field' + cls + '"><span class="field-prefix">' + pfx + '</span><span class="field-label">' + esc((field.label || '-').toUpperCase()) + '</span><span class="field-value">' + esc(val) + '</span></div>';
		}
	});
	html += '</div></div>';

	// Secondary row (notes + type badge)
	html += '<div class="secondary-row"><div class="note-snippet">';
	noteFields.forEach(function(field) {
		var val = getFieldValue(item.data, field);
		html += '<div class="note-field"><span class="note-prefix">└─</span><span class="note-value">' + esc(val) + '</span></div>';
	});
	html += '</div><span class="type-badge type-badge-' + item.type + '">' + item.displayType + '</span></div>';

	html += '</div>';

	// Expanded details (hidden by default)
	html += '<div class="expanded-details hidden" id="details-' + uuid + '">';
	html += renderTimelineRowDetails(item);
	html += '</div>';

	return html;
}

function renderTimelineRowDetails(item) {
	var data = item.data;
	var type = item.type;
	var jsonFieldKeys = { event_data: true, action_data: true };

	var relatedEntities = type === 'event'
		? (data.eventEntities || [])
		: type === 'action'
		? (data.actionEntities || [])
		: [];
	var linkedEvents = type === 'action' ? (data.actionEvents || []) : [];

	var html = '<div class="details-container">';

	// Left column — Full Details (mirrors TimelineRowDetails.svelte)
	html += '<div class="details-column">';
	html += '<div class="column-header">Full Details</div>';
	html += '<div class="details-grid">';
	Object.entries(data).forEach(function(entry) {
		var key = entry[0], value = entry[1];
		if (value && typeof value !== 'object') {
			if (jsonFieldKeys[key]) {
				html += '<div class="detail-item"><span class="detail-label">' + esc(key.replace(/_/g, ' ')) + '</span><span class="detail-value"></span></div>';
				html += '<div class="json-viewer-slot">' + renderJsonViewer(String(value)) + '</div>';
			} else {
				var formattedValue = formatValueWithSemantics(key, value);
				var detailTitleAttr = formattedValue.tooltip ? ' title="' + esc(formattedValue.tooltip) + '"' : '';
				html += '<div class="detail-item"><span class="detail-label">' + esc(key.replace(/_/g, ' ')) + '</span><span class="detail-value"' + detailTitleAttr + '>' + esc(String(formattedValue.text)) + '</span></div>';
			}
		}
	});
	html += '</div></div>';

	// Right column — Relationships (mirrors TimelineRowDetails.svelte)
	html += '<div class="graph-column">';
	html += '<div class="column-header">Relationships</div>';
	html += '<div class="relationship-tree">';
	html += '<div class="tree-root">' + (type === 'event' ? '◉ EVENT' : '◆ ACTION') + ': ' + esc(data[type === 'event' ? 'event_type' : 'action_type'] || '') + '</div>';

	if (relatedEntities.length > 0) {
		html += '<div class="tree-branch"><div class="branch-header">├─ Entities (' + relatedEntities.length + ')</div>';
		relatedEntities.forEach(function(rel, idx) {
			var isLast = idx === relatedEntities.length - 1 && linkedEvents.length === 0;
			var conn = isLast ? '└─' : '├─';
			html += '<div class="tree-node entity-node"><span class="node-connector">' + conn + '</span>';
			html += '<span class="node-type">[' + esc(rel.entity && rel.entity.entity_type || '?') + ']</span>';
			html += '<span class="node-value">' + esc(rel.entity && rel.entity.identifier || '?') + '</span>';
			var meta = rel.relation_type || rel.role;
			if (meta) html += '<span class="node-meta">(' + esc(meta) + ')</span>';
			html += '</div>';
		});
		html += '</div>';
	}

	if (linkedEvents.length > 0) {
		html += '<div class="tree-branch"><div class="branch-header">└─ Linked Events (' + linkedEvents.length + ')</div>';
		linkedEvents.forEach(function(le, idx) {
			var conn = idx === linkedEvents.length - 1 ? '  └─' : '  ├─';
			html += '<div class="tree-node event-node"><span class="node-connector">' + conn + '</span>';
			html += '<span class="node-type">[EVENT]</span>';
			html += '<span class="node-value">' + esc(le.event && le.event.event_type || '?') + '</span>';
			if (le.relation_type) html += '<span class="node-meta">(' + esc(le.relation_type) + ')</span>';
			html += '</div>';
		});
		html += '</div>';
	}

	if (relatedEntities.length === 0 && linkedEvents.length === 0) {
		html += '<div class="tree-empty">└─ <span class="empty-text">No relationships found</span></div>';
	}

	html += '</div></div>';
	html += '</div>';
	return html;
}

// ════════════════════════════════════════════════════════════════════════════
// ENTITIES & ANNOTATIONS PANEL (mirrors EntitiesAnnotationsPanel.svelte)
// ════════════════════════════════════════════════════════════════════════════

function renderEntitiesPanel() {
	var entsByType = {};
	DATA.entities.forEach(function(entity) {
		var t = entity.entity_type || 'unknown';
		if (!entsByType[t]) entsByType[t] = [];
		entsByType[t].push(entity);
	});
	var types = Object.keys(entsByType).sort();
	if (types.length === 0) {
		return '<div class="empty-state"><span class="empty-state-icon">◇</span><div class="empty-state-title">No entities found</div><div class="empty-state-description">Entities linked to this incident will appear here.</div></div>';
	}
	var html = '';
	types.forEach(function(type) {
		var ents = entsByType[type];
		html += '<div class="type-group">';
		html += '<div class="type-header" onclick="toggleAccordion(this)" role="button" tabindex="0" onkeydown="if(event.key===\\'Enter\\')toggleAccordion(this)"><span class="expand-icon">▶</span><span class="type-label">' + esc(type) + '</span><span class="type-count">(' + ents.length + ')</span></div>';
		html += '<div class="type-items hidden">';
		ents.forEach(function(e) {
			var statusCls = e.status === 'active' ? 'status-active' : e.status === 'inactive' ? 'status-inactive' : 'status-unknown';
			html += '<div class="item-row entity-row" onclick="highlightEntity(\\'' + e.uuid + '\\')" role="button" tabindex="0"><span class="item-connector">├─</span>';
			html += '<span class="item-identifier">' + esc(e.identifier) + '</span>';
			if (e.display_name && e.display_name !== e.identifier) html += '<span class="item-name">(' + esc(e.display_name) + ')</span>';
			html += '<span class="item-status ' + statusCls + '">[' + esc(e.status || 'unknown') + ']</span>';
			html += '</div>';
		});
		html += '</div></div>';
	});
	return html;
}

function renderAnnotationsPanel() {
	var annsByType = {};
	DATA.annotations.forEach(function(ann) {
		var t = ann.annotation_type || 'unknown';
		if (!annsByType[t]) annsByType[t] = [];
		annsByType[t].push(ann);
	});
	var types = Object.keys(annsByType).sort();
	if (types.length === 0) {
		return '<div class="empty-state"><span class="empty-state-icon">◇</span><div class="empty-state-title">No annotations found</div><div class="empty-state-description">Annotations for this incident will appear here.</div></div>';
	}
	var html = '';
	types.forEach(function(type) {
		var anns = annsByType[type];
		html += '<div class="type-group">';
		html += '<div class="type-header" onclick="toggleAccordion(this)" role="button" tabindex="0" onkeydown="if(event.key===\\'Enter\\')toggleAccordion(this)"><span class="expand-icon">▶</span><span class="type-label">' + esc(type) + '</span><span class="type-count">(' + anns.length + ')</span></div>';
		html += '<div class="type-items hidden">';
		anns.forEach(function(a) {
			var content = a.content && a.content.length > 60 ? a.content.substring(0, 60) + '...' : (a.content || '\\u2014');
			var confCls = 'confidence-' + (a.confidence || 'unknown');
			html += '<div class="item-row annotation-row" role="button" tabindex="0"><span class="item-connector">├─</span>';
			html += '<span class="item-content">' + esc(content) + '</span>';
			html += '<span class="item-confidence ' + confCls + '">[' + esc(a.confidence || 'unknown') + ']</span>';
			html += '</div>';
		});
		html += '</div></div>';
	});
	return html;
}

// ════════════════════════════════════════════════════════════════════════════
// INTERACTIVITY
// ════════════════════════════════════════════════════════════════════════════

function toggleDetails(uuid) {
	var el = document.getElementById('details-' + uuid);
	if (el) el.classList.toggle('hidden');
}

function toggleEntitiesPanel() {
	var panel = document.getElementById('entitiesPanel');
	var btn = document.getElementById('toggleEntitiesBtn');
	panel.classList.toggle('hidden');
	btn.classList.toggle('active');
}

function switchTab(tab) {
	var entTab = document.getElementById('entitiesTabContent');
	var annTab = document.getElementById('annotationsTabContent');
	document.querySelectorAll('.tab-btn').forEach(function(b) {
		b.classList.toggle('active', b.getAttribute('data-tab') === tab);
	});
	if (tab === 'entities') {
		entTab.classList.remove('hidden');
		annTab.classList.add('hidden');
	} else {
		entTab.classList.add('hidden');
		annTab.classList.remove('hidden');
	}
}

function toggleAccordion(headerEl) {
	var items = headerEl.nextElementSibling;
	var icon = headerEl.querySelector('.expand-icon');
	items.classList.toggle('hidden');
	icon.textContent = items.classList.contains('hidden') ? '▶' : '▼';
}

function highlightEntity(entityUuid) {
	// Clear previous highlights
	document.querySelectorAll('.timeline-item.highlighted').forEach(function(el) {
		el.classList.remove('highlighted');
	});

	// Find timeline items that reference this entity
	var firstMatch = null;
	DATA.timeline.forEach(function(item) {
		var entities = item.type === 'event'
			? (item.data.eventEntities || [])
			: (item.data.actionEntities || []);
		var match = entities.some(function(rel) {
			return rel.entity && rel.entity.uuid === entityUuid;
		});
		if (match) {
			var el = document.querySelector('[data-timeline-uuid="' + item.uuid + '"]');
			if (el) {
				el.classList.add('highlighted');
				if (!firstMatch) firstMatch = el;
			}
		}
	});
	if (firstMatch) firstMatch.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
	// Render timeline
	var timelineList = document.getElementById('timelineList');
	if (DATA.timeline.length === 0) {
		timelineList.innerHTML = '<div class="empty-state"><span class="empty-state-icon">📊</span><div class="empty-state-title">No timeline data found</div><div class="empty-state-description">No timeline events or investigation actions found for this incident.</div></div>';
	} else {
		var html = '';
		DATA.timeline.forEach(function(item) { html += renderTimelineRow(item); });
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

// ════════════════════════════════════════════════════════════════════════════
// EXPORT-SPECIFIC STYLES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Returns CSS that is unique to the export HTML.
 * All values reference the design tokens from app.css (injected above).
 */
function getExportStyles(): string {
	return `
/* ── Utility ── */
.hidden { display: none !important; }

/* ── Export Header ── */
.export-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--space-2) var(--space-6);
	background: hsl(var(--bg-surface-200));
	border-bottom: var(--border-width) solid hsl(var(--border-default));
	position: sticky;
	top: 0;
	z-index: 100;
}
.header-left, .header-right {
	display: flex;
	align-items: center;
	gap: var(--space-2);
}
.logo-mark { flex-shrink: 0; }
.app-name {
	font-family: var(--font-family);
	font-weight: var(--font-semibold);
	font-size: var(--text-sm);
	color: hsl(var(--brand-default));
}
.incident-title {
	font-family: var(--font-family);
	font-weight: var(--font-semibold);
	font-size: var(--text-sm);
	color: hsl(var(--fg-default));
}
.header-sep { color: hsl(var(--fg-muted)); }
.header-meta {
	font-size: var(--text-xs);
	color: hsl(var(--fg-light));
}
.header-meta strong {
	color: hsl(var(--fg-default));
}

/* ── Stats Bar (mirrors IncidentStats.svelte) ── */
.stats-bar {
	display: flex;
	gap: var(--space-3);
	flex-wrap: wrap;
	padding: var(--space-2) var(--space-6);
	background: hsl(var(--bg-surface-75));
	border-bottom: var(--border-width) solid hsl(var(--border-muted));
}
.stat-card {
	display: flex;
	flex-direction: row;
	align-items: baseline;
	background: hsl(var(--bg-surface-100));
	border: var(--border-width) solid hsl(var(--border-default));
	border-radius: var(--radius-lg);
	padding: var(--space-2) var(--space-3);
}
.stat-value {
	font-family: var(--font-mono);
	font-weight: var(--font-semibold);
	font-size: var(--text-lg);
	line-height: var(--leading-tight);
	color: hsl(var(--fg-default));
}
.stat-label {
	font-family: var(--font-family);
	font-size: var(--text-xs);
	font-weight: var(--font-medium);
	text-transform: uppercase;
	letter-spacing: var(--tracking-wide);
	color: hsl(var(--fg-light));
	margin-left: var(--space-2);
}
.stat-total .stat-value { color: hsl(var(--fg-default)); }
.stat-events .stat-value { color: hsl(var(--info-default)); }
.stat-actions .stat-value { color: hsl(var(--brand-default)); }
.stat-entities .stat-value { color: hsl(var(--warning-default)); }
.stat-annotations .stat-value { color: hsl(var(--success-default)); }

/* ── Main Layout ── */
.main-content {
	display: flex;
	flex: 1;
	min-height: calc(100vh - 180px);
}
.timeline-section {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
}

/* ── Toolbar (SOP §10.15) ── */
.toolbar {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	padding: var(--space-2) var(--space-3);
	background: hsl(var(--bg-surface-200));
	border-bottom: var(--border-width) solid hsl(var(--border-default));
	min-height: 40px;
	flex-shrink: 0;
}
.toolbar-title {
	font-family: var(--font-family);
	font-size: var(--text-sm);
	font-weight: var(--font-semibold);
	color: hsl(var(--fg-light));
	text-transform: uppercase;
	letter-spacing: var(--tracking-wide);
}
.toolbar-spacer { flex: 1; }

/* ── Buttons (SOP §10.1) ── */
.btn-ghost {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: var(--space-2);
	padding: var(--space-1\\.5) var(--space-3);
	font-family: var(--font-family);
	font-size: var(--text-sm);
	font-weight: var(--font-medium);
	line-height: var(--leading-tight);
	color: hsl(var(--fg-light));
	background: transparent;
	border: var(--border-width) solid transparent;
	border-radius: var(--radius-md);
	cursor: pointer;
	transition: color var(--duration-normal) var(--ease-default),
	            background-color var(--duration-normal) var(--ease-default);
	white-space: nowrap;
}
.btn-ghost:hover {
	background: hsl(var(--bg-surface-200));
	color: hsl(var(--fg-default));
}
.btn-ghost.active {
	background: hsl(var(--bg-surface-300));
	color: hsl(var(--brand-default));
}
.btn-sm {
	padding: var(--space-1) var(--space-2);
	font-size: var(--text-xs);
	min-height: 24px;
}

/* ── Timeline List ── */
.timeline-list {
	display: flex;
	flex-direction: column;
	gap: var(--space-1);
	padding: var(--space-3);
	overflow-y: auto;
}

/* ── Timeline Item (mirrors TimelineRow.svelte) ── */
.timeline-item {
	display: flex;
	flex-direction: column;
	background: hsl(var(--bg-surface-100));
	border: var(--border-width) solid hsl(var(--border-default));
	border-radius: var(--radius-sm);
	font-family: var(--font-mono);
	font-size: var(--text-xs);
	line-height: var(--leading-snug);
	cursor: pointer;
	transition: background-color var(--duration-normal) var(--ease-default),
	            border-color var(--duration-normal) var(--ease-default);
}
.timeline-item:hover {
	background: hsl(var(--bg-surface-200));
	border-color: hsl(var(--border-strong));
}
.timeline-item.highlighted {
	border-color: hsl(var(--brand-default));
	box-shadow: 0 0 0 1px hsl(var(--brand-default) / 0.3);
}
.timeline-item:focus-visible {
	outline: var(--border-width-thick) solid hsl(var(--border-focus));
	outline-offset: 1px;
}

.main-row {
	display: flex;
	align-items: center;
	padding: var(--space-1) var(--space-3);
	gap: var(--space-3);
}
.data-row {
	display: flex;
	gap: var(--space-3);
	flex-wrap: nowrap;
	flex: 1;
	overflow: hidden;
}
.data-field {
	display: flex;
	align-items: baseline;
	gap: var(--space-1);
	min-width: fit-content;
	white-space: nowrap;
}
.field-prefix {
	color: hsl(var(--border-default));
	font-weight: var(--font-bold);
	user-select: none;
}
.field-label {
	font-size: var(--text-2xs);
	color: hsl(var(--fg-lighter));
	font-weight: var(--font-medium);
	text-transform: uppercase;
	letter-spacing: var(--tracking-wide);
}
.timestamp-field .field-label { color: hsl(var(--fg-muted)); }
.field-value {
	font-size: var(--text-xs);
	font-weight: var(--font-semibold);
	color: hsl(var(--fg-data));
	overflow: hidden;
	text-overflow: ellipsis;
}
.dynamic-field .field-prefix { color: hsl(var(--warning-default)); font-size: var(--text-2xs); }
.dynamic-field .field-label { color: hsl(var(--warning-default)); }
.dynamic-field .field-value { color: hsl(var(--fg-light)); }

.secondary-row {
	display: flex;
	align-items: center;
	padding: 0 var(--space-3) var(--space-1);
	gap: var(--space-2);
}
.note-snippet {
	font-style: italic;
	font-size: var(--text-2xs);
	color: hsl(var(--fg-lighter));
	flex: 1;
	line-height: var(--leading-snug);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.note-field { display: flex; gap: 2px; }
.note-prefix { color: hsl(var(--fg-muted)); user-select: none; }
.note-value { overflow: hidden; text-overflow: ellipsis; }

.type-badge {
	font-size: var(--text-2xs);
	font-weight: var(--font-semibold);
	padding: var(--space-0\\.5) var(--space-1\\.5);
	border-radius: var(--radius-sm);
	text-transform: uppercase;
	letter-spacing: var(--tracking-wide);
	border: var(--border-width) solid;
	white-space: nowrap;
	flex-shrink: 0;
}
.type-badge-event {
	color: hsl(var(--info-default));
	border-color: hsl(var(--info-default));
}
.type-badge-action {
	color: hsl(var(--brand-default));
	border-color: hsl(var(--brand-default));
}

/* ── Expanded Details (mirrors TimelineRowDetails.svelte) ── */
.expanded-details {
	width: 100%;
	background: hsl(var(--bg-surface-75));
	border: var(--border-width) solid hsl(var(--border-default));
	border-radius: var(--radius-sm);
	overflow: hidden;
}
.details-container {
	display: grid;
	grid-template-columns: 0.65fr 0.35fr;
	gap: var(--space-2);
	padding: var(--space-3);
}
.details-column, .graph-column {
	display: flex;
	flex-direction: column;
	min-height: 200px;
}
.column-header {
	font-size: var(--text-xs);
	font-weight: var(--font-semibold);
	color: hsl(var(--fg-light));
	text-transform: uppercase;
	letter-spacing: var(--tracking-wide);
	padding-bottom: var(--space-2);
	border-bottom: var(--border-width) solid hsl(var(--border-muted));
	margin-bottom: var(--space-2);
	user-select: none;
}
.details-grid {
	display: flex;
	flex-direction: column;
	font-family: var(--font-mono);
	font-size: var(--text-xs);
	line-height: var(--leading-snug);
}
.detail-item {
	display: grid;
	grid-template-columns: 180px 1fr;
	gap: var(--space-2);
	padding: 2px 0;
}
.detail-label {
	color: hsl(var(--fg-lighter));
	text-transform: uppercase;
	font-size: var(--text-2xs);
	font-weight: var(--font-medium);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.detail-value {
	color: hsl(var(--fg-data));
	white-space: pre-wrap;
	word-break: break-word;
	overflow-wrap: anywhere;
}
.json-viewer-slot {
	margin-left: var(--space-2);
	padding: var(--space-2);
	background: hsl(var(--bg-alternative));
	border-radius: var(--radius-sm);
	border: var(--border-width) solid hsl(var(--border-muted));
}

/* ── Relationship Tree ── */
.relationship-tree {
	font-family: var(--font-mono);
	font-size: var(--text-xs);
	color: hsl(var(--fg-default));
}
.tree-root {
	color: hsl(var(--brand-default));
	font-weight: var(--font-semibold);
	margin-bottom: var(--space-1);
}
.branch-header {
	color: hsl(var(--info-default));
	font-weight: var(--font-semibold);
}
.tree-node {
	display: flex;
	align-items: baseline;
	gap: var(--space-1);
	padding: 2px var(--space-1);
	flex-wrap: wrap;
	transition: background-color var(--duration-normal) var(--ease-default);
}
.tree-node:hover {
	background: hsl(var(--bg-surface-200));
	border-radius: var(--radius-xs);
}
.node-connector {
	color: hsl(var(--fg-muted));
	user-select: none;
	min-width: 20px;
	flex-shrink: 0;
}
.node-type {
	color: hsl(var(--warning-default));
	font-weight: var(--font-semibold);
	min-width: 80px;
	flex-shrink: 0;
}
.node-value {
	color: hsl(var(--fg-data));
	white-space: pre-wrap;
	word-break: break-word;
	overflow-wrap: anywhere;
}
.node-meta {
	color: hsl(var(--fg-lighter));
	font-style: italic;
	font-size: var(--text-2xs);
}
.tree-empty { padding-left: var(--space-1); color: hsl(var(--fg-muted)); }
.empty-text { color: hsl(var(--fg-lighter)); font-style: italic; }
.entity-node .node-type { color: hsl(var(--warning-default)); }
.event-node .node-type { color: hsl(var(--brand-default)); }

/* ── JSON Viewer (mirrors JsonViewer.svelte) ── */
.json-viewer-container {
	display: flex;
	overflow-y: auto;
	overflow-x: hidden;
	font-family: var(--font-mono);
	font-size: var(--text-xs);
	max-height: 128px;
}
.json-content {
	flex: 1;
	min-width: 0;
	overflow-x: auto;
	background: hsl(var(--bg-alternative));
	border-left: var(--border-width-thick) solid hsl(var(--border-default));
	padding: var(--space-1);
	border-radius: var(--radius-sm);
}
.json-line { line-height: 16px; height: 16px; white-space: pre; }
.json-token { white-space: pre; }
.json-key { color: hsl(var(--brand-default)); font-weight: var(--font-bold); }
.json-string { color: hsl(var(--success-default)); }
.json-number { color: hsl(var(--info-default)); }
.json-boolean { color: hsl(var(--warning-default)); font-weight: var(--font-bold); }
.json-null { color: hsl(var(--fg-muted)); font-style: italic; }
.json-punctuation { color: hsl(var(--fg-lighter)); }
.json-raw { color: hsl(var(--fg-default)); }

/* ── Side Panel (mirrors EntitiesAnnotationsPanel.svelte) ── */
.side-panel {
	width: 360px;
	border-left: var(--border-width) solid hsl(var(--border-default));
	overflow-y: auto;
	flex-shrink: 0;
}
.panel-container {
	background: hsl(var(--bg-surface-100));
	display: flex;
	flex-direction: column;
	max-height: calc(100vh - 120px);
	position: sticky;
	top: 50px;
}
.tab-headers {
	display: flex;
	border-bottom: var(--border-width) solid hsl(var(--border-muted));
}
.tab-btn {
	flex: 1;
	background: none;
	border: none;
	border-bottom: var(--border-width-thick) solid transparent;
	padding: var(--space-2) var(--space-3);
	color: hsl(var(--fg-light));
	font-family: var(--font-family);
	font-size: var(--text-xs);
	font-weight: var(--font-medium);
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--space-2);
	transition: color var(--duration-normal) var(--ease-default),
	            background-color var(--duration-normal) var(--ease-default);
	text-transform: uppercase;
	letter-spacing: var(--tracking-wide);
}
.tab-btn:hover {
	background: hsl(var(--bg-surface-200));
	color: hsl(var(--fg-default));
}
.tab-btn.active {
	color: hsl(var(--brand-default));
	border-bottom-color: hsl(var(--brand-default));
	background: hsl(var(--bg-surface-200));
}
.tab-icon { font-size: var(--text-sm); }
.tab-count {
	background: hsl(var(--bg-surface-300));
	padding: 2px var(--space-1\\.5);
	border-radius: var(--radius-sm);
	font-size: var(--text-2xs);
	line-height: var(--leading-none);
}
.tab-btn.active .tab-count {
	background: hsl(var(--brand-default));
	color: hsl(var(--fg-contrast));
}
.tab-content {
	flex: 1;
	overflow-y: auto;
	padding: var(--space-2);
}

/* ── Type Groups (Accordions) ── */
.type-group { margin-bottom: var(--space-1); }
.type-header {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	padding: var(--space-1\\.5) var(--space-2);
	background: hsl(var(--bg-surface-200));
	border-radius: var(--radius-sm);
	cursor: pointer;
	transition: background-color var(--duration-normal) var(--ease-default);
}
.type-header:hover { background: hsl(var(--bg-surface-300)); }
.expand-icon {
	font-size: var(--text-2xs);
	color: hsl(var(--fg-lighter));
	width: 12px;
}
.type-label {
	font-size: var(--text-xs);
	font-weight: var(--font-semibold);
	color: hsl(var(--brand-default));
	text-transform: uppercase;
	letter-spacing: var(--tracking-wide);
}
.type-count {
	font-size: var(--text-xs);
	color: hsl(var(--fg-lighter));
	margin-left: auto;
}
.type-items {
	padding-left: var(--space-2);
	border-left: var(--border-width) solid hsl(var(--border-muted));
	margin-left: var(--space-2);
	margin-top: var(--space-1);
}
.item-row {
	display: flex;
	align-items: baseline;
	gap: var(--space-2);
	padding: var(--space-1) var(--space-2);
	font-family: var(--font-mono);
	font-size: var(--text-xs);
	cursor: pointer;
	border-radius: var(--radius-sm);
	transition: background-color var(--duration-normal) var(--ease-default);
}
.item-row:hover { background: hsl(var(--bg-surface-200)); }
.item-connector { color: hsl(var(--border-strong)); user-select: none; }
.item-identifier {
	color: hsl(var(--fg-data));
	font-weight: var(--font-semibold);
	word-break: break-all;
}
.item-name { color: hsl(var(--fg-lighter)); font-style: italic; }
.item-content { color: hsl(var(--fg-data)); flex: 1; min-width: 0; }
.item-status, .item-confidence { font-size: var(--text-2xs); margin-left: auto; flex-shrink: 0; }
.status-active { color: hsl(var(--success-default)); }
.status-inactive { color: hsl(var(--fg-muted)); }
.status-unknown { color: hsl(var(--fg-muted)); }
.confidence-confirmed { color: hsl(var(--success-default)); }
.confidence-high { color: hsl(var(--info-default)); }
.confidence-medium { color: hsl(var(--warning-default)); }
.confidence-low { color: hsl(var(--destructive-default)); }
.confidence-unknown { color: hsl(var(--fg-muted)); }

/* ── Empty State (SOP §10.12) ── */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;
	padding: var(--space-10) var(--space-6);
	color: hsl(var(--fg-lighter));
}
.empty-state-icon {
	font-size: var(--text-3xl);
	display: block;
	margin-bottom: var(--space-3);
	opacity: 0.4;
}
.empty-state-title {
	font-size: var(--text-lg);
	font-weight: var(--font-semibold);
	color: hsl(var(--fg-light));
	margin-bottom: var(--space-2);
}
.empty-state-description {
	font-size: var(--text-sm);
	color: hsl(var(--fg-lighter));
	max-width: 400px;
	line-height: var(--leading-normal);
}

/* ── Footer ── */
.export-footer {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--space-2);
	padding: var(--space-2) var(--space-6);
	background: hsl(var(--bg-surface-75));
	border-top: var(--border-width) solid hsl(var(--border-muted));
	font-size: var(--text-2xs);
	color: hsl(var(--fg-muted));
}
.footer-sep { color: hsl(var(--fg-muted)); }

/* ── Print ── */
@media print {
	body { background: white; color: black; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
	.export-header { position: static; }
	.btn-ghost { display: none; }
	.timeline-item { break-inside: avoid; }
}
`;
}

// ════════════════════════════════════════════════════════════════════════════
// HTML Escaping Utility
// ════════════════════════════════════════════════════════════════════════════

function escapeHtml(str: string): string {
	if (!str) return '';
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
