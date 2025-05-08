<script>
    import { twMerge } from "tailwind-merge";

    let {
        value = $bindable(),
        type = "text",
        label,
        inputClass = "w-min",
        ...props
    } = $props();
</script>

<div
    class="flex items-center border border-gray-300 rounded-lg overflow-hidden"
>
    <!-- Label section on the left -->
    <div class="px-3 py-2 font-medium border-r border-gray-300 text-nowrap">
        {label}
    </div>

    <!-- Input section on the right -->
    <input
        {type}
        bind:value
        class={twMerge("px-3 py-2 focus:outline-none text-right", inputClass)}
        {...props}
    />
</div>
