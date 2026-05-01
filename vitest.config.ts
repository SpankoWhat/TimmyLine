import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type PluginOption } from 'vitest/config';

const svelteKitPlugin = sveltekit() as unknown as PluginOption;

export default defineConfig({
	plugins: [svelteKitPlugin],
	test: {
		environment: 'node',
		include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			exclude: [
				'build/**',
				'node_modules/**',
				'src/**/*.d.ts',
				'src/**/*.svelte'
			]
		},
		isolate: true,
		pool: 'threads'
	}
});