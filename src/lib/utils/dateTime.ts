export const ABSOLUTE_TIME_FORMATS = ['iso-like', 'locale-short', 'utc-fixed'] as const;
export type AbsoluteTimeFormat = (typeof ABSOLUTE_TIME_FORMATS)[number];

export const TIME_DISPLAY_MODES = ['absolute', 'relative'] as const;
export type TimeDisplayMode = (typeof TIME_DISPLAY_MODES)[number];

export interface TimeDisplayPreferences {
	timezone: string;
	absoluteFormat: AbsoluteTimeFormat;
	displayMode: TimeDisplayMode;
	showTooltipAlternate: boolean;
}

export interface FormattedTimestampUi {
	text: string;
	tooltip: string | null;
	absolute: string;
	relative: string;
	epochSeconds: number | null;
}

export interface FormatTimestampOptions {
	locale?: string;
	nowEpochSeconds?: number;
}

const COMMON_EPOCH_FIELD_REGEX = /(timestamp|_at$|occurred|discovered|performed|created|updated|deleted|expires|last_used)/i;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function isValidTimeZone(timezone: string): boolean {
	if (!timezone || typeof timezone !== 'string') {
		return false;
	}

	try {
		new Intl.DateTimeFormat('en-US', { timeZone: timezone });
		return true;
	} catch {
		return false;
	}
}

export function detectSystemTimeZone(): string {
	const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
	return isValidTimeZone(detected) ? detected : 'UTC';
}

export function getDefaultTimePreferences(): TimeDisplayPreferences {
	return {
		timezone: detectSystemTimeZone(),
		absoluteFormat: 'locale-short',
		displayMode: 'absolute',
		showTooltipAlternate: true
	};
}

export function normalizeTimezone(timezone: unknown, fallback = detectSystemTimeZone()): string {
	if (typeof timezone !== 'string' || !isValidTimeZone(timezone)) {
		return fallback;
	}
	return timezone;
}

export function normalizeAbsoluteFormat(
	format: unknown,
	fallback: AbsoluteTimeFormat = 'locale-short'
): AbsoluteTimeFormat {
	if (typeof format !== 'string') {
		return fallback;
	}

	if ((ABSOLUTE_TIME_FORMATS as readonly string[]).includes(format)) {
		return format as AbsoluteTimeFormat;
	}

	return fallback;
}

export function normalizeDisplayMode(
	mode: unknown,
	fallback: TimeDisplayMode = 'absolute'
): TimeDisplayMode {
	if (typeof mode !== 'string') {
		return fallback;
	}

	if ((TIME_DISPLAY_MODES as readonly string[]).includes(mode)) {
		return mode as TimeDisplayMode;
	}

	return fallback;
}

export function sanitizeTimePreferences(
	value: unknown,
	fallback: TimeDisplayPreferences = getDefaultTimePreferences()
): TimeDisplayPreferences {
	const input = isRecord(value) ? value : {};

	return {
		timezone: normalizeTimezone(input.timezone, fallback.timezone),
		absoluteFormat: normalizeAbsoluteFormat(input.absoluteFormat, fallback.absoluteFormat),
		displayMode: normalizeDisplayMode(input.displayMode, fallback.displayMode),
		showTooltipAlternate:
			typeof input.showTooltipAlternate === 'boolean'
				? input.showTooltipAlternate
				: fallback.showTooltipAlternate
	};
}

export function normalizeEpoch(value: unknown): number | null {
	if (value === null || value === undefined) {
		return null;
	}

	let numericValue: number;

	if (value instanceof Date) {
		numericValue = value.getTime();
	} else if (typeof value === 'string') {
		numericValue = Number(value);
	} else if (typeof value === 'number') {
		numericValue = value;
	} else {
		return null;
	}

	if (!Number.isFinite(numericValue)) {
		return null;
	}

	const abs = Math.abs(numericValue);
	if (abs > 1e11) {
		return Math.trunc(numericValue / 1000);
	}

	return Math.trunc(numericValue);
}

function toDateFromEpoch(value: unknown): Date | null {
	const epochSeconds = normalizeEpoch(value);
	if (epochSeconds === null) {
		return null;
	}

	return new Date(epochSeconds * 1000);
}

function partsToObject(parts: Intl.DateTimeFormatPart[]): Record<string, string> {
	const collected: Record<string, string> = {};
	for (const part of parts) {
		if (part.type !== 'literal') {
			collected[part.type] = part.value;
		}
	}
	return collected;
}

