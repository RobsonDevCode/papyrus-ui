import axios from "axios";
import type { ApiConfig } from "./models/ApiConfig";
import type { CreateAudioBookRequest } from "./models/CreateAudioBookRequest";
import type { AudioWithAlignment } from "./models/AudioWithAlignment";

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

  async createAudio(request: CreateAudioBookRequest): Promise<AudioWithAlignment> {
    const response = await this.axiosInstance.post<AudioWithAlignment>(
      `text-to-speech`,
      request,
    );

    if (response.status !== 200) {
      throw new Error(
        `Error creating audio server responded with ${response.status}: ${response.statusText}`
      );
    }

    console.log(response.data);
    return response.data;
  }
}

export const audioApi = new AudioService({
  baseUrl: import.meta.env.VITE_PAPYRUS_BASE_URL,
  timeout: 600000,
});
