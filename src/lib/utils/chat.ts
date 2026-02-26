
// Extract name from various formats (streamId, displayName, etc.)
export function extractAndNormalizeName(nameOrId: string): string {
    if (!nameOrId) return '';

    let cleanName = nameOrId;

    // If it looks like a stream ID (contains dash), extract the last part
    if (nameOrId.includes('-')) {
        cleanName = nameOrId.split('-').pop() || '';
    }

    // Remove "_representative" suffix and normalize underscores to spaces
    cleanName = cleanName.replace(/_+representative$/i, '').replace(/_/g, ' ').trim();

    return cleanName.toLowerCase();
}

// Helper function to check if a message is from the current user
export function isCurrentUserMessage(
    messageName: string,
    currentUserName: string,
    messageSenderId?: string,
    currentUserId?: string
): boolean {
    // If we have unique IDs, use them as they are much more reliable
    if (messageSenderId && currentUserId) {
        return messageSenderId === currentUserId;
    }

    if (!messageName || !currentUserName) return false;

    // Direct match
    if (messageName === currentUserName) return true;

    // Extract and normalize names
    const normalizedMessageName = extractAndNormalizeName(messageName);
    const normalizedCurrentName = extractAndNormalizeName(currentUserName);

    // Compare normalized names
    return normalizedMessageName === normalizedCurrentName;
}

export function getInitials(name: string): string {
    if (!name || name.trim() === '') return 'UN';

    // Use the same extraction logic
    const cleanName = extractAndNormalizeName(name);
    if (!cleanName) return 'UN';

    // Split by spaces and hyphens (underscores already converted to spaces)
    const parts = cleanName.split(/[\s-]+/).filter(part => part.length > 0);

    if (parts.length >= 2) {
        // Take first letter of first two parts
        return (parts[0][0] + parts[1][0]).toUpperCase();
    } else if (parts.length === 1 && parts[0].length >= 2) {
        // Take first two letters of single part
        return parts[0].substring(0, 2).toUpperCase();
    } else if (parts.length === 1 && parts[0].length === 1) {
        // Single character, duplicate it
        return (parts[0][0] + parts[0][0]).toUpperCase();
    }

    return 'UN';
}
