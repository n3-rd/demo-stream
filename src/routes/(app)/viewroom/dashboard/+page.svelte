<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { Shield, User, Building2, Mail, LogOut } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  
  let viewroomUser: any = null;
  
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
    
    <!-- Quick Actions -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle class="text-lg">Meeting Rooms</CardTitle>
          <CardDescription>Access available meeting rooms</CardDescription>
        </CardHeader>
        <CardContent>
          <Button class="w-full" on:click={() => goto('/room')}>
            View Rooms
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle class="text-lg">Content Library</CardTitle>
          <CardDescription>Browse available content</CardDescription>
        </CardHeader>
        <CardContent>
          <Button class="w-full" variant="outline" on:click={() => goto('/content-library')}>
            Browse Content
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle class="text-lg">Settings</CardTitle>
          <CardDescription>Manage your preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <Button class="w-full" variant="outline">
            Settings
          </Button>
        </CardContent>
      </Card>
    </div>
    
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