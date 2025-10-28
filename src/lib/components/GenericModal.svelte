<script lang="ts">
	import { modalStore } from '$lib/stores/modalStore';
	import { entityFieldConfigs, type FieldConfig } from '$lib/config/modalFields';
	import { 
		eventTypes, 
		actionTypes, 
		entityTypes, 
		annotationTypes
	} from '$lib/stores/cacheStore';
	
	let formData = $state<Record<string, any>>({});
	let errors = $state<Record<string, string>>({});
	let isSubmitting = $state(false);

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
	<div 
		class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
		onclick={handleCancel}>
		
		<!-- Modal Container -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div 
			class="bg-slate-950/95 border-2 border-cyan-500/50 rounded-lg shadow-2xl shadow-cyan-500/30 max-w-2xl w-full max-h-[90vh] overflow-hidden"
			onclick={(e) => e.stopPropagation()}>
			
			<!-- Modal Header -->
			<div class="bg-slate-900/80 border-b border-cyan-500/30 px-6 py-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<span class="text-cyan-500 text-2xl">
							{$modalStore.mode === 'create' ? '➕' : $modalStore.mode === 'edit' ? '✏️' : $modalStore.mode === 'delete' ? '🗑️' : '👁️'}
						</span>
						<h2 class="text-xl font-bold text-cyan-400 uppercase tracking-wider font-mono">
							{$modalStore.mode} {$modalStore.title}
						</h2>
					</div>
					<button 
						class="text-red-400 hover:text-red-300 text-2xl hover:scale-110 transition-all"
						onclick={handleCancel}>
						✕
					</button>
				</div>
			</div>
			
		<!-- Modal Body -->
		<div class="px-6 py-4 overflow-y-auto max-h-[calc(90vh-180px)] font-mono">
			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
				{#each enrichedFields as field}
						{@const error = errors[field.key]}
						
						<div class="space-y-2">
							<div class="block text-sm font-semibold text-cyan-400 uppercase tracking-wide">
								{field.label}
								{#if field.required}
									<span class="text-red-400">*</span>
								{/if}
							</div>
							
							{#if field.type === 'text'}
								<input
									type="text"
									bind:value={formData[field.key]}
									placeholder={field.placeholder}
									class="w-full bg-slate-900/50 border border-cyan-500/30 rounded px-3 py-2 text-green-400 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
									required={field.required} />
									
							{:else if field.type === 'textarea'}
								<textarea
									bind:value={formData[field.key]}
									placeholder={field.placeholder}
									rows="4"
									class="w-full bg-slate-900/50 border border-cyan-500/30 rounded px-3 py-2 text-green-400 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all resize-none"
									required={field.required}></textarea>
									
							{:else if field.type === 'select'}
								<select
									bind:value={formData[field.key]}
									class="w-full bg-slate-900/50 border border-cyan-500/30 rounded px-3 py-2 text-green-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all cursor-pointer"
									required={field.required}>
									<option value="">Select {field.label}</option>
									{#each field.options || [] as option}
										<option value={option.value}>{option.label}</option>
									{/each}
								</select>
								
							{:else if field.type === 'datetime'}
								<input
									type="datetime-local"
									value={formData[field.key] ? convertFromEpoch(formData[field.key]) : ''}
									oninput={(e) => {
										formData[field.key] = convertToEpoch(e.currentTarget.value);
									}}
									class="w-full bg-slate-900/50 border border-cyan-500/30 rounded px-3 py-2 text-green-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
									required={field.required} />
									
							{:else if field.type === 'number'}
								<input
									type="number"
									bind:value={formData[field.key]}
									placeholder={field.placeholder}
									class="w-full bg-slate-900/50 border border-cyan-500/30 rounded px-3 py-2 text-green-400 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
									required={field.required} />
							{/if}
							
							{#if error}
								<p class="text-red-400 text-xs flex items-center gap-1">
									<span>⚠</span> {error}
								</p>
							{/if}
							
							{#if field.helpText}
								<p class="text-slate-400 text-xs">{field.helpText}</p>
							{/if}
						</div>
					{/each}
				</form>
			</div>
			
			<!-- Modal Footer -->
			<div class="bg-slate-900/80 border-t border-cyan-500/30 px-6 py-4 flex justify-end gap-3">
				<button
					type="button"
					class="px-4 py-2 bg-slate-800 border border-slate-600 rounded text-slate-300 hover:bg-slate-700 hover:border-slate-500 transition-all font-mono uppercase text-sm tracking-wide"
					onclick={handleCancel}>
					Cancel
				</button>
				<button
					type="submit"
					onclick={handleSubmit}
					disabled={isSubmitting}
					class="px-4 py-2 bg-cyan-900/50 border border-cyan-500 rounded text-cyan-400 hover:bg-cyan-900/70 hover:text-cyan-300 transition-all font-mono uppercase text-sm tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
					{#if isSubmitting}
						<span class="animate-spin">⚙️</span>
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
	/* Ensure proper datetime-local input styling */
	input[type="datetime-local"]::-webkit-calendar-picker-indicator {
		filter: invert(0.7);
		cursor: pointer;
	}
	
	/* Custom scrollbar for modal body */
	.overflow-y-auto::-webkit-scrollbar {
		width: 8px;
	}
	
	.overflow-y-auto::-webkit-scrollbar-track {
		background: rgba(15, 23, 42, 0.5);
		border-radius: 4px;
	}
	
	.overflow-y-auto::-webkit-scrollbar-thumb {
		background: rgba(34, 211, 153, 0.3);
		border-radius: 4px;
	}
	
	.overflow-y-auto::-webkit-scrollbar-thumb:hover {
		background: rgba(34, 211, 153, 0.5);
	}
</style>
