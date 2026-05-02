import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

function parseArgs(argv) {
	const options = {
		format: 'sh',
		secretId: process.env.TIMMYLINE_AWS_SECRET_ID,
		region: process.env.TIMMYLINE_AWS_SECRET_REGION || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];

		if (arg === '--format') {
			options.format = argv[index + 1] || options.format;
			index += 1;
			continue;
		}

		if (arg === '--secret-id') {
			options.secretId = argv[index + 1] || options.secretId;
			index += 1;
			continue;
		}

		if (arg === '--region') {
			options.region = argv[index + 1] || options.region;
			index += 1;
		}
	}

	return options;
}

function escapeSh(value) {
	return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}

function escapePowerShell(value) {
	return `'${String(value).replace(/'/g, `''`)}'`;
}

function formatAssignment(format, key, value) {
	if (format === 'powershell') {
		return `$env:${key} = ${escapePowerShell(value)}`;
	}

	return `export ${key}=${escapeSh(value)}`;
}

function normalizeSecretEntries(secretValue) {
	if (!secretValue || typeof secretValue !== 'object' || Array.isArray(secretValue)) {
		throw new Error('SecretString must decode to a JSON object of environment variable names to values');
	}

	return Object.entries(secretValue).flatMap(([key, value]) => {
		if (!/^[A-Z0-9_]+$/.test(key)) {
			throw new Error(`Invalid environment variable name in secret payload: ${key}`);
		}

		if (value === null || value === undefined) {
			return [];
		}

		if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
			return [[key, String(value)]];
		}

		throw new Error(`Unsupported value type for ${key}; expected string, number, or boolean`);
	});
}

async function loadSecret(options) {
	if (!options.secretId) {
		throw new Error('Missing secret id. Set TIMMYLINE_AWS_SECRET_ID or pass --secret-id');
	}

	if (!options.region) {
		throw new Error('Missing AWS region. Set TIMMYLINE_AWS_SECRET_REGION, AWS_REGION, or pass --region');
	}

	const client = new SecretsManagerClient({ region: options.region });
	const response = await client.send(
		new GetSecretValueCommand({
			SecretId: options.secretId
		})
	);

	if (!response.SecretString) {
		throw new Error('Secrets Manager returned no SecretString payload');
	}

	return normalizeSecretEntries(JSON.parse(response.SecretString));
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	const format = options.format.toLowerCase();

	if (format !== 'sh' && format !== 'powershell') {
		throw new Error(`Unsupported format: ${options.format}. Use sh or powershell`);
	}

	const entries = await loadSecret(options);
	const lines = entries.map(([key, value]) => formatAssignment(format, key, value));
	process.stdout.write(lines.join('\n'));
	if (lines.length > 0) {
		process.stdout.write('\n');
	}
}

main().catch((error) => {
	const message = error instanceof Error ? error.message : String(error);
	process.stderr.write(`[aws-secrets-env] ${message}\n`);
	process.exit(1);
});