export interface VoiceRequest {
    page: number;
    size: number; 
    searchTerm?: string;
    accent?: string;
    useCase?: string; 
    gender?: string;
}