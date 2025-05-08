<script>
    let { value = $bindable(), type = "text", ...props } = $props();
</script>

<input
    {type}
    bind:value
    class="border border-gray-300 rounded-lg px-4 py-2 w-64 text-center focus:outline-none focus:ring-2 focus:ring-primary"
    {...props}
/>
