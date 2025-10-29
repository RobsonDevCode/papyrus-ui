export interface CreateBookmarkRequet{
    id: string | null | undefined,
    userId: string, 
    documentGroupId: string,
    page: number,
    timestamp: number
}