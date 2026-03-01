<script lang="ts">
    import { Button } from "$lib/components/ui/button";
	import { copyTextToClipboard } from "svelte-email/utils";

    interface Props {
        roomIdentityName: string;
        roomLink: string;
    }

    let { roomIdentityName, roomLink }: Props = $props();
</script>
<div class="absolute inset-x-0 top-0 py-3 w-full lg:hidden flex items-center justify-between gap-3 px-2 mobile-top-bar">
    <Button
        class="flex-1 min-w-0 rounded bg-bgdefault-light text-white shadow-l flex items-center justify-center px-3 py-2 max-w-40 pointer-events-none"
    >
        <span class="truncate text-sm font-semibold">{roomIdentityName}</span>
    </Button>
    <Button
        class="flex-1 min-w-0 rounded bg-bgdefault-light text-white shadow-lg hover:bg-primary hover:text-white flex items-center justify-center gap-2 px-3 py-2 max-w-40 "
        on:click={()=>copyTextToClipboard(roomLink)}
    >
<svg width="120" height="120" viewBox="0 0 20 19" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <rect width="19.319" height="19" fill="url(#pattern0_9432_1589)"/>
    <defs>
    <pattern id="pattern0_9432_1589" patternContentUnits="objectBoundingBox" width="1" height="1">
    <use xlink:href="#image0_9432_1589" transform="matrix(0.0102446 0 0 0.0104167 0.00825681 0)"/>
    </pattern>
    <image id="image0_9432_1589" width="96" height="96" preserveAspectRatio="none" xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAACXBIWXMAAAsTAAALEwEAmpwYAAAE0ElEQVR4nO2czY4WRRSGO0rQxChxYbwBGQhCXGjkGvAChIVhI8IFcAsooA7iCLo37owgECUh4NoFCxJwKZEfWU2YQUhcOPiYYuoL30h/Xad+uqu+rvMkncxPTtfp962u7j5dXU2jKIqiKIqiKIriAHgB2AdcAh4xcppSADYBnwDLVERTUK//iQppSgD4nEppcgPsAB5TKU1ugEUqpskNcI2KaXIDrFIxTW6KT3DsqAGZUQMyowZkRg3IjBqQGTUgM2rAyAwAdgFfAjdG8j7hkT2Wk8DOYg2wJe2vR17YewycBjYXZYAV/xfq4UoyE1wtCffxDfVxqggD7Jg/5mFnFmvAmyUYYC64tXKiBAN+o16ul2DAQ+rlrxIMKJlb5mIJvAdsA1622zb7N/O/2zENqAHt3AEOmrlOwvlQ+4GbBKAGPMvPwJaAkcCcGWfxRA3YiJnh8VyoKCYWWMIDNeApn0WL8dSE8whRA9Y5mkL8KRNeAe4iQA0gTc9vMeEjNWDgnt9yd+S8RU3RUFQDzIH4rN/3fw/cs5v5eUEQZ54TOpHmECxgbHwB4u8GVlr2cd8Y44g1D2udSPMIFjA2vgDxu6ZennHEL7iSkeYSLGBsfGL+Bt5KJL7hgeDhrBMfrYMEjI3vgWWXCULxDauO/agBviZ4iG/4wWGADkE+JniKv+K6E9KLsBtzJ/OOFett+7sEY9LuLvHtPs0MiE6aWGIbID/LwPsePV8qvj6ICbkKvC4sJYvEtwYckjQu7ejBPTg2vmd+ndT+zTwd4Fwi8U0x7s8aDfgUuOgr/lQus0zwEd+Uoy9IE47RXiRgbLzvEy7wosCEZ8TvMEEsfshnu55y+wsYGx9SUrYiXugY81915LTZXhN8xT+CJ9J9dzUa1QA91XZoPxNm9vyW+NeAwx46HA1JXrr/roajGqDHlylsPBOcPX8qbos1y0wf/KCPni/VR5JsVAN9VzVZPxNOevT8ifgT/gH2pu75Un0kCUc10PdrRNafcM2cnXcDxJ/QeibE9PwJ0uPoSjqqgQHEv2/jVrtM6BC/1YQU4hukxxIsYGz8/1j0yKutsLYyqf14ir9hOIoddqYJ0dxLwNj4Kc5JJ005qpobTPAQf8K/JGReDLhjXm4I85GUlJ+YECB+cubFgA8Tij/hjxI+DpkHA24JZyn7iP/kCVdYtqB2A5YE+wh+meIoW/TOPBiwxxG/fca8nTZaazs5z4R5MGDBES+dk99ZWMtlQqjuYgFj43Hc/ZjvrBK+RhzcBF+9vQUswIBVz5KyeakzGNK8ggUcYAg6k1D8YwyMNLdgAQe4CC/MuANaKV18gzS/YAFj44GvBPvYCnwH/G63b4E3Shff0OQm1YNYKDnFNzS5EeZ5oKe2k5SUY+jjuHxFSFqMkwIcpwCa3HjkehF4PlGbH1MIKY4nVgwflhJ8SP0FBZFWzTBRhlxK4EcKox9V/YQJ4a7nYhoHpXM1h2YYlbsFiuG2/RR0j/2U9CW7bbd/Ox27nEzflGBAzQs2PSjBAF2yLCd21lqtLJZgwE476ak21pIsW5kCycdsI8T5rnsw7Itxs5xvLVxOun50QhNOjXw4WrNP82WJP40ZF82KsmZRU8Zxi/rQHsuJYsZ8RVEURVEURVGakvkPoBiHn1AV5KQAAAAASUVORK5CYII="/>
    </defs>
    </svg>
    
<span class="truncate text-sm font-semibold underline">{roomLink}</span>
</Button>
</div>

<style>
    /* Account for browser status bar / notch at the top on iOS/Android */
    .mobile-top-bar {
        padding-top: max(0.75rem, env(safe-area-inset-top, 0.75rem));
    }
</style>