function formatIsoLike(date: Date, timezone: string): string {
	const formatter = new Intl.DateTimeFormat('en-CA', {
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

	const p = partsToObject(formatter.formatToParts(date));
	const year = p.year ?? '0000';
	const month = p.month ?? '00';
	const day = p.day ?? '00';
	const hour = p.hour ?? '00';
	const minute = p.minute ?? '00';
	const second = p.second ?? '00';
	const zone = p.timeZoneName ?? timezone;

	return `${year}-${month}-${day} ${hour}:${minute}:${second} ${zone}`;
}

function formatUtcFixed(date: Date): string {
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, '0');
	const day = String(date.getUTCDate()).padStart(2, '0');
	const hour = String(date.getUTCHours()).padStart(2, '0');
	const minute = String(date.getUTCMinutes()).padStart(2, '0');
	const second = String(date.getUTCSeconds()).padStart(2, '0');

	return `${year}-${month}-${day} ${hour}:${minute}:${second} UTC`;
}

export function resolveTimePreferences(preferences?: Partial<TimeDisplayPreferences> | null): TimeDisplayPreferences {
	const defaults = getDefaultTimePreferences();
	return sanitizeTimePreferences(preferences ?? {}, defaults);
}

export function formatAbsoluteTimestamp(
	epoch: unknown,
	preferences?: Partial<TimeDisplayPreferences> | null,
	options: FormatTimestampOptions = {}
): string {
	const date = toDateFromEpoch(epoch);
	if (!date) {
		return '—';
	}

	const resolved = resolveTimePreferences(preferences);
	const format = normalizeAbsoluteFormat(resolved.absoluteFormat, 'locale-short');
	const timezone = normalizeTimezone(resolved.timezone, detectSystemTimeZone());

	if (format === 'utc-fixed') {
		return formatUtcFixed(date);
	}

	if (format === 'iso-like') {
		return formatIsoLike(date, timezone);
	}

	return new Intl.DateTimeFormat(options.locale, {
		timeZone: timezone,
		dateStyle: 'medium',
		timeStyle: 'short'
	}).format(date);
}

export function formatRelativeTimestamp(epoch: unknown, nowEpochSeconds?: number): string {
	const target = normalizeEpoch(epoch);
	if (target === null) {
		return '—';
	}

	const now = normalizeEpoch(nowEpochSeconds) ?? Math.floor(Date.now() / 1000);
	const delta = target - now;
	const absDelta = Math.abs(delta);

	if (absDelta < 10) {
		return 'just now';
	}

	const units: Array<[label: string, size: number]> = [
		['y', 31_536_000],
		['mo', 2_592_000],
		['w', 604_800],
		['d', 86_400],
		['h', 3_600],
		['m', 60],
		['s', 1]
	];

	for (const [label, size] of units) {
		if (absDelta >= size) {
			const amount = Math.floor(absDelta / size);
			return delta < 0 ? `${amount}${label} ago` : `in ${amount}${label}`;
		}
	}

	return 'just now';
}

export function formatTimestampForUi(
	epoch: unknown,
	preferences?: Partial<TimeDisplayPreferences> | null,
	options: FormatTimestampOptions = {}
): FormattedTimestampUi {
	const resolved = resolveTimePreferences(preferences);
	const absolute = formatAbsoluteTimestamp(epoch, resolved, options);
	const relative = formatRelativeTimestamp(epoch, options.nowEpochSeconds);
	const text = resolved.displayMode === 'relative' ? relative : absolute;

	let tooltip: string | null = null;
	if (resolved.showTooltipAlternate) {
		tooltip = resolved.displayMode === 'relative' ? absolute : relative;
	}

	return {
		text,
		tooltip,
		absolute,
		relative,
		epochSeconds: normalizeEpoch(epoch)
	};
}

export function getTimelineDateKey(epoch: unknown, timezone: string): string {
	const date = toDateFromEpoch(epoch);
	if (!date) {
		return 'unknown-date';
	}

	const safeTimeZone = normalizeTimezone(timezone, detectSystemTimeZone());
	const formatter = new Intl.DateTimeFormat('en-CA', {
		timeZone: safeTimeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	});

	const parts = partsToObject(formatter.formatToParts(date));
	const year = parts.year ?? '0000';
	const month = parts.month ?? '00';
	const day = parts.day ?? '00';
	return `${year}-${month}-${day}`;
}

export function isCommonEpochFieldKey(fieldKey: string): boolean {
	return COMMON_EPOCH_FIELD_REGEX.test(fieldKey);
}

export function formatIfEpochField(
	fieldKey: string,
	value: unknown,
	preferences?: Partial<TimeDisplayPreferences> | null,
	options: FormatTimestampOptions = {}
): string | null {
	if (!isCommonEpochFieldKey(fieldKey)) {
		return null;
	}

	if (normalizeEpoch(value) === null) {
		return null;
	}

	return formatTimestampForUi(value, preferences, options).text;
}

export function formatCommonEpochFields(
	record: Record<string, unknown>,
	preferences?: Partial<TimeDisplayPreferences> | null,
	options: FormatTimestampOptions = {}
): Record<string, string> {
	const formatted: Record<string, string> = {};

	for (const [key, value] of Object.entries(record)) {
		const maybeFormatted = formatIfEpochField(key, value, preferences, options);
		if (maybeFormatted !== null) {
			formatted[key] = maybeFormatted;
		}
	}

	return formatted;
}
