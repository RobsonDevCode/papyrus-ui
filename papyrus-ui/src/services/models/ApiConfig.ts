export interface ApiConfig{
    baseUrl: string,
    timeout?: number,
    headers?: Record<string, string>;
}