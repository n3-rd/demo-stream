<script lang="ts">
  import { preventDefault } from 'svelte/legacy';

  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { toast } from 'svelte-sonner';
  import { goto } from '$app/navigation';
  import { Loader2, Mail, Phone, Cloud, Building2 } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { formatToE164, sanitizePhoneInput, isE164 } from '$lib/helpers/phone';
  
  let step: 'login' | 'verify' = $state('login');
  let loading = $state(false);
  let roomInfo = $state(null);
  let companyInfo = $state(null);
  let roomId = $state(null);
  let uid = '';
  
  // Form data
  let companyName = $state('');
  let firstName = $state('');
  let lastName = $state('');
  let email = $state('');
  let mobileNumber = $state('');
  let verificationCode = $state(['', '', '', '', '']);
  let verificationType = $state('');
  
  // Get room ID from URL params and fetch room info
  onMount(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    roomId = urlParams.get('room');
    uid = urlParams.get('uid') || '';
    
    if (roomId) {
      await fetchRoomInfo();
    }
  });
  
  async function fetchRoomInfo() {
    if (!roomId) return;
    
    try {
      const response = await fetch(`/api/room/${roomId}/info`);
      const result = await response.json();
      
      if (result.success) {
        roomInfo = result.room;
        companyInfo = result.company;
        // Pre-fill company name when room context is available
        if (companyInfo) {
          companyName = companyInfo.name;
        }
      } else {
        toast.error('Failed to load room information');
      }
    } catch (error) {
      console.error('Failed to fetch room info:', error);
      toast.error('Failed to load room information');
    }
  }
  
  // Handle code input with auto-focus
  function handleInput(event: Event, index: number) {
    const target = event.target as HTMLInputElement;
    const value = target.value;

    // Only allow single digits
    if (value.length > 1) {
      target.value = value.slice(-1);
    }

    verificationCode[index] = target.value;

    // Auto-focus next input
    if (value && index < 4) {
      const nextInput = document.querySelector(`#code-${index + 1}`) as HTMLInputElement;
      nextInput?.focus();
    }

    // Auto-submit when all 5 digits are entered
    if (verificationCode.every(digit => digit !== '') && verificationCode.join('').length === 5) {
      handleVerification();
    }
  }

  // Paste handling
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
      handleVerification();
    }
  }
  
  function onMobileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    input.value = sanitizePhoneInput(input.value);
    mobileNumber = input.value;
  }
  function onMobileBlur() {
    if (mobileNumber) mobileNumber = formatToE164(mobileNumber);
  }
  
  async function handleLogin() {
    if (!companyName.trim() || !firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    loading = true;
    try {
      const normalizedPhone = mobileNumber ? formatToE164(mobileNumber) : '';
      if (mobileNumber && !isE164(normalizedPhone)) {
        toast.error('Please enter a valid phone number with country code, e.g. +170********');
        loading = false;
        return;
      }
      const response = await fetch('/api/viewroom/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          company: companyName.trim(),
          email: email.trim(),
          phone: normalizedPhone || undefined,
          roomId: roomId || undefined
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        verificationType = result.verification_type;
        step = 'verify';
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Connection error. Please try again.');
    }
    loading = false;
  }
  
  async function handleVerification() {
    if (!verificationCode.every(digit => digit !== '') || verificationCode.join('').length !== 5) {
      toast.error('Please enter the complete 5-digit verification code');
      return;
    }
    
    loading = true;
    try {
      const response = await fetch('/api/viewroom/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: verificationCode.join('')
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message);
        // Redirect back to room if room context is available, preserve uid
        if (roomId) {
          const suffix = uid ? `?uid=${encodeURIComponent(uid)}` : '';
          goto(`/room/${roomId}${suffix}`);
        } else {
          goto('/viewroom/dashboard');
        }
      } else {
        toast.error(result.message);
        verificationCode = ['', '', '', '', '']; // Clear code on failure
      }
    } catch (error) {
      toast.error('Verification failed. Please try again.');
    }
    loading = false;
  }
  
  function resetToLogin() {
    step = 'login';
    verificationCode = ['', '', '', '', ''];
    verificationType = '';
  }
  
  // Handle enter key submission
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      if (step === 'login') {
        handleLogin();
      } else {
        handleVerification();
      }
    }
  }

  // Handle OTP input keydown for backspace
  function handleOtpKeydown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace' && verificationCode[index] === '' && index > 0) {
      const prevInput = document.querySelector(`#code-${index - 1}`) as HTMLInputElement;
      prevInput?.focus();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="min-h-screen bg-gray-50 flex flex-col justify-center pt-12 sm:px-6 lg:px-8">
  <div class="sm:mx-auto sm:w-full sm:max-w-md">
    <!-- Header -->
    <div class="text-center mb-8">
      
      <!-- ClearSky Software Logo -->
      <div class="flex items-center justify-center">
        <div class="flex items-center">
          
            <img src="/logo/main-logo.svg" alt="ClearSky Software" class="w-[10rem] h-24 text-white" />
        
        </div>
      </div>
      
      <p class="text-gray-600 text-sm">
        {step === 'login' ? 'Please sign-in to your account' : 'Enter the verification code sent to you'}
      </p>
      
      <!-- Room and Company Context -->
      {#if roomInfo && companyInfo}
        <div class="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div class="flex items-center text-blue-800">
            <Building2 class="h-4 w-4 mr-2" />
            <span class="text-sm font-medium">Accessing: {roomInfo.title}</span>
          </div>
          <p class="text-xs text-blue-600 mt-1">Owned by {companyInfo.name}</p>
          <p class="text-xs text-blue-500 mt-1">Only authorized users from this company can access this room</p>
        </div>
      {:else if roomId}
        <div class="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div class="flex items-center text-gray-600">
            <Loader2 class="h-4 w-4 mr-2 animate-spin" />
            <span class="text-sm">Loading room information...</span>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <div class="sm:mx-auto sm:w-full sm:max-w-md">
    <div class="bg-white py-8 px-6 shadow-sm rounded-lg sm:px-10">
      {#if step === 'login'}
        <!-- Login Form -->
        <form onsubmit={preventDefault(handleLogin)} class="space-y-6">
          <!-- Company Name -->
          <div>
            <Label for="companyName" class="block text-sm font-medium text-gray-700 mb-2">
              COMPANY NAME
            </Label>
            {#if companyInfo}
              <!-- Read-only when room context is available -->
              <div class="w-full px-3 py-3 border border-gray-300 rounded-md bg-gray-50">
                <div class="flex items-center">
                  <Building2 class="h-4 w-4 text-gray-500 mr-2" />
                  <span class="text-gray-700">{companyInfo.name}</span>
                </div>
                <p class="text-xs text-gray-500 mt-1">Required for this room</p>
              </div>
              <input type="hidden" bind:value={companyName} />
            {:else}
              <Input
                id="companyName"
                bind:value={companyName}
                type="text"
                placeholder="Enter you company name"
                required
                disabled={loading}
                class="w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            {/if}
          </div>

          <!-- First Name -->
          <div>
            <Label for="firstName" class="block text-sm font-medium text-gray-700 mb-2">
              FIRST NAME
            </Label>
            <Input
              id="firstName"
              bind:value={firstName}
              type="text"
              placeholder="Enter you first name"
              required
              disabled={loading}
              class="w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <!-- Last Name -->
          <div>
            <Label for="lastName" class="block text-sm font-medium text-gray-700 mb-2">
              LAST NAME
            </Label>
            <Input
              id="lastName"
              bind:value={lastName}
              type="text"
              placeholder="Enter you last name"
              required
              disabled={loading}
              class="w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <!-- Email Address -->
          <div>
            <Label for="email" class="block text-sm font-medium text-gray-700 mb-2">
              EMAIL ADDRESS
            </Label>
            <Input
              id="email"
              bind:value={email}
              type="email"
              placeholder="Enter you email"
              required
              disabled={loading}
              class="w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <!-- Mobile Number -->
          <div>
            <Label for="mobileNumber" class="block text-sm font-medium text-gray-700 mb-2">
              MOBILE NUMBER
            </Label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <span class="text-lg mr-1">🇨🇦</span>
                <span class="text-sm text-gray-500">+1</span>
              </div>
              <Input
                id="mobileNumber"
                bind:value={mobileNumber}
                type="tel"
                placeholder="Mobile Number"
                disabled={loading}
                inputmode="tel"
                autocomplete="tel"
                class="w-full pl-16 pr-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                on:input={onMobileInput}
                on:blur={onMobileBlur}
              />
            </div>
            <p class="text-xs text-gray-500 mt-1">
              Optional: If provided, must match our records exactly for SMS verification
            </p>
          </div>

          <!-- Submit Button -->
          <div class="pt-4">
            <Button
              type="submit"
              disabled={loading}
              class="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {#if loading}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                Sending Verification Code...
              {:else}
                Send Verification Code
              {/if}
            </Button>
          </div>
        </form>

      {:else}
        <!-- Verification Form -->
        <form onsubmit={preventDefault(handleVerification)} class="space-y-6">
          <!-- Status Indicator -->
          <div class="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div class="flex items-center justify-center mb-2">
              {#if verificationType === 'sms'}
                <Phone class="h-6 w-6 text-primary" />
              {:else}
                <Mail class="h-6 w-6 text-primary" />
              {/if}
            </div>
            <p class="text-sm text-blue-800 font-medium">
              Verification code sent to your {verificationType === 'sms' ? 'mobile phone' : 'email'}
            </p>
            <p class="text-xs text-primary mt-1">
              Code expires in 5 minutes
            </p>
          </div>

          <!-- Verification Code Input -->
          <div>
            <Label class="block text-sm font-medium text-gray-700 mb-4 text-center">
              VERIFICATION CODE
            </Label>
            <div class="flex justify-center gap-3 mb-4">
              {#each Array(5) as _, i}
                <input
                  id="code-{i}"
                  type="text"
                  class="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none transition-colors"
                  maxlength="1"
                  pattern="[0-9]"
                  oninput={(e) => handleInput(e, i)}
                  onkeydown={(e) => handleOtpKeydown(e, i)}
                  onpaste={handlePaste}
                  disabled={loading}
                />
              {/each}
            </div>
            <p class="text-xs text-gray-500 text-center">
              Enter the 5-digit code sent to your {verificationType === 'sms' ? 'mobile phone' : 'email'}
            </p>
          </div>

          <!-- Submit Button -->
          <div class="pt-2">
            <Button
              type="submit"
              disabled={loading || !verificationCode.every(digit => digit !== '') || verificationCode.join('').length !== 5}
              class="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {#if loading}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                Verifying Code...
              {:else}
                Verify & Sign In
              {/if}
            </Button>
          </div>

          <!-- Back to Login -->
          <div class="pt-2">
            <Button
              variant="ghost"
              class="w-full text-gray-600 hover:text-gray-800"
              on:click={resetToLogin}
              disabled={loading}
            >
              ← Back to Sign In
            </Button>
          </div>

          <p class="text-xs text-center text-gray-500 mt-4">
            Didn't receive the code? Check your spam folder or try signing in again.
          </p>
        </form>
      {/if}
    </div>
  </div>
</div>

<style>
  /* Custom styling for form inputs */
  :global(.verification-input) {
    letter-spacing: 0.5em;
  }
  
  /* Mobile responsiveness */
  @media (max-width: 640px) {
    .min-h-screen {
      padding: 1rem;
    }
  }
</style> 