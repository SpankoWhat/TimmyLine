<script lang="ts">
	import { 
		currentCachedEntities, 
		currentCachedAnnotations,
		currentCachedTimeline,
		entityTypes,
		annotationTypes,
		setHighlights,
		clearHighlights
	} from '$lib/stores/cacheStore';
	import { modalStore, createModalConfig } from '$lib/modals/ModalRegistry';
	import { fade, slide } from 'svelte/transition';
	import { SvelteSet } from 'svelte/reactivity';

	let activeTab: 'entities' | 'annotations' = $state('entities');
	let expandedTypes = $state(new SvelteSet<string>());

	// Group entities by type
	let entitiesByType = $derived(
		$currentCachedEntities.reduce((acc, entity) => {
			const type = entity.entity_type || 'unknown';
			if (!acc[type]) acc[type] = [];
			acc[type].push(entity);
			return acc;
		}, {} as Record<string, typeof $currentCachedEntities>)
	);

	// Group annotations by type
	let annotationsByType = $derived(
		$currentCachedAnnotations.reduce((acc, annotation) => {
			const type = annotation.annotation_type || 'unknown';
			if (!acc[type]) acc[type] = [];
			acc[type].push(annotation);
			return acc;
		}, {} as Record<string, typeof $currentCachedAnnotations>)
	);

	// Get type label from lookup tables
	function getEntityTypeLabel(typeId: string): string {
		const found = $entityTypes.find(t => t.name === typeId);
		return found?.name || typeId;
	}

	function getAnnotationTypeLabel(typeId: string): string {
		const found = $annotationTypes.find(t => t.name === typeId);
		return found?.name || typeId;
	}

	function toggleTypeExpanded(type: string) {
		if (expandedTypes.has(type)) {
			expandedTypes.delete(type);
		} else {
			expandedTypes.add(type);
		}
	}

	/**
	 * Find all timeline items (events/actions) that reference this entity
	 * and highlight them
	 */
	function highlightEntityReferences(entityUuid: string) {
		const matchingUuids: string[] = [];

		// Search through timeline items for this entity
		for (const item of $currentCachedTimeline) {
			if (item.type === 'event') {
				const eventEntities = (item.data as any).eventEntities || [];
				if (eventEntities.some((ee: any) => ee.entity?.uuid === entityUuid)) {
					matchingUuids.push(item.uuid);
				}
			} else if (item.type === 'action') {
				const actionEntities = (item.data as any).actionEntities || [];
				if (actionEntities.some((ae: any) => ae.entity?.uuid === entityUuid)) {
					matchingUuids.push(item.uuid);
				}
			}
		}

		if (matchingUuids.length > 0) {
			setHighlights(matchingUuids);
			// Scroll to first matching item
			scrollToItem(matchingUuids[0]);
		}
	}

	/**
	 * Find all timeline items that this annotation references and highlight them
	 */
	function highlightAnnotationReferences(annotationUuid: string) {
		const annotation = $currentCachedAnnotations.find(a => a.uuid === annotationUuid);
		if (!annotation) return;

		// Annotations may have a refers_to field pointing to an event/action
		const matchingUuids: string[] = [];
		
		if (annotation.refers_to) {
			// Check if it references an event or action in the timeline
			const matchingItem = $currentCachedTimeline.find(i => i.uuid === annotation.refers_to);
			if (matchingItem) {
				matchingUuids.push(matchingItem.uuid);
			}
		}

		if (matchingUuids.length > 0) {
			setHighlights(matchingUuids);
			scrollToItem(matchingUuids[0]);
		}
	}

	function scrollToItem(uuid: string) {
		// Use setTimeout to allow highlight to be applied first
		setTimeout(() => {
			const element = document.querySelector(`[data-timeline-uuid="${uuid}"]`);
			if (element) {
				element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
			}
		}, 50);
	}

	function editEntity(entity: any) {
		modalStore.open(createModalConfig('entity', 'edit', entity));
	}

	function editAnnotation(annotation: any) {
		modalStore.open(createModalConfig('annotation', 'edit', annotation));
	}

	function truncateText(text: string, maxLength: number = 60): string {
		if (!text) return '—';
		if (text.length <= maxLength) return text;
		return text.substring(0, maxLength) + '...';
	}

	function getConfidenceClass(confidence: string): string {
		switch (confidence) {
			case 'confirmed': return 'confidence-confirmed';
			case 'high': return 'confidence-high';
			case 'medium': return 'confidence-medium';
			case 'low': return 'confidence-low';
			default: return 'confidence-unknown';
		}
	}

	function getStatusClass(status: string): string {
		switch (status) {
			case 'active': return 'status-active';
			case 'inactive': return 'status-inactive';
			default: return 'status-unknown';
		}
	}
