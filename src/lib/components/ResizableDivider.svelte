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

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
    class="resize-divider"
    class:dragging={isDragging}
    onmousedown={onDividerMouseDown}
    role="separator"
    aria-orientation="vertical"
></div>

<style>
    .resize-divider {
        width: var(--space-1);
        background: hsl(var(--border-default));
        cursor: col-resize;
        transition: var(--transition-colors);
        user-select: none;
    }

    .resize-divider:hover,
    .resize-divider.dragging {
        background: hsl(var(--brand-default));
    }
</style>
