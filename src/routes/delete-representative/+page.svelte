<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { toast } from 'svelte-sonner';
  import { goto } from '$app/navigation';
  import { Loader2, Mail, Phone, ShieldAlert } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { formatToE164, sanitizePhoneInput, isE164 } from '$lib/helpers/phone';

  let step: 'identify' | 'verify' = $state('identify');
  let loading = $state(false);

  // Form data
  let email = $state('');
  let phone = $state('');
  let verificationCode = $state(['', '', '', '', '']);
  let verificationType = $state('');

  function onPhoneInput(e: Event) {
    const input = e.target as HTMLInputElement;
    input.value = sanitizePhoneInput(input.value);
    phone = input.value;
  }

  function onPhoneBlur() {
    if (phone) phone = formatToE164(phone);
  }

  function handleCodeInput(e: Event, i: number) {
    const t = e.target as HTMLInputElement;
    if (t.value.length > 1) t.value = t.value.slice(-1);
    verificationCode[i] = t.value;
    if (t.value && i < 4) {
      const next = document.getElementById(`code-${i + 1}`) as HTMLInputElement | null;
      next?.focus();
    }
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

  async function requestDeletionCode() {
    if (!email.trim() || !phone.trim()) {
      toast.error('Please enter your email and mobile number');
      return;
    }
    
    loading = true;
    try {
      const normalizedPhone = formatToE164(phone);
      if (!isE164(normalizedPhone)) {
        toast.error('Please enter a valid phone number');
        loading = false;
        return;
      }

      const res = await fetch('/api/representative/delete/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim(),
          phone: normalizedPhone
        })
      });
      const result = await res.json();
      if (result.success) {
        verificationType = result.verification_type;
        step = 'verify';
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (e) {
      toast.error('Connection error. Please try again.');
    } finally {
      loading = false;
    }
  }

  async function handleDeleteAccount() {
    if (!verificationCode.every(d => d !== '') || verificationCode.join('').length !== 5) {
      toast.error('Please enter the 5-digit code');
      return;
    }

    if (!confirm('WARNING: This will permanently delete your representative account and all associated data. This action CANNOT be undone. Are you sure?')) {
      return;
    }

    loading = true;
    try {
      const res = await fetch('/api/representatives/me', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim(), 
          code: verificationCode.join('')
        })
      });
      const result = await res.json();
      if (result.success) {
        toast.success('Your account has been deleted.');
        goto('/login');
      } else {
        toast.error(result.message);
        verificationCode = ['', '', '', '', ''];
      }
    } catch (e) {
      toast.error('Deletion failed. Please try again.');
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
  <div class="sm:mx-auto sm:w-full sm:max-w-md">
    <div class="text-center mb-8">
      <img src="/logo/main-logo.svg" alt="Logo" class="mx-auto h-16 w-auto mb-4" />
      <h1 class="text-2xl font-bold text-gray-900">Representative Account Deletion</h1>
      <p class="mt-2 text-sm text-gray-600">
        {#if step === 'identify'}
          Verify your identity to request account deletion
        {:else}
          Enter the security code sent to your {verificationType === 'sms' ? 'phone' : 'email'}
        {/if}
      </p>
    </div>

    <div class="bg-white py-8 px-6 shadow rounded-lg sm:px-10 border-t-4 border-red-500">
      {#if step === 'identify'}
        <div class="mb-6 bg-red-50 p-4 rounded-md flex items-start gap-3 border border-red-100">
          <ShieldAlert class="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p class="text-xs text-red-700">
            Deleting your account is permanent. All your data, including your profile and device tokens, will be removed immediately.
          </p>
        </div>

        <form class="space-y-6" onsubmit={(e) => { e.preventDefault(); requestDeletionCode(); }}>
          <div>
            <Label for="email" class="text-xs font-bold text-gray-700 uppercase">Email Address</Label>
            <Input 
              id="email" 
              type="email" 
              bind:value={email} 
              placeholder="rep@example.com" 
              required 
              disabled={loading}
              class="mt-1"
            />
          </div>

          <div>
            <Label for="phone" class="text-xs font-bold text-gray-700 uppercase">Mobile Number</Label>
            <div class="relative mt-1">
              <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <span class="text-sm text-gray-500">+1</span>
              </div>
              <Input 
                id="phone" 
                type="tel" 
                bind:value={phone} 
                placeholder="Mobile Number" 
                required 
                disabled={loading}
                class="pl-10"
                oninput={onPhoneInput}
                onblur={onPhoneBlur}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            class="w-full bg-red-600 hover:bg-red-700 text-white" 
            disabled={loading}
          >
            {#if loading}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" /> Processing...
            {:else}
              Request Deletion Code
            {/if}
          </Button>
        </form>
      {:else}
        <div class="text-center p-4 bg-blue-50 rounded-lg border border-blue-200 mb-6">
          <div class="flex items-center justify-center mb-2">
            {#if verificationType === 'sms'}
              <Phone class="h-6 w-6 text-primary" />
            {:else}
              <Mail class="h-6 w-6 text-primary" />
            {/if}
          </div>
          <p class="text-sm text-blue-800 font-medium">Security code sent!</p>
          <p class="text-xs text-primary mt-1">Expires in 5 minutes</p>
        </div>

        <div class="space-y-6">
          <div>
            <Label class="block text-sm font-medium text-gray-700 mb-4 text-center">ENTER 5-DIGIT CODE</Label>
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
          </div>

          <Button 
            onclick={handleDeleteAccount} 
            disabled={loading || !verificationCode.every(d => d !== '')} 
            class="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            {#if loading}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" /> Deleting Account...
            {:else}
              Permanently Delete Account
            {/if}
          </Button>

          <button 
            type="button" 
            class="w-full text-xs text-gray-500 underline text-center" 
            onclick={() => (step = 'identify')}
          >
            Go back
          </button>
        </div>
      {/if}
    </div>
    
    <div class="mt-8 text-center text-xs text-gray-400 space-x-4">
      <a href="/privacy" class="hover:underline">Privacy Policy</a>
      <span>&bull;</span>
      <a href="/login" class="hover:underline">Return to Login</a>
    </div>
  </div>
</div>
