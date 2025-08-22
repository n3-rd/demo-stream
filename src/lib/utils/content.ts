// Utility function to normalize content items
export const normalizeContent = (items: any[]) => {
    return (items || []).map((item: any) => ({
        ...item,
        roles: item.library_type || [],
        fileKind: item.type || 'unknown',
        collectionId: item.collectionId || 'content_library'
    }));
}; 