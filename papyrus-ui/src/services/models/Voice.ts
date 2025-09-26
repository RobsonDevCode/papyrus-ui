import type { LabelsResponse } from "./Labels";
import type { VoiceSettings } from "./VoiceSettings";

export interface Voice {
  voiceId: string;
  name: string;
  category?: string;
  description?: string;
  previewUrl?: string;
  settings?: VoiceSettings;
  labels?: LabelsResponse;
  isFavorited: boolean;
  isSelected: boolean;
  createdAtUnix?: number;
}