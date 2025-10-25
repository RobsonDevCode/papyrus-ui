import type { AudioSettings } from "./models/AudioSettings";
import axiosInstance from "./AxiosInterceptor";

class AudioSettingsRetrievalService {
  async getAudioSettings(userId: string): Promise<AudioSettings | undefined> {
    try {
      const response = await axiosInstance.get<AudioSettings>(
        `text-to-speech/setting/${userId}`,
        {
          headers: { Accept: "application/json" },
          validateStatus: (status) => status < 500,
        }
      );
      if (response.status === 404) {
        return undefined;
      }

      return response.data;
    } catch (error) {
      throw new Error(
        `Get Failed: ${
          error instanceof Error
            ? error.message
            : `Unknown Error while getting audio settings`
        }`
      );
    }
  }
}

export const audioSettingsRetrievalApi = new AudioSettingsRetrievalService();
