import axios from "axios";
import type { ApiConfig } from "./models/ApiConfig";
import type { CreateAudioBookRequest } from "./models/CreateAudioBookRequest";

class AudioService {
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

  async createAudio(request: CreateAudioBookRequest): Promise<string> {
    console.log(request);
    const response = await this.axiosInstance.post<Blob>(
      `text-to-speech`,
      request,
      {
        responseType: "blob",
      }
    );

    if (response.status !== 200) {
      throw new Error(
        `Error creating audio server responded with ${response.status}: ${response.statusText}`
      );
    }

    return URL.createObjectURL(response.data);
  }
}

export const audioApi = new AudioService({
  baseUrl: import.meta.env.VITE_PAPYRUS_BASE_URL,
  timeout: 600000,
});
