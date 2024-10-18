<script lang="ts">
    export let activePage: string;
    const sidebarItems = [
        { name: 'Dashboard', active: activePage === 'dashboard', href: '/' },
        { name: 'Representatives', active: activePage === 'representatives', href: '/representatives' },
        { name: 'Profile', active: activePage === 'profile', href: '/profile' },

    ];
</script>
<aside class="w-64 h-full overflow-y-auto bg-white">
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