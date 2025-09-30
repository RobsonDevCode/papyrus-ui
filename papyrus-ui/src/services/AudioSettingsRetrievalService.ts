import axios from "axios";
import type { ApiConfig } from "./models/ApiConfig";
import type { AudioSettings } from "./models/AudioSettings";

class AudioSettingsRetrievalService {
  private axiosInstance;
  constructor(config: ApiConfig) {
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        ...config.headers,
      },
    });
  }

  async getAudioSettings(): Promise<AudioSettings | undefined> {
    try {
      const response = await this.axiosInstance.get<AudioSettings>(
        "text-to-speech/setting",
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

export const audioSettingsRetrievalApi = new AudioSettingsRetrievalService({
  baseUrl: import.meta.env.VITE_PAPYRUS_BASE_URL,
  timeout: 30000,
});
