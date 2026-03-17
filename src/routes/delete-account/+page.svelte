<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Label } from '$lib/components/ui/label';
  import { toast } from 'svelte-sonner';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { Loader2, Mail, Phone } from 'lucide-svelte';

  let { data, form } = $props();

  let step = $state('options'); // 'options', 'verify'
  let isDeleting = $state(false);
  let isSendingCode = $state(false);
  let verificationCode = $state(['', '', '', '', '']);
  let verificationType = $state('');

  async function requestDeletionCode() {
    isSendingCode = true;
    try {
      const response = await fetch('/api/representative/delete/request', {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.success) {
        verificationType = result.verification_type;
        step = 'verify';
        toast.success(result.message);
      } else {
        toast.error(result.message || 'Failed to send verification code.');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred while sending verification code.');
    } finally {
      isSendingCode = false;
    }
  }

  function handleCodeInput(e: Event, i: number) {
    const t = e.target as HTMLInputElement;
    if (t.value.length > 1) t.value = t.value.slice(-1);
    verificationCode[i] = t.value;
    if (t.value && i < 4) {
      const next = document.getElementById(`code-${i + 1}`) as HTMLInputElement | null;
      next?.focus();
    }
    
    // Auto-submit when all digits are entered
    if (verificationCode.every((d) => d !== '') && verificationCode.join('').length === 5) {
      handleDeleteAccount();
    }
  }

  function handlePaste(event: ClipboardEvent) {
    event.preventDefault();
    const paste = event.clipboardData?.getData('text');
    if (paste && /^\d{5}$/.test(paste)) {
      const digits = paste.split('');
      for (let i = 0; i < 5; i++) {
        verificationCode[i] = digits[i] || '';
        const input = document.querySelector(`#code-${i}`) as HTMLInputElement;
        if (input) input.value = verificationCode[i];
      }
      handleDeleteAccount();
    }
  }

  async function handleDeleteAccount() {
    if (!verificationCode.every(d => d !== '') || verificationCode.join('').length !== 5) {
      toast.error('Please enter the complete 5-digit verification code');
      return;
    }

    if (!confirm('Are you absolutely sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    isDeleting = true;
    try {
      const response = await fetch('/api/representatives/me', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode.join('') })
      });
      const result = await response.json();
      
      if (result.success) {
        toast.success('Your account has been deleted successfully.');
        goto('/login');
      } else {
        toast.error(result.message || 'Failed to delete account.');
        // Clear code on failure
        verificationCode = ['', '', '', '', ''];
        for (let i = 0; i < 5; i++) {
           const input = document.querySelector(`#code-${i}`) as HTMLInputElement;
           if (input) input.value = '';
        }
        const first = document.querySelector('#code-0') as HTMLInputElement;
        first?.focus();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred while deleting your account.');
    } finally {
      isDeleting = false;
    }
  }
</script>

<div class="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
    <div class="mb-8 flex justify-center">
      <img src="/logo/main-logo.svg" alt="Logo" class="h-10" />
    </div>

    <h1 class="text-2xl font-bold mb-4 text-gray-900 text-center">Account Deletion</h1>
    
    {#if step === 'options'}
      <p class="text-gray-600 mb-8 text-center text-sm">
        We're sorry to see you go. Below are the options to delete your account.
      </p>

      {#if data.isLoggedIn}
        <div class="bg-red-50 p-6 rounded-md border border-red-100 mb-8">
          <h2 class="text-lg font-semibold text-red-700 mb-2">Instant Deletion</h2>
          <p class="text-sm text-red-600 mb-4">
            Since you are currently logged in, you can delete your account after verifying your identity via OTP.
          </p>
          <Button 
            variant="destructive" 
            class="w-full" 
            onclick={requestDeletionCode}
            disabled={isSendingCode}
          >
            {#if isSendingCode}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" /> Sending Code...
            {:else}
              Request Deletion Code
            {/if}
          </Button>
        </div>
      {:else}
        <div class="bg-blue-50 p-4 rounded-md border border-blue-100 mb-8">
          <p class="text-sm text-blue-800">
            Already have an account? <a href="/login" class="font-bold underline">Login here</a> to delete your account via secure OTP.
          </p>
        </div>
      {/if}

      <div class="space-y-6">
        <div class="relative">
          <div class="absolute inset-0 flex items-center" aria-hidden="true">
            <div class="w-full border-t border-gray-200"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white text-gray-500">Or Request Support Assistance</span>
          </div>
        </div>

        {#if form?.success}
          <div class="bg-green-50 p-4 rounded-md border border-green-200 text-green-800 text-sm">
            {form.message}
          </div>
          <div class="mt-6 flex justify-center">
            <Button href="/" variant="outline">Return to Home</Button>
          </div>
        {:else}
          <form method="POST" action="?/requestDeletion" use:enhance class="space-y-4">
            <div class="space-y-2">
              <Label for="name">Full Name</Label>
              <Input id="name" name="name" type="text" required placeholder="John Doe" />
            </div>
            
            <div class="space-y-2">
              <Label for="email">Email Address</Label>
              <Input id="email" name="email" type="email" required placeholder="john@example.com" />
            </div>

            <div class="space-y-2">
              <Label for="reason">Reason for deletion (Optional)</Label>
              <Textarea id="reason" name="reason" placeholder="Please let us know why you're leaving..." />
            </div>

            <Button type="submit" class="w-full">Submit Deletion Request</Button>
          </form>
        {/if}
      </div>
    {:else if step === 'verify'}
      <div class="text-center p-4 bg-red-50 rounded-lg border border-red-200 mb-6">
        <div class="flex items-center justify-center mb-2">
          {#if verificationType === 'sms'}
            <Phone class="h-6 w-6 text-red-600" />
          {:else}
            <Mail class="h-6 w-6 text-red-600" />
          {/if}
        </div>
        <p class="text-sm text-red-800 font-medium">Verification code sent to your {verificationType === 'sms' ? 'mobile phone' : 'email'}</p>
        <p class="text-xs text-red-600 mt-1">For security, please enter the code to confirm account deletion.</p>
      </div>

      <div class="space-y-6">
        <div>
          <Label class="block text-sm font-medium text-gray-700 mb-4 text-center">VERIFICATION CODE</Label>
          <div class="flex justify-center gap-3 mb-4">
            {#each Array(5) as _, i}
              <input 
                id={`code-${i}`} 
                type="text" 
                class="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none transition-colors" 
                maxlength="1" 
                pattern="[0-9]" 
                oninput={(e) => handleCodeInput(e, i)} 
                onpaste={handlePaste} 
              />
            {/each}
          </div>
          <p class="text-xs text-gray-500 text-center">Enter the 5-digit code sent to you</p>
        </div>

        <div class="pt-2">
          <Button 
            onclick={handleDeleteAccount} 
            disabled={isDeleting || !verificationCode.every(d => d !== '') || verificationCode.join('').length !== 5} 
            variant="destructive"
            class="w-full font-medium py-3 px-4 rounded-md transition duration-150 ease-in-out"
          >
            {#if isDeleting}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" /> Deleting Account...
            {:else}
              Confirm & Delete Permanently
            {/if}
          </Button>
          <button 
            type="button" 
            class="w-full mt-4 text-xs text-gray-600 underline" 
            onclick={() => (step = 'options')}
          >
            Go back to options
          </button>
        </div>
      </div>
    {/if}

    <div class="mt-8 pt-6 border-t border-gray-100 flex justify-center space-x-4 text-xs text-gray-400">
      <a href="/privacy" class="hover:underline text-gray-500">Privacy Policy</a>
      <span>&bull;</span>
      <a href="/" class="hover:underline text-gray-500">Home</a>
    </div>
  </div>
</div>
