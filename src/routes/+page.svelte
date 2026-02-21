<html lang="en" data-theme="dark">
	<head>
		<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
	</head>
</html>

<div class="landing-container">
	<div class="landing-card">
		<img src="/favicon.svg" alt="TimmyLine Logo" class="landing-logo" />
		<h1 class="landing-title">TimmyLine</h1>
		<p class="landing-subtitle">Timeline for Incident Responders - The better excel</p>
		<a href="/login" class="btn-primary landing-cta">Sign In</a>
	</div>
</div>

<style>
	.landing-container {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100vh;
		background: hsl(var(--bg-root));
	}

	.landing-card {
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.landing-logo {
		width: 48px;
		height: 48px;
		margin-bottom: var(--space-4);
	}

	.landing-title {
		font-size: var(--text-3xl);
		font-weight: var(--font-bold);
		color: hsl(var(--fg-default));
		margin: 0 0 var(--space-2) 0;
		letter-spacing: var(--tracking-tight);
		line-height: var(--leading-tight);
	}

	.landing-subtitle {
		font-size: var(--text-sm);
		color: hsl(var(--fg-light));
		margin: 0 0 var(--space-8) 0;
	}

	.btn-primary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: hsl(var(--brand-default));
		color: hsl(var(--fg-contrast));
		border-radius: var(--radius-md);
		padding: var(--space-2) var(--space-6);
		font-family: var(--font-family);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		text-decoration: none;
		cursor: pointer;
		transition: var(--transition-colors);
		line-height: var(--leading-tight);
	}

	.btn-primary:hover {
		background: hsl(var(--brand-600));
	}

	.btn-primary:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 2px;
	}
</style>
