import type { Paginiation } from "./Pagination";
import type { Voice } from "./Voice";

export interface VoiceResponse {
    items: Voice[];
    pagination: Paginiation;
}