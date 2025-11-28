<script lang="ts">
    import { goto } from '$app/navigation';
    type buttonLists = 'relate' | 'create' | 'config' | '';

    let currentButtonList = $state<buttonLists>('')
</script>

<!-- Left: Navigation -->
<div class="dock-section">
    <button class="action-btn home" onclick={() => goto("/")} title="Home">Home</button>
</div>

<!-- Center: Main Actions -->
<div class="dock-section">
	<!-- Create Entities -->
	<div class="dropdown-wrapper">
		<button class="action-btn create" onclick={() => currentButtonList = 'create'}>Create</button>
		{#if currentButtonList === 'create'}
			<div class="dropdown-menu">
				<button class="dropdown-item" onclick={() => openModal("timeline_event")}>Timeline Event</button>
				<button class="dropdown-item" onclick={() => openModal("entity")}>Entity</button>
				<button class="dropdown-item" onclick={() => openModal("investigation_action")}>Investigation Action</button>
				<button class="dropdown-item" onclick={() => openModal("annotation")}>Annotation</button>
			</div>
		{/if}
	</div>

	<!-- Relate Entities -->
	<div class="dropdown-wrapper">
		<button class="action-btn relate" onclick={() => currentButtonList = 'relate'}>Relate</button>
		{#if currentButtonList === 'relate'}
			<div class="dropdown-menu">
				<button class="dropdown-item" onclick={() => openRelationModal("ActionEventsRelation")}>Action → Events</button>
				<button class="dropdown-item" onclick={() => openRelationModal("ActionEntitiesRelation")}>Action → Entities</button>
				<button class="dropdown-item" onclick={() => openRelationModal("EventEntitiesRelation")}>Event → Entities</button>
			</div>
		{/if}
	</div>

	<!-- Configure Database -->
	<div class="dropdown-wrapper">
		<button class="action-btn config" onclick={() => currentButtonList = 'config'}>Configure</button>
		{#if currentButtonList === 'config'}
			<div class="dropdown-menu">
				<button class="dropdown-item" onclick={() => openModal("action_type")}>Action Type</button>
				<button class="dropdown-item" onclick={() => openModal("entity_type")}>Entity Type</button>
				<button class="dropdown-item" onclick={() => openModal("event_type")}>Event Type</button>
				<button class="dropdown-item" onclick={() => openModal("annotation_type")}>Annotation Type</button>
				<button class="dropdown-item" onclick={() => openModal("analyst")}>Analyst</button>
			</div>
		{/if}
	</div>
</div>

<!-- Right: Filler -->
<div class="dock-section"></div>


<style>
    .dock-section {
		display: flex;
		gap: var(--spacing-sm);
		align-items: center;
	}

	.dropdown-wrapper {
		position: relative;
	}

	.action-btn {
		padding: var(--spacing-xs) var(--spacing-md);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border-medium);
		border-radius: var(--border-radius-sm);
		color: var(--color-text-primary);
		font-weight: var(--font-weight-medium);
		font-size: var(--font-size-xs);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		cursor: pointer;
		transition: all var(--transition-fast);
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
	}

	.action-btn:hover {
		background: var(--color-bg-hover);
		border-color: var(--color-accent-primary);
	}

	.action-btn:active {
		transform: scale(0.98);
	}

	.action-btn.create {
		border-color: var(--color-accent-success);
		color: var(--color-accent-success);
	}

	.action-btn.home {
		border-color: var(--color-border-subtle);
		color: var(--color-accennt-primary);
	}

	.action-btn.create:hover {
		border-color: var(--color-accent-success);
		background: rgba(52, 211, 153, 0.1);
	}

	.action-btn.relate {
		border-color: var(--color-accent-secondary);
		color: var(--color-accent-secondary);
	}

	.action-btn.relate:hover {
		border-color: var(--color-accent-secondary);
		background: rgba(129, 140, 248, 0.1);
	}

	.action-btn.config {
		border-color: var(--color-accent-warning);
		color: var(--color-accent-warning);
	}

	.action-btn.config:hover {
		border-color: var(--color-accent-warning);
		background: rgba(251, 191, 36, 0.1);
	}

	.dropdown-menu {
		position: absolute;
		bottom: calc(100% + var(--spacing-xs));
		left: 50%;
		transform: translateX(-50%);
		z-index: 100;
		min-width: 180px;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-medium);
		border-radius: var(--border-radius-md);
		overflow: hidden;
		box-shadow: var(--shadow-md);
	}
	.dropdown-menu.other-menu {
		right: 0;
		left: auto;
		transform: none;
	}

	.dropdown-item {
		display: block;
		width: 100%;
		padding: var(--spacing-sm) var(--spacing-md);
		text-align: left;
		color: var(--color-text-primary);
		font-size: var(--font-size-xs);
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--color-border-subtle);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.dropdown-item:last-child {
		border-bottom: none;
	}

	.dropdown-item:hover {
		background: var(--color-bg-hover);
		color: var(--color-accent-primary);
	}
</style>