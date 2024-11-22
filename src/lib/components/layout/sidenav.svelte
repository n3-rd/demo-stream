<script lang="ts">
    export let activePage: string;
    let isOpen = false;
    const sidebarItems = [
        { name: 'Dashboard', active: activePage === 'dashboard', href: '/' },
        { name: 'Representatives', active: activePage === 'representatives', href: '/representatives' },
        { name: 'Profile', active: activePage === 'profile', href: '/profile' },

    ];
</script>

<button 
    class="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-md"
    on:click={() => isOpen = !isOpen}
>
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
    </svg>
</button>

<aside class="fixed lg:static w-64 h-full overflow-y-auto bg-white transform lg:transform-none transition-transform duration-200 ease-in-out {isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} z-40">
    <div class="p-4">
        <div class="bg-gray-300 h-12 w-24 mb-4 flex justify-center items-center">LOGO</div>
        <nav class="mt-4">
            {#each sidebarItems as item}
                <a
                    href={item.href}
                    class="block py-2 px-4 text-gray-600 hover:bg-gray-100 transition duration-150 ease-in-out {item.active ? 'bg-gray-100 font-semibold' : ''}"
                >
                    {item.name}
                </a>
            {/each}
        </nav>
    </div>
</aside>