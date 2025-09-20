export interface BookDocument{
    documentGroupId: string;
    name: string;
    frontCoverImageUrl?: string;
    author?: string;
    totalPages: number;
    createdAt: string;
}