</script>

<div class="panel-container">
	<!-- Tab Headers -->
	<div class="tab-headers">
		<button 
			class="tab-btn" 
			class:active={activeTab === 'entities'}
			onclick={() => { activeTab = 'entities'; clearHighlights(); }}
		>
			<span class="tab-icon">◆</span>
			Entities
			<span class="tab-count">{$currentCachedEntities.length}</span>
		</button>
		<button 
			class="tab-btn"
			class:active={activeTab === 'annotations'}
			onclick={() => { activeTab = 'annotations'; clearHighlights(); }}
		>
			<span class="tab-icon">◇</span>
			Annotations
			<span class="tab-count">{$currentCachedAnnotations.length}</span>
		</button>
	</div>

	<!-- Tab Content -->
	<div class="tab-content">
		{#if activeTab === 'entities'}
			<div class="entities-list" transition:fade={{ duration: 150 }}>
				{#if Object.keys(entitiesByType).length === 0}
					<div class="empty-state">
						<span class="empty-icon">◇</span>
						<div class="empty-text">No entities found</div>
					</div>
				{:else}
					{#each Object.entries(entitiesByType) as [type, entities] (type)}
						<div class="type-group">
							<div 
								class="type-header" 
								onclick={() => toggleTypeExpanded(type)}
								onkeydown={(e) => e.key === 'Enter' && toggleTypeExpanded(type)}
								role="button"
								tabindex="0"
							>
								<span class="expand-icon">{expandedTypes.has(type) ? '▼' : '▶'}</span>
								<span class="type-label">{getEntityTypeLabel(type)}</span>
								<span class="type-count">({entities.length})</span>
							</div>
							{#if expandedTypes.has(type)}
								<div class="type-items" transition:slide={{ duration: 200 }}>
									{#each entities as entity (entity.uuid)}
										<div 
											class="item-row entity-row"
											onclick={() => highlightEntityReferences(entity.uuid)}
											ondblclick={() => editEntity(entity)}
											onkeydown={(e) => e.key === 'Enter' && highlightEntityReferences(entity.uuid)}
											role="button"
											tabindex="0"
											title="Click to highlight related timeline items. Double-click to edit."
										>
											<span class="item-connector">├─</span>
											<span class="item-identifier">{entity.identifier}</span>
											{#if entity.display_name && entity.display_name !== entity.identifier}
												<span class="item-name">({entity.display_name})</span>
											{/if}
											<span class="item-status {getStatusClass(entity.status || 'unknown')}">[{entity.status || 'unknown'}]</span>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				{/if}
			</div>
		{:else}
			<div class="annotations-list" transition:fade={{ duration: 150 }}>
				{#if Object.keys(annotationsByType).length === 0}
					<div class="empty-state">
						<span class="empty-icon">◇</span>
						<div class="empty-text">No annotations found</div>
					</div>
				{:else}
					{#each Object.entries(annotationsByType) as [type, annotations] (type)}
						<div class="type-group">
							<div 
								class="type-header"
								onclick={() => toggleTypeExpanded(type)}
								onkeydown={(e) => e.key === 'Enter' && toggleTypeExpanded(type)}
								role="button"
								tabindex="0"
							>
								<span class="expand-icon">{expandedTypes.has(type) ? '▼' : '▶'}</span>
								<span class="type-label">{getAnnotationTypeLabel(type)}</span>
								<span class="type-count">({annotations.length})</span>
							</div>
							{#if expandedTypes.has(type)}
								<div class="type-items" transition:slide={{ duration: 200 }}>
									{#each annotations as annotation (annotation.uuid)}
										<div 
											class="item-row annotation-row"
											onclick={() => highlightAnnotationReferences(annotation.uuid)}
											ondblclick={() => editAnnotation(annotation)}
											onkeydown={(e) => e.key === 'Enter' && highlightAnnotationReferences(annotation.uuid)}
											role="button"
											tabindex="0"
											title="Click to highlight related timeline items. Double-click to edit."
										>
											<span class="item-connector">├─</span>
											<span class="item-content">{truncateText(annotation.content)}</span>
											<span class="item-confidence {getConfidenceClass(annotation.confidence || 'unknown')}">[{annotation.confidence || 'unknown'}]</span>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				{/if}
			</div>
		{/if}
	</div>

	<!-- Footer with clear action -->
	<div class="panel-footer">
		<button class="clear-btn" onclick={clearHighlights}>
			Clear Highlights
		</button>
	</div>
</div>

<style>
	.panel-container {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-medium);
		border-radius: var(--border-radius-md);
		display: flex;
		flex-direction: column;
		max-height: 500px;
		min-width: 320px;
	}

	/* Tab Headers */
	.tab-headers {
		display: flex;
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.tab-btn {
		flex: 1;
		background: none;
		border: none;
		padding: var(--spacing-sm) var(--spacing-md);
		color: var(--color-text-secondary);
		font-size: var(--font-size-xs);
		font-family: inherit;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-xs);
		transition: all 0.2s;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.tab-btn:hover {
		background: var(--color-bg-hover);
		color: var(--color-text-primary);
	}

	.tab-btn.active {
		color: var(--color-accent-primary);
		border-bottom: 2px solid var(--color-accent-primary);
		background: var(--color-bg-tertiary);
	}

	.tab-icon {
		font-size: var(--font-size-sm);
	}

	.tab-count {
		background: var(--color-bg-tertiary);
		padding: 2px 6px;
		border-radius: var(--border-radius-sm);
		font-size: 10px;
	}

	.tab-btn.active .tab-count {
		background: var(--color-accent-primary);
		color: var(--color-bg-primary);
	}

	/* Tab Content */
	.tab-content {
		flex: 1;
		overflow-y: auto;
		padding: var(--spacing-sm);
	}

	/* Empty State */
	.empty-state {
		text-align: center;
		padding: var(--spacing-xl);
		color: var(--color-text-tertiary);
	}

	.empty-icon {
		font-size: 1.5rem;
		display: block;
		margin-bottom: var(--spacing-sm);
		opacity: 0.5;
	}

	.empty-text {
		font-size: var(--font-size-xs);
		font-style: italic;
	}

	/* Type Groups */
	.type-group {
		margin-bottom: var(--spacing-xs);
	}

	.type-header {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		padding: var(--spacing-xs) var(--spacing-sm);
		background: var(--color-bg-tertiary);
		border-radius: var(--border-radius-sm);
		cursor: pointer;
		transition: background 0.15s;
	}

	.type-header:hover {
		background: var(--color-bg-hover);
	}

	.expand-icon {
		font-size: 10px;
		color: var(--color-text-tertiary);
		width: 12px;
	}

	.type-label {
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-semibold);
		color: var(--color-accent-warning);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.type-count {
		font-size: var(--font-size-xs);
		color: var(--color-text-tertiary);
		margin-left: auto;
	}

	/* Item Rows */
	.type-items {
		padding-left: var(--spacing-sm);
		border-left: 1px solid var(--color-border-subtle);
		margin-left: var(--spacing-sm);
		margin-top: var(--spacing-xs);
	}

	.item-row {
		display: flex;
		align-items: baseline;
		gap: var(--spacing-xs);
		padding: var(--spacing-xs) var(--spacing-sm);
		font-family: 'JetBrains Mono', 'Courier New', monospace;
		font-size: var(--font-size-xs);
		cursor: pointer;
		border-radius: var(--border-radius-sm);
		transition: background 0.15s;
	}

	.item-row:hover {
		background: var(--color-bg-hover);
	}

	.item-connector {
		color: var(--color-border-medium);
		user-select: none;
	}

	.item-identifier {
		color: var(--color-text-primary);
		font-weight: var(--font-weight-semibold);
		word-break: break-all;
	}

	.item-name {
		color: var(--color-text-secondary);
		font-style: italic;
	}

	.item-content {
		color: var(--color-text-primary);
		flex: 1;
		min-width: 0;
	}

	/* Status badges */
	.item-status, .item-confidence {
		font-size: 9px;
		margin-left: auto;
		flex-shrink: 0;
	}

	.status-active { color: var(--color-accent-success); }
	.status-inactive { color: var(--color-text-tertiary); }
	.status-unknown { color: var(--color-text-tertiary); }

	.confidence-confirmed { color: var(--color-accent-success); }
	.confidence-high { color: var(--color-accent-primary); }
	.confidence-medium { color: var(--color-accent-warning); }
	.confidence-low { color: var(--color-accent-error); }
	.confidence-unknown { color: var(--color-text-tertiary); }

	/* Panel Footer */
	.panel-footer {
		padding: var(--spacing-xs) var(--spacing-sm);
		border-top: 1px solid var(--color-border-subtle);
	}

	.clear-btn {
		width: 100%;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border-medium);
		color: var(--color-text-secondary);
		cursor: pointer;
		font-size: var(--font-size-xs);
		padding: var(--spacing-xs) var(--spacing-sm);
		border-radius: var(--border-radius-sm);
		transition: all 0.2s;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.clear-btn:hover {
		border-color: var(--color-accent-primary);
		color: var(--color-accent-primary);
		background: rgba(0, 255, 0, 0.05);
	}
</style>
