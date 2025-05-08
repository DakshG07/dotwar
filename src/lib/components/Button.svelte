<script lang="ts">
    import { goto } from "$app/navigation";

    let {
        children,
        disabled = false,
        href = undefined,
        onclick = undefined,
        ...props
    } = $props();

    if (href) {
        onclick = () => goto(href);
    }
</script>

<div
    class="relative inline-block"
    class:opacity-50={disabled}
    class:cursor-not-allowed={disabled}
>
    <!-- Shadow -->
    <div
        class="absolute inset-0 bg-[#5a4e40] rounded-xl translate-y-[6px] transition-all"
        class:translate-y-[2px]={disabled}
    ></div>

    <!-- Button -->
    <button
        class="
            relative
            bg-[#756452]
            text-white
            font-bold
            py-2
            px-4
            rounded-xl
            transform
            transition-all
            duration-200
            ease-in-out
            hover:bg-[#86755f]
            hover:translate-y-[-2px]
            active:translate-y-[3px]
            disabled:hover:translate-y-0
            disabled:hover:bg-[#756452]
            disabled:cursor-not-allowed
        "
        {disabled}
        {onclick}
        {...props}
    >
        {@render children()}
    </button>
</div>
