import type { VoiceSettings } from "./VoiceSettings";

export interface SetUpAudioSettingsRequest {
  id: string;
  userId: string;
  voiceId: string;
  voiceSettings: VoiceSettings;
}