<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ClipboardCopy } from 'lucide-svelte';
	import { copyText } from '$lib/helpers/copyText';
	import { toast } from 'svelte-sonner';

    interface Props {
        shareURL: string;
        representative?: boolean;
        representativeId?: string;
    }

    let { shareURL, representative = false, representativeId = '' }: Props = $props();

    function extractUid(url: string) {
        try {
            const urlObj = new URL(url);
            return urlObj.searchParams.get('uid') || '';
        } catch (error) {
            console.error('Invalid URL format:', url, error);
            return '';
        }
    }

    function cleanUrlPreserveUid(url: string) {
        try {
            const urlObj = new URL(url);
            const params = urlObj.searchParams;
            const uid = params.get('uid');
            params.delete('anonymousUserId');
            params.delete('representativeId');
            params.delete('representativeName');
            params.delete('isHost');
            params.delete('anonymous');
            if (uid) {
                urlObj.search = `?uid=${uid}`;
            } else {
                urlObj.search = '';
            }
            return urlObj.toString();
        } catch (error) {
            console.error('Error in cleanUrlPreserveUid:', error);
            return url;
        }
    }

    function buildRepresentativeLink(url: string) {
        try {
            const urlObj = new URL(url);
            const base = `${urlObj.origin}${urlObj.pathname}`.replace(/\/$/, '');
            const uid = extractUid(url);
            const uidParam = uid ? `&uid=${uid}` : '';
            return `${base}/representative?id=${representativeId}${uidParam}`;
        } catch (error) {
            console.error('Error building representative link:', error);
            const cleaned = cleanUrlPreserveUid(url);
            return `${cleaned}?representative=${representativeId}`;
        }
    }

    const inviteLink = representative ? buildRepresentativeLink(shareURL) : cleanUrlPreserveUid(shareURL);

    function safeOpen(url: string, target: string = '_blank') {
        if (typeof window !== 'undefined') {
            window.open(url, target);
        } else {
            copyText(inviteLink);
            toast.success('Link copied to clipboard');
        }
    }

    function handleMailShare() {
        const subject = encodeURIComponent('Join our meeting');
        const body = encodeURIComponent(`Hi,\n\nJoin the meeting here: ${inviteLink}\n\n`);
        safeOpen(`mailto:?subject=${subject}&body=${body}`);
    }

    function handleSMSShare() {
        const body = encodeURIComponent(`Join the meeting: ${inviteLink}`);
        safeOpen(`sms:&body=${body}`, '_self');
    }

    function handleWhatsAppShare() {
        const text = encodeURIComponent(`Join the meeting: ${inviteLink}`);
        safeOpen(`https://wa.me/?text=${text}`);
    }

    function handleMessengerShare() {
        const link = encodeURIComponent(inviteLink);
        safeOpen(`https://www.facebook.com/dialog/send?link=${link}&app_id=162891918740174&redirect_uri=${link}`);
    }

    const actions = [
        {
            key: 'email',
            label: 'Email',
            icon: '/icons/social/mail.png',
            action: handleMailShare
        },
        {
            key: 'sms',
            label: 'SMS',
            icon: '/icons/social/sms.png',
            action: handleSMSShare
        },
        {
            key: 'whatsapp',
            label: 'WhatsApp',
            icon: '/icons/social/whatsapp.png',
            action: handleWhatsAppShare
        },
        {
            key: 'messenger',
            label: 'Messenger',
            icon: '/icons/social/facebook.png',
            action: handleMessengerShare
        }
    ];
</script>

<div class="w-full max-w-md rounded-2xl bg-white p-6 text-[#3f4c5a]">
    <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold text-[#34509f]">Invite People</h2>
    </div>

    <div class="mt-4 text-sm font-medium text-[#64748b]">Invite via:</div>

    <div class="mt-4 grid grid-cols-4 gap-4">
        {#each actions as option (option.key)}
            <button
                type="button"
                class="flex flex-col items-center gap-3 focus:outline-none"
                onclick={option.action}
            >
                <span class="flex h-14 w-14 items-center justify-center rounded-full bg-[#f1f4fb] text-[#34509f] shadow-sm transition hover:-translate-y-0.5 hover:shadow">
                    <img src={option.icon} alt={option.label} class="h-7 w-7 object-contain" />
                </span>
                <span class="text-xs font-medium text-[#475569]">{option.label}</span>
            </button>
        {/each}
    </div>

    <div class="mt-8 text-sm text-[#4a5562]">
        Or share this meeting link with others you want in the meeting
    </div>

    <div class="mt-3 flex items-center rounded-xl border border-[#d9dee8] bg-[#f5f7fa] px-3 py-2 text-sm">
        <input
            type="text"
            value={inviteLink}
            class="flex-1 bg-transparent text-[#3f4c5a] outline-none"
            readonly
        />
        <Button
            variant="ghost"
            size="sm"
            class="text-[#34509f] hover:text-[#243670]"
            on:click={() => {
                copyText(inviteLink);
                toast.success('Link copied to clipboard');
            }}
        >
            <ClipboardCopy class="h-4 w-4" />
        </Button>
    </div>
</div>
