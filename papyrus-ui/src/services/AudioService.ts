import type { CreateAudioBookRequest } from "./models/CreateAudioBookRequest";
import type { AudioWithAlignment } from "./models/AudioWithAlignment";
import axiosInstance from "./AxiosInterceptor";

class AudioService {
  async createAudio(request: CreateAudioBookRequest): Promise<AudioWithAlignment> {
    const response = await axiosInstance.post<AudioWithAlignment>(
      `text-to-speech`,
      request,
    );

    if (response.status !== 200) {
      throw new Error(
        `Error creating audio server responded with ${response.status}: ${response.statusText}`
      );
    }

    return response.data;
  }
}

export const audioApi = new AudioService();
