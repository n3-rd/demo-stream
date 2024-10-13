(function() {
    const script = document.currentScript;
    const roomUrl = script.getAttribute('data-room-url');
    const width = script.getAttribute('data-width') || '100%';
    const height = script.getAttribute('data-height') || '600px';

    const iframe = document.createElement('iframe');
    iframe.src = roomUrl;
    iframe.style.border = 'none';
    iframe.style.width = width;
    iframe.style.height = height;
    iframe.allow = 'camera; microphone; fullscreen; display-capture; autoplay';

    script.parentNode.insertBefore(iframe, script);
})();

