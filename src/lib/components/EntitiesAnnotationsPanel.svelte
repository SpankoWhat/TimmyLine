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
						<span class="empty-state-icon">◇</span>
						<div class="empty-state-title">No entities found</div>
						<div class="empty-state-description">Entities linked to this incident will appear here.</div>
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
						<span class="empty-state-icon">◇</span>
						<div class="empty-state-title">No annotations found</div>
						<div class="empty-state-description">Annotations for this incident will appear here.</div>
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
		background: hsl(var(--bg-surface-100));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-lg);
		display: flex;
		flex-direction: column;
		max-height: 500px;
		min-width: 320px;
	}

	/* Tab Headers */
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
		transition: var(--transition-colors);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}

	.tab-btn:hover {
		background: hsl(var(--bg-surface-200));
		color: hsl(var(--fg-default));
	}

	.tab-btn:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: -2px;
	}

	.tab-btn.active {
		color: hsl(var(--brand-default));
		border-bottom-color: hsl(var(--brand-default));
		background: hsl(var(--bg-surface-200));
	}

	.tab-icon {
		font-size: var(--text-sm);
	}

	.tab-count {
		background: hsl(var(--bg-surface-300));
		padding: var(--space-0\.5) var(--space-1\.5);
		border-radius: var(--radius-sm);
		font-size: var(--text-2xs);
		line-height: var(--leading-none);
	}

	.tab-btn.active .tab-count {
		background: hsl(var(--brand-default));
		color: hsl(var(--fg-contrast));
	}

	/* Tab Content */
	.tab-content {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-2);
	}

	/* Empty State — SOP §10.12 */
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

	/* Type Groups */
	.type-group {
		margin-bottom: var(--space-1);
	}

	.type-header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-1\.5) var(--space-2);
		background: hsl(var(--bg-surface-200));
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: var(--transition-colors);
	}

	.type-header:hover {
		background: hsl(var(--bg-surface-300));
	}

	.type-header:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 1px;
	}

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

	/* Item Rows */
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
		transition: var(--transition-colors);
	}

	.item-row:hover {
		background: hsl(var(--bg-surface-200));
	}

	.item-row:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 1px;
	}

	.item-connector {
		color: hsl(var(--border-strong));
		user-select: none;
	}

	.item-identifier {
		color: hsl(var(--fg-data));
		font-weight: var(--font-semibold);
		word-break: break-all;
	}

	.item-name {
		color: hsl(var(--fg-lighter));
		font-style: italic;
	}

	.item-content {
		color: hsl(var(--fg-data));
		flex: 1;
		min-width: 0;
	}

	/* Status badges */
	.item-status,
	.item-confidence {
		font-size: var(--text-2xs);
		margin-left: auto;
		flex-shrink: 0;
	}

	.status-active {
		color: hsl(var(--success-default));
	}
	.status-inactive {
		color: hsl(var(--fg-muted));
	}
	.status-unknown {
		color: hsl(var(--fg-muted));
	}

	.confidence-confirmed {
		color: hsl(var(--success-default));
	}
	.confidence-high {
		color: hsl(var(--info-default));
	}
	.confidence-medium {
		color: hsl(var(--warning-default));
	}
	.confidence-low {
		color: hsl(var(--destructive-default));
	}
	.confidence-unknown {
		color: hsl(var(--fg-muted));
	}

	/* Panel Footer */
	.panel-footer {
		padding: var(--space-2);
		border-top: var(--border-width) solid hsl(var(--border-muted));
	}

	.clear-btn {
		width: 100%;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		padding: var(--space-1\.5) var(--space-3);
		font-family: var(--font-family);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		line-height: var(--leading-tight);
		color: hsl(var(--fg-default));
		background: hsl(var(--bg-surface-100));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: var(--transition-colors);
		min-height: 32px;
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}

	.clear-btn:hover {
		background: hsl(var(--bg-surface-300));
		border-color: hsl(var(--border-strong));
	}

	.clear-btn:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 2px;
	}
</style>
