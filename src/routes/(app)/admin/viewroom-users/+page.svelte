<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import * as Table from '$lib/components/ui/table';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Badge } from '$lib/components/ui/badge';
  import { toast } from 'svelte-sonner';
  import { Plus, Trash2, Edit, Users, Mail, Building2, Phone, Loader2 } from 'lucide-svelte';
  import { onMount } from 'svelte';
  
  export let data;
  
  let users = data?.users || [];
  let company = data?.company || { name: 'Your Company', id: '', email: '' };
  
  let showAddDialog = false;
  let showEditDialog = false;
  let editingUser = null;
  let loading = false;
  
  let newUser = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    is_active: true
  };
  
  function resetNewUser() {
    newUser = {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      is_active: true
    };
  }
  
  function openAddDialog() {
    resetNewUser();
    showAddDialog = true;
  }
  
  function openEditDialog(user) {
    editingUser = { ...user };
    showEditDialog = true;
  }
  
  // Function to refresh users data
  async function refreshUsers() {
    try {
      const response = await fetch('/api/admin/viewroom-users');
      const result = await response.json();
      if (result.success) {
        users = result.users;
      } else {
        console.error('Failed to refresh users:', result.message);
      }
    } catch (error) {
      console.error('Failed to refresh users:', error);
    }
  }
  
  async function addUser() {
    if (!newUser.first_name?.trim() || !newUser.last_name?.trim() || !newUser.email?.trim() || !newUser.phone?.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    loading = true;
    try {
      const response = await fetch('/api/admin/viewroom-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message);
        showAddDialog = false;
        resetNewUser();
        // Manually refresh users
        await refreshUsers();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Failed to add user:', error);
      toast.error('Failed to add user. Please try again.');
    }
    loading = false;
  }
  
  async function updateUser() {
    if (!editingUser?.first_name?.trim() || !editingUser?.last_name?.trim() || !editingUser?.email?.trim() || !editingUser?.phone?.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    loading = true;
    try {
      const response = await fetch(`/api/admin/viewroom-users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser)
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message);
        showEditDialog = false;
        editingUser = null;
        // Manually refresh users
        await refreshUsers();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      toast.error('Failed to update user. Please try again.');
    }
    loading = false;
  }
  
  async function deleteUser(userId, userName) {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/viewroom-users/${userId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message);
        // Manually refresh users
        await refreshUsers();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Failed to delete user. Please try again.');
    }
  }
  
  async function toggleUserStatus(userId, currentStatus) {
    try {
      const response = await fetch(`/api/admin/viewroom-users/${userId}/toggle-status`, {
        method: 'PATCH'
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message);
        // Manually refresh users
        await refreshUsers();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Failed to toggle user status:', error);
      toast.error('Failed to update user status. Please try again.');
    }
  }
</script>

<div class="container mx-auto p-6">
  <div class="flex justify-between items-center mb-6">
    <div>
      <h1 class="text-3xl font-bold text-gray-900 flex items-center">
        <Users class="mr-3 h-8 w-8" />
        Viewroom User Management
      </h1>
      <p class="text-gray-600 mt-1">Manage viewroom access for {company.name}</p>
      <p class="text-sm text-gray-500 mt-1">Create and manage users who can access your company's secure viewroom sessions</p>
    </div>
    <Button on:click={openAddDialog}>
      <Plus class="mr-2 h-4 w-4" />
      Add User
    </Button>
  </div>
  
  <!-- Stats Cards -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
    <Card>
      <CardContent class="p-6">
        <div class="flex items-center">
          <Users class="h-8 w-8 text-primary" />
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Total Users</p>
            <p class="text-2xl font-bold text-gray-900">{users.length}</p>
          </div>
        </div>
      </CardContent>
    </Card>
    
    <Card>
      <CardContent class="p-6">
        <div class="flex items-center">
          <Badge variant="default" class="bg-green-500">
            <span class="text-white">Active</span>
          </Badge>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Active Users</p>
            <p class="text-2xl font-bold text-gray-900">{users.filter(u => u.is_active).length}</p>
          </div>
        </div>
      </CardContent>
    </Card>
    
    <Card>
      <CardContent class="p-6">
        <div class="flex items-center">
          <Badge variant="secondary">Inactive</Badge>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Inactive Users</p>
            <p class="text-2xl font-bold text-gray-900">{users.filter(u => !u.is_active).length}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>

  <!-- Users Table -->
  <Card>
    <CardHeader>
      <CardTitle>Authorized Users for {company.name}</CardTitle>
      <CardDescription>
        Users who can authenticate and access viewroom sessions for your company
      </CardDescription>
    </CardHeader>
    <CardContent>
      {#if users.length === 0}
        <div class="text-center py-8">
          <Users class="mx-auto h-12 w-12 text-gray-400" />
          <h3 class="mt-2 text-sm font-semibold text-gray-900">No users yet</h3>
          <p class="mt-1 text-sm text-gray-500">Get started by creating your first viewroom user.</p>
          <div class="mt-6">
            <Button on:click={openAddDialog}>
              <Plus class="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
        </div>
      {:else}
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Name</Table.Head>
              <Table.Head>Company</Table.Head>
              <Table.Head>Email</Table.Head>
              <Table.Head>Phone</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head>Created</Table.Head>
              <Table.Head class="text-right">Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each users as user (user.id)}
              <Table.Row>
                <Table.Cell class="font-medium">{user.first_name} {user.last_name}</Table.Cell>
                <Table.Cell>
                  <div class="flex items-center">
                    <Building2 class="h-4 w-4 text-gray-500 mr-2" />
                    {company.name}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <div class="flex items-center">
                    <Mail class="h-4 w-4 text-gray-500 mr-2" />
                    {user.email}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <div class="flex items-center">
                    <Phone class="h-4 w-4 text-gray-500 mr-2" />
                    {user.phone || 'Not provided'}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <Badge 
                    variant={user.is_active ? "default" : "secondary"}
                    class={user.is_active ? "bg-green-500" : ""}
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  {new Date(user.created).toLocaleDateString()}
                </Table.Cell>
                <Table.Cell class="text-right">
                  <div class="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      on:click={() => toggleUserStatus(user.id, user.is_active)}
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      on:click={() => openEditDialog(user)}
                    >
                      <Edit class="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      on:click={() => deleteUser(user.id, `${user.first_name} ${user.last_name}`)}
                      class="text-red-600 hover:text-red-700"
                    >
                      <Trash2 class="h-4 w-4" />
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      {/if}
    </CardContent>
  </Card>
</div>

<!-- Add User Dialog -->
<Dialog.Root bind:open={showAddDialog}>
  <Dialog.Content class="sm:max-w-[500px]">
    <Dialog.Header>
      <Dialog.Title>Add New Viewroom User</Dialog.Title>
      <Dialog.Description>
        Create a new user for {company.name} with access to secure viewroom sessions.
      </Dialog.Description>
    </Dialog.Header>
    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="add-first-name" class="text-right">First Name *</Label>
        <Input
          id="add-first-name"
          bind:value={newUser.first_name}
          placeholder="John"
          class="col-span-3"
          required
        />
      </div>
      
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="add-last-name" class="text-right">Last Name *</Label>
        <Input
          id="add-last-name"
          bind:value={newUser.last_name}
          placeholder="Doe"
          class="col-span-3"
          required
        />
      </div>
      
      <!-- Company is automatically bound to the admin's user ID -->
      <div class="bg-blue-50 p-3 rounded-md border border-blue-200">
        <p class="text-sm text-blue-800 font-medium">Company: {company.name}</p>
        <p class="text-xs text-blue-600">Users will be automatically assigned to your company</p>
      </div>
      
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="add-email" class="text-right">Email *</Label>
        <Input
          id="add-email"
          type="email"
          bind:value={newUser.email}
          placeholder="john@company.com"
          class="col-span-3"
          required
        />
      </div>
      
      <div class="grid grid-cols-4 items-center gap-4">
        <Label for="add-phone" class="text-right">Phone *</Label>
        <Input
          id="add-phone"
          type="tel"
          bind:value={newUser.phone}
          placeholder="+1234567890"
          class="col-span-3"
          required
        />
      </div>
    </div>
    <Dialog.Footer>
      <Button variant="outline" on:click={() => showAddDialog = false} disabled={loading}>
        Cancel
      </Button>
      <Button on:click={addUser} disabled={loading}>
        {#if loading}
          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          Adding...
        {:else}
          Add User
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Edit User Dialog -->
{#if editingUser}
  <Dialog.Root bind:open={showEditDialog}>
    <Dialog.Content class="sm:max-w-[500px]">
      <Dialog.Header>
        <Dialog.Title>Edit User: {editingUser.first_name} {editingUser.last_name}</Dialog.Title>
        <Dialog.Description>
          Update user information and access settings.
        </Dialog.Description>
      </Dialog.Header>
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="edit-first-name" class="text-right">First Name *</Label>
          <Input
            id="edit-first-name"
            bind:value={editingUser.first_name}
            class="col-span-3"
            required
          />
        </div>
        
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="edit-last-name" class="text-right">Last Name *</Label>
          <Input
            id="edit-last-name"
            bind:value={editingUser.last_name}
            class="col-span-3"
            required
          />
        </div>
        
        <!-- Company cannot be changed - bound to admin's company -->
        <div class="bg-gray-50 p-3 rounded-md border border-gray-200">
          <p class="text-sm text-gray-700 font-medium">Company: {company.name}</p>
          <p class="text-xs text-gray-500">Company assignment cannot be changed</p>
        </div>
        
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="edit-email" class="text-right">Email *</Label>
          <Input
            id="edit-email"
            type="email"
            bind:value={editingUser.email}
            class="col-span-3"
            required
          />
        </div>
        
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="edit-phone" class="text-right">Phone *</Label>
          <Input
            id="edit-phone"
            type="tel"
            bind:value={editingUser.phone}
            class="col-span-3"
            required
          />
        </div>
      </div>
      <Dialog.Footer>
        <Button variant="outline" on:click={() => showEditDialog = false} disabled={loading}>
          Cancel
        </Button>
        <Button on:click={updateUser} disabled={loading}>
          {#if loading}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            Updating...
          {:else}
            Update User
          {/if}
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
{/if} 