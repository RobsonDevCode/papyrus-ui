import type { VoiceSettings } from "./VoiceSettings";

export interface AudioSettings {
    id: string,
    voiceId: string, 
    voiceSettings: VoiceSettings,
    createdAt: Date,
    updatedAt: Date
}