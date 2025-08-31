export interface PageModel{
    documentGroupId: string;
    documentName: string;
    author?: string;
    content: string;
    pageNumber: number;
    documentType: string;
    imageCount: number;
    imageUrl?: string;
    createAt?: Date;
    updateAt?: Date;
}