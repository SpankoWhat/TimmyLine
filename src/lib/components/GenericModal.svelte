<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { modalStore } from '$lib/stores/modalStore';
	import { entityFieldConfigs, type FieldConfig } from '$lib/config/modalFields';
	import { 
		eventTypes, 
		actionTypes, 
		entityTypes, 
		annotationTypes
	} from '$lib/stores/cacheStore';
	import { emitRowEditing, emitRowIdle } from '$lib/stores/presenceStore';
	
	let formData = $state<Record<string, any>>({});
	let errors = $state<Record<string, string>>({});
	let isSubmitting = $state(false);
	let editingRowUuid: string | null = null;

	let currentModal = $derived($modalStore);
	
	// Initialize formData keys and defaults values by passing in currentModal.entityType 
	// by dynamically deciding based on the currentModal mode (create/edit)
	$effect(() => {
		if (currentModal?.isOpen) {
			const fields = entityFieldConfigs[currentModal.entityType] || [];
			const newFormData: Record<string, any> = {};
			
			fields.forEach(field => {
				if (currentModal.mode === 'edit' && currentModal.data) {
					newFormData[field.key] = currentModal.data[field.key];
				} else {
					newFormData[field.key] = field.defaultValue ?? '';
				}
			});
			
			formData = newFormData;
			
			// Emit editing presence if we have a UUID
			if (currentModal.mode === 'edit' && currentModal.data?.uuid) {
				editingRowUuid = currentModal.data.uuid;
				if (editingRowUuid) {
					emitRowEditing(editingRowUuid);
				}
			}
		} else if (editingRowUuid) {
			// Modal closed, emit idle
			emitRowIdle();
			editingRowUuid = null;
		}
	});
	
	// Enrich fields with options from the cached lookup stores
	// Will also be used loop through in the form rendering
	let enrichedFields = $derived.by(() => {
		if (!currentModal?.isOpen) return [];
		
		const fields = entityFieldConfigs[currentModal.entityType] || [];
		
		return fields.map(field => {
			const enrichedField = { ...field };
			
			if (field.key === 'event_type') {
				enrichedField.options = $eventTypes.map(et => ({
					value: et.name,
					label: et.name
				}));
			} else if (field.key === 'action_type') {
				enrichedField.options = $actionTypes.map(at => ({
					value: at.name,
					label: at.name
				}));
			} else if (field.key === 'entity_type') {
				enrichedField.options = $entityTypes.map(et => ({
					value: et.name,
					label: et.name
				}));
			} else if (field.key === 'annotation_type') {
				enrichedField.options = $annotationTypes.map(at => ({
					value: at.name,
					label: at.name
				}));
			}
			
			return enrichedField;
		}) as FieldConfig[];
	});
	
	function validateField(field: FieldConfig, value: any): string | null {
		if (field.required && (!value || value === '')) {
			return `${field.label} is required`;
		}
		
		if (field.validation) {
			return field.validation(value);
		}
		
		return null;
	}
	
	async function handleSubmit() {
		const currentModal = $modalStore;
		if (!currentModal) return;
		
		// Validate all fields
		errors = {};
		const fields = entityFieldConfigs[currentModal.entityType];
		let hasErrors = false;
		
		fields.forEach(field => {
			const error = validateField(field, formData[field.key]);
			if (error) {
				errors[field.key] = error;
				hasErrors = true;
			}
		});
		
		if (hasErrors) return;
		
		// Submit
		isSubmitting = true;
		try {
			if (currentModal.onSubmit) {
				await currentModal.onSubmit(formData);
			}
			modalStore.close();
		} catch (error) {
			console.error('Form submission error:', error);
			// Show error to user (could add a toast notification here)
		} finally {
			isSubmitting = false;
		}
	}
	
	function handleCancel() {
		if (currentModal?.onCancel) {
			currentModal.onCancel();
		}
		// Emit idle before closing
		if (editingRowUuid) {
			emitRowIdle();
			editingRowUuid = null;
		}
		modalStore.close();
	}
	
	function convertToEpoch(dateTimeLocalValue: string): number {
		if (!dateTimeLocalValue) return Date.now();
		return new Date(dateTimeLocalValue).getTime();
	}
	
	function convertFromEpoch(epochTime: number): string {
		if (!epochTime) return '';
		const date = new Date(epochTime);
		// Format as YYYY-MM-DDTHH:mm for datetime-local input
		return date.toISOString().slice(0, 16);
	}
</script>

{#if $modalStore}
	<!-- Modal Overlay -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="modal-overlay" onclick={handleCancel}>
		<!-- Modal Container -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="modal-container" onclick={(e) => e.stopPropagation()}>
			<!-- Modal Header -->
			<div class="modal-header">
				<div class="header-content">
					<span class="header-icon">
						{$modalStore.mode === 'create' ? '➕' : $modalStore.mode === 'edit' ? '✏️' : $modalStore.mode === 'delete' ? '🗑️' : '👁️'}
					</span>
					<h2 class="header-title">
						{$modalStore.mode} {$modalStore.title}
					</h2>
				</div>
				<button class="close-btn" onclick={handleCancel}>✕</button>
			</div>
			
			<!-- Modal Body -->
			<div class="modal-body">
				<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="modal-form">
					{#each enrichedFields as field}
						{@const error = errors[field.key]}
						
						<div class="field-group">
							<div class="field-label">
								{field.label}
								{#if field.required}
									<span class="field-required">*</span>
								{/if}
							</div>
							
							{#if field.type === 'text'}
								<input
									type="text"
									class="field-input"
									bind:value={formData[field.key]}
									placeholder={field.placeholder}
									required={field.required} />
									
							{:else if field.type === 'textarea'}
								<textarea
									class="field-textarea"
									bind:value={formData[field.key]}
									placeholder={field.placeholder}
									rows="4"
									required={field.required}></textarea>
									
							{:else if field.type === 'select'}
								<select
									class="field-select"
									bind:value={formData[field.key]}
									required={field.required}>
									<option value="">Select {field.label}</option>
									{#each field.options || [] as option}
										<option value={option.value}>{option.label}</option>
									{/each}
								</select>
								
							{:else if field.type === 'datetime'}
								<input
									type="datetime-local"
									class="field-input"
									value={formData[field.key] ? convertFromEpoch(formData[field.key]) : ''}
									oninput={(e) => {
										formData[field.key] = convertToEpoch(e.currentTarget.value);
									}}
									required={field.required} />
									
							{:else if field.type === 'number'}
								<input
									type="number"
									class="field-input"
									bind:value={formData[field.key]}
									placeholder={field.placeholder}
									required={field.required} />
							{:else if field.type === 'checkbox'}
								<input
									type="checkbox"
									class="field-input checkbox-input"
									bind:checked={formData[field.key]}
									required={field.required} />
							{/if}
							
							{#if error}
								<p class="field-error">
									<span>⚠</span> {error}
								</p>
							{/if}
							
							{#if field.helpText}
								<p class="field-help">{field.helpText}</p>
							{/if}
						</div>
					{/each}
				</form>
			</div>
			
			<!-- Modal Footer -->
			<div class="modal-footer">
				<button type="button" class="btn btn-cancel" onclick={handleCancel}>
					Cancel
				</button>
				<button
					type="submit"
					class="btn btn-submit"
					onclick={handleSubmit}
					disabled={isSubmitting}>
					{#if isSubmitting}
						<span class="spinner">⚙️</span>
						<span>Submitting...</span>
					{:else}
						<span>{$modalStore.mode === 'create' ? 'Create' : 'Save'}</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(4px);
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--spacing-lg);
	}

	.modal-container {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-medium);
		border-radius: var(--border-radius-lg);
		box-shadow: var(--shadow-md);
		max-width: 600px;
		width: 100%;
		max-height: 90vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.modal-header {
		background: var(--color-bg-tertiary);
		border-bottom: 1px solid var(--color-border-subtle);
		padding: var(--spacing-lg);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
	}

	.header-icon {
		font-size: var(--font-size-lg);
	}

	.header-title {
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.close-btn {
		background: transparent;
		border: none;
		color: var(--color-accent-error);
		font-size: var(--font-size-lg);
		cursor: pointer;
		transition: all var(--transition-fast);
		padding: var(--spacing-xs);
		line-height: 1;
	}

	.close-btn:hover {
		transform: scale(1.1);
		color: var(--color-text-primary);
	}

	.modal-body {
		padding: var(--spacing-lg);
		overflow-y: auto;
		max-height: calc(90vh - 180px);
	}

	.modal-form {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
	}

	.field-group {
		display: flex;
		flex-direction: column;
	}

	.field-label {
		display: block;
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		position: relative;
		top: 8px;
		left: 4px;
	}

	.field-required {
		color: var(--color-accent-error);
	}

	.field-input,
	.field-textarea,
	.field-select {
		width: 100%;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border-medium);
		border-radius: var(--border-radius-sm);
		padding: var(--spacing-sm) var(--spacing-md);
		color: var(--color-text-primary);
		font-size: var(--font-size-sm);
		transition: all var(--transition-fast);
	}

	.field-input::placeholder,
	.field-textarea::placeholder {
		color: var(--color-text-dim);
	}

	.field-input:focus,
	.field-textarea:focus,
	.field-select:focus {
		outline: none;
		border-color: var(--color-accent-primary);
	}

	.field-textarea {
		resize: vertical;
		min-height: 80px;
	}

	.field-select {
		cursor: pointer;
	}

	.field-error {
		color: var(--color-accent-error);
		font-size: var(--font-size-xs);
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
	}

	.field-help {
		color: var(--color-text-tertiary);
		font-size: var(--font-size-xs);
	}

	.modal-footer {
		background: var(--color-bg-tertiary);
		border-top: 1px solid var(--color-border-subtle);
		padding: var(--spacing-lg);
		display: flex;
		justify-content: flex-end;
		gap: var(--spacing-md);
	}

	.btn {
		padding: var(--spacing-sm) var(--spacing-lg);
		border-radius: var(--border-radius-sm);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		cursor: pointer;
		transition: all var(--transition-fast);
		border: 1px solid var(--color-border-medium);
	}

	.btn-cancel {
		background: var(--color-bg-secondary);
		color: var(--color-text-secondary);
	}

	.btn-cancel:hover {
		background: var(--color-bg-hover);
		color: var(--color-text-primary);
	}

	.btn-submit {
		background: var(--color-accent-primary);
		color: var(--color-bg-primary);
		border-color: var(--color-accent-primary);
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.btn-submit:hover:not(:disabled) {
		background: var(--color-accent-secondary);
		border-color: var(--color-accent-secondary);
	}

	.btn-submit:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.spinner {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	/* Custom scrollbar */
	.modal-body::-webkit-scrollbar {
		width: 8px;
	}

	.modal-body::-webkit-scrollbar-track {
		background: var(--color-bg-primary);
	}

	.modal-body::-webkit-scrollbar-thumb {
		background: var(--color-border-strong);
		border-radius: var(--border-radius-sm);
	}

	.modal-body::-webkit-scrollbar-thumb:hover {
		background: var(--color-text-dim);
	}

	/* Datetime input styling */
	input[type="datetime-local"]::-webkit-calendar-picker-indicator {
		filter: invert(0.7);
		cursor: pointer;
	}
</style>