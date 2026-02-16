<script lang="ts">
    let {
        columnRatio = $bindable(0.3),
        containerSelector = '.details-container',
        onchange
    }: {
        columnRatio: number;
        containerSelector?: string;
        onchange?: (ratio: number) => void;
    } = $props();

    let isDragging = $state(false);

    function onDividerMouseDown() {
        isDragging = true;
    }

    function onMouseMove(e: MouseEvent) {
        if (!isDragging) return;

        const container = document.querySelector(containerSelector) as HTMLElement;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const mouseX = e.clientX - containerRect.left;
        const containerWidth = containerRect.width;
        // Calculate ratio for right column (inverted from mouse position)
        const newRatio = Math.max(0.2, Math.min(0.8, 1 - (mouseX / containerWidth)));
        columnRatio = newRatio;
        onchange?.(newRatio);
    }

    function onMouseUp() {
        isDragging = false;
    }

    $effect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        } else {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="resize-divider"
    class:dragging={isDragging}
    onmousedown={onDividerMouseDown}
></div>

<style>
    .resize-divider {
        width: 4px;
        background: var(--color-border-medium);
        cursor: col-resize;
        transition: background 0.15s ease;
        user-select: none;
        margin: 0 calc(var(--spacing-sm) / 2);
    }

    .resize-divider:hover,
    .resize-divider.dragging {
        background: var(--color-accent-primary);
    }
</style>
