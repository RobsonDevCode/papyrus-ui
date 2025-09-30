import type { VoiceSettings } from "./VoiceSettings";

export interface SetUpAudioSettingsRequest {
  id: string;
  voiceId: string;
  voiceSettings: VoiceSettings;
}