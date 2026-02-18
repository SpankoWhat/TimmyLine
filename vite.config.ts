import { sveltekit } from '@sveltejs/kit/vite';
import { socketPlugin } from './src/lib/server/socket/plugin';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit(), socketPlugin()]
});
