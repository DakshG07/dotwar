<script lang="ts">
    import "../app.css";
    import "@fontsource/rubik";

    let { children } = $props();
</script>

<div class="min-h-screen bg-bgcolor font-['Rubik']">
    {@render children()}
</div>
