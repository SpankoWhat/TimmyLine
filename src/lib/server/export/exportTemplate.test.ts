import { describe, expect, it } from 'vitest';

import { serializeForInlineScript } from './exportTemplate';

describe('serializeForInlineScript', () => {
	it('escapes closing script tags and HTML-significant characters', () => {
		const serialized = serializeForInlineScript({
			title: '</script><script>alert(1)</script>',
			note: 'alpha & beta < gamma > delta'
		});

		expect(serialized).not.toContain('</script>');
		expect(serialized).toContain('\\u003C/script\\u003E\\u003Cscript\\u003Ealert(1)\\u003C/script\\u003E');
		expect(serialized).toContain('alpha \\u0026 beta \\u003C gamma \\u003E delta');
	});
});