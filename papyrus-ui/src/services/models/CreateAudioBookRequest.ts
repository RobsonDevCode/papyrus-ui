import type { VoiceSettings } from "./VoiceSettings";

export interface CreateAudioBookRequest {
    documentGroupId: string,
    voiceId: string, 
    pages: number[],
    text: string,
    settings: VoiceSettings
}