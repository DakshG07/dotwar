<script lang="ts">
    import { onNavigate } from "$app/navigation";
    import { Color } from "$lib/player";
    import { shared } from "$lib/state.svelte";
    import "../app.css";
    import "@fontsource/rubik";

    onNavigate((navigation) => {
        shared.titleColor = new Color(-1);
        if (!document.startViewTransition) return;

        return new Promise((resolve) => {
            document.startViewTransition(async () => {
                resolve();
                await navigation.complete;
            });
        });
    });

    let { children } = $props();
</script>

<div class="min-h-screen bg-bgcolor font-['Rubik']">
    <div class="container mx-auto px-4 py-8">
        <h1
            class="text-4xl font-['Rubik'] font-black text-center mb-8 transition-all duration-300"
            style={!shared.titleColor || shared.titleColor.index < 0
                ? "color: var(--color-primary)"
                : `color: ${shared.titleColor.primary}`}
        >
            <a href="/">Dot War</a>
        </h1>
        {@render children()}
    </div>
</div>
