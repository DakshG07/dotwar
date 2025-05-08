<script lang="ts">
    import { onNavigate } from "$app/navigation";
    import "../app.css";
    import "@fontsource/rubik";

    onNavigate((navigation) => {
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
            class="text-4xl font-['Rubik'] font-black text-center text-primary mb-8"
        >
            <a href="/">Dot War</a>
        </h1>
        {@render children()}
    </div>
</div>
