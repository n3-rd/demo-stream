<script lang="ts">
    export let activePage: string;
    let isOpen = false;
    const sidebarItems = [
        { name: 'Dashboard', active: activePage === 'dashboard', href: '/' },
        { name: 'Representatives', active: activePage === 'representatives', href: '/representatives' },
        { name: 'Profile', active: activePage === 'profile', href: '/profile' },
        { name: 'Settings', active: activePage === 'settings', href: '/settings' },
        { name: 'Locations', active: activePage === 'locations', href: '/locations' },
        { name: 'Content Library', active: activePage === 'content-library', href: '/content-library' },
        { name: 'View Room List', active: activePage === 'rooms', href: '/room' },
        { name: 'AI Assistants', active: activePage === 'ai-assistants', href: '/ai-assistants' },
        { name: 'AI Room Designer', active: activePage === 'ai-room-designer', href: '/ai-room-designer' },
    ];

    function closeSidebar() {
        isOpen = false;
    }
</script>

<!-- Mobile: hamburger above navbar -->
<button
    type="button"
    class="lg:hidden fixed top-4 left-4 z-[10000] p-2.5 rounded-md bg-white shadow-md border border-gray-200 hover:bg-gray-50"
    aria-label={isOpen ? 'Close menu' : 'Open menu'}
    on:click={() => (isOpen = !isOpen)}
>
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
    </svg>
</button>

<!-- Backdrop: mobile only when open -->
{#if isOpen}
    <button
        type="button"
        class="lg:hidden fixed inset-0 z-[9998] bg-black/50 transition-opacity"
        aria-label="Close menu"
        on:click={closeSidebar}
    />
{/if}

<!-- Sidebar: drawer on mobile, static on desktop -->
<aside
    class="fixed lg:static w-72 max-w-[85vw] lg:w-[18vw] min-h-screen bg-white flex flex-col mt-[6rem] lg:mt-[6rem] transform transition-transform duration-200 ease-in-out z-[9999] {isOpen
        ? 'translate-x-0'
        : '-translate-x-full lg:translate-x-0'}"
    aria-hidden={!isOpen}
>
    <div class="p-6 lg:p-9 flex-1 overflow-y-auto">
        <div class="bg-[#C4C4C4] h-12 w-full mb-4 flex justify-center items-center text-white font-bold text-sm">LOGO</div>
        <nav class="mt-4 flex flex-col gap-0.5">
            {#each sidebarItems as item}
                <a
                    href={item.href}
                    class="block py-2.5 px-4 rounded-md text-gray-600 hover:bg-gray-100 transition duration-150 ease-in-out {item.active ? 'text-primary font-medium bg-primary/10' : ''}"
                    on:click={closeSidebar}
                >
                    {item.name}
                </a>
            {/each}
        </nav>
    </div>
</aside>
