<script lang="ts">
    import { onMount } from "svelte";
    import Button from "$lib/components/Button.svelte";
    import Input from "$lib/components/Input.svelte";

    let username: string = $state("");

    function handlePlay() {
        alert("Online multiplayer is not available yet. Coming soon :)");
    }
</script>

<div class="flex flex-col items-center gap-4">
    <Input bind:value={username} placeholder="Enter your username" />
    <Button onclick={handlePlay} disabled={!username.trim()}>Play</Button>
    <Button href="/local">Play Locally</Button>
</div>
