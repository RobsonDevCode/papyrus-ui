import type { ApiConfig } from "./models/ApiConfig";
import axios from "axios";
import type { SetUpAudioSettingsRequest } from "./models/SetUpAudioSettingsRequest";

class AudioSettingsUploadService{
    private axiosInstance;

    constructor(config: ApiConfig){
        this.axiosInstance = axios.create({
            baseURL: config.baseUrl,
            timeout: config.timeout || 30000,
            headers: {
                ...config.headers,
            }
        })
    }

    async createAudioSettings(request: SetUpAudioSettingsRequest) {
        try{
            const response = await this.axiosInstance.post('text-to-speech/setting', request);
            if(response.status !== 201){
                throw new Error(`Error creating audio settings server responded with ${response.status}: ${response.statusText}`);
            }
        }catch(error){
            throw new Error(`Error creating Audio settings: ${error instanceof Error ? error.message : "Unknown Error Occured"}`);
        }
    }
}

export const audioSettingsUploadApi = new AudioSettingsUploadService({
  baseUrl: import.meta.env.VITE_PAPYRUS_BASE_URL,
  timeout: 30000,
});
