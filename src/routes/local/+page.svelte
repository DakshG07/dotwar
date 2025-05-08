<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import Button from "$lib/components/Button.svelte";
    import LabelInput from "$lib/components/LabelInput.svelte";

    let gridSize = $state(5);
    let numPlayers = $state(2);
</script>

<div class="flex flex-col items-center gap-4">
    <LabelInput
        type="number"
        bind:value={gridSize}
        label="Grid Size"
        inputClass="w-10 px-0"
        max={10}
        min={2}
    />
    <LabelInput
        type="number"
        bind:value={numPlayers}
        label="Number of Players"
        inputClass="w-10 px-0"
        max={8}
        min={2}
    />
    <Button href={`/local/play?gridSize=${gridSize}&numPlayers=${numPlayers}`}
        >Play</Button
    >
</div>
