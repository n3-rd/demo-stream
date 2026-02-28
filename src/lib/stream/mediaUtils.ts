/** Supported media content types. */
export type MediaFileType = 'video' | 'pdf' | 'docx' | 'image' | 'unknown';

/**
 * Determine the media file type from a content-library item.
 * Checks `type`, `fileKind`, and the file extension in that order.
 */
export function determineFileType(item: any): MediaFileType {
    const type = (item?.type || '').toLowerCase();
    const fileKind = (item?.fileKind || '').toLowerCase();

    const typeMap: Record<string, MediaFileType> = {
        video: 'video',
        pdf: 'pdf',
        document: 'docx',
        image: 'image'
    };

    if (typeMap[type]) return typeMap[type];
    if (typeMap[fileKind]) return typeMap[fileKind];

    const fileName = (item?.file || '').toLowerCase();
    if (fileName.endsWith('.pdf')) return 'pdf';
    if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) return 'docx';
    if (
        fileName.endsWith('.mp4') ||
        fileName.endsWith('.avi') ||
        fileName.endsWith('.mov')
    ) return 'video';
    if (
        fileName.endsWith('.jpg') ||
        fileName.endsWith('.png') ||
        fileName.endsWith('.jpeg') ||
        fileName.endsWith('.gif')
    ) return 'image';

    return 'unknown';
}
