<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { Shield, User, Building2, Mail, LogOut } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  const FILES_BASE = '/api/files';
  
  let { data } = $props();
  let { content = [] } = data;
  let selectedTab = $state('host');
  let contentTypes = ['video', 'pdf', 'document', 'image'];
  let contentTypeLabels = {
    video: 'Videos',
    pdf: 'PDF Files',
    document: 'Word Document Files',
    image: 'Images'
  };
  
  // Group content by type for tabs
  let contentByType = $derived(contentTypes.map((type) => ({
    type,
    label: contentTypeLabels[type],
    items: content.filter((item) => {
      const libraryTypeMatch =
        selectedTab === 'host'
          ? item.library_type === 'host' || (Array.isArray(item.library_type) && item.library_type.includes('host'))
          : item.library_type === 'representative' || (Array.isArray(item.library_type) && item.library_type.includes('representative'));
      return libraryTypeMatch && item.type === type;
    })
  })));
  
  function handleTabChange(tab: string) {
    selectedTab = tab;
  }
  
  function getIcon(type: string) {
    return type === 'video' ? User : type === 'pdf' ? Mail : type === 'document' ? Building2 : Shield;
  }
  
  function handleContentClick(item) {
    window.open(`${FILES_BASE}/content_library/${item.id}/${item.file}`, '_blank');
  }
  
  let viewroomUser: any = $state(null);
  
  onMount(() => {
    // Get user info from cookie
    const userCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('viewroom_user='))
      ?.split('=')[1];
    
    if (userCookie) {
      try {
        viewroomUser = JSON.parse(decodeURIComponent(userCookie));
      } catch (e) {
        console.error('Failed to parse user cookie');
      }
    }
  });
  
  async function logout() {
    // Clear cookies
    document.cookie = 'viewroom_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'viewroom_user=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
    // Redirect to login
    goto('/viewroom/login');
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
  <div class="container mx-auto max-w-4xl">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8 bg-white rounded-lg shadow-sm p-6">
      <div class="flex items-center space-x-3">
        <div class="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
          <Shield class="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Viewroom Dashboard</h1>
          <p class="text-gray-600">Secure access granted</p>
        </div>
      </div>
      
      <Button variant="outline" on:click={logout}>
        <LogOut class="mr-2 h-4 w-4" />
        Logout
      </Button>
    </div>
    
    <!-- User Info Card -->
    {#if viewroomUser}
      <Card class="mb-8">
        <CardHeader>
          <CardTitle class="flex items-center">
            <User class="mr-2 h-5 w-5" />
            User Information
          </CardTitle>
          <CardDescription>
            Your verified viewroom access details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
                              <div class="flex items-center space-x-2">
                  <User class="h-4 w-4 text-gray-500" />
                  <span class="text-sm font-medium">Name:</span>
                  <Badge variant="secondary">{viewroomUser.first_name} {viewroomUser.last_name}</Badge>
                </div>
              
              <div class="flex items-center space-x-2">
                <Building2 class="h-4 w-4 text-gray-500" />
                <span class="text-sm font-medium">Company:</span>
                <Badge variant="outline">{viewroomUser.company}</Badge>
              </div>
            </div>
            
            <div class="space-y-2">
              <div class="flex items-center space-x-2">
                <Mail class="h-4 w-4 text-gray-500" />
                <span class="text-sm font-medium">Email:</span>
                <span class="text-sm text-gray-600">{viewroomUser.email}</span>
              </div>
              
              <div class="flex items-center space-x-2">
                <Shield class="h-4 w-4 text-green-500" />
                <span class="text-sm font-medium">Status:</span>
                <Badge variant="default" class="bg-green-500">Verified</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    {/if}
    
    <!-- Content view (same structure as content-library) -->
    <div class="bg-white rounded-[8px] p-4 mb-6 flex justify-between items-center">
      <div class="flex space-x-8">
        <button class=" text-[24px] leading-[118%] {selectedTab === 'host' ? 'text-[#577AB7] font-bold' : 'text-[#737373]'}" onclick={() => handleTabChange('host')}>
          Host Content
        </button>
        <button class=" text-[24px] leading-[118%] {selectedTab === 'representative' ? 'text-[#577AB7] font-bold' : 'text-[#737373]'}" onclick={() => handleTabChange('representative')}>
          Representative Content
        </button>
      </div>
    </div>
    {#each contentByType as contentGroup}
      {#if contentGroup.items.length > 0}
        <div class="mb-8">
          <h2 class="text-[16px] font-medium text-[#737373] mb-4">{contentGroup.label}</h2>
          <div class="bg-white rounded-lg p-4 shadow-sm">
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {#each contentGroup.items as item}
                <div class="bg-[#ECEFF3] rounded-[2px] p-2 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div class="relative">
                    {#if item.thumbnail}
                      <img src={`${FILES_BASE}/content_library/${item.id}/${item.thumbnail}`} alt={item.title} class="w-full aspect-video object-cover rounded" />
                    {:else if item.type === 'image'}
                      <img src={`${FILES_BASE}/content_library/${item.id}/${item.file}`} alt={item.title} class="w-full aspect-video object-cover rounded" />
                    {:else}
                      {@const SvelteComponent = getIcon(item.type)}
                      <div class="w-full aspect-video bg-[#ECEFF3] rounded flex items-center justify-center">
                        <SvelteComponent class="w-12 h-12 text-[#666666]" />
                      </div>
                    {/if}
                    <div class="absolute inset-0 flex items-center justify-center">
                      <Button size="sm" on:click={() => handleContentClick(item)}>Open</Button>
                    </div>
                  </div>
                  <div class="mt-2">
                    <h3 class="font-semibold text-[14px] leading-[120%] text-[#577AB7] truncate">{item.title}</h3>
                    <p class="font-light text-[11px] leading-[120%] text-black/50">ID {item.id}</p>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    {/each}
    {#if contentByType.every(group => group.items.length === 0)}
      <div class="text-center py-12 bg-white rounded-[8px]">
        <p class="text-[#737373] ">No content found in this category</p>
      </div>
    {/if}
    
    <!-- Security Notice -->
    <Card class="mt-8 border-blue-200 bg-blue-50">
      <CardContent class="pt-6">
        <div class="flex items-start space-x-3">
          <Shield class="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 class="font-medium text-blue-900">Secure Session Active</h3>
            <p class="text-sm text-blue-700 mt-1">
              Your viewroom session is secured with two-factor authentication. 
              Session will automatically expire for security.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</div> 