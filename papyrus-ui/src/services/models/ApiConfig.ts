export interface ApiConfig{
    baseUrl: string,
    withCredentials: boolean,
    timeout?: number,
    headers?: Record<string, string>;
}