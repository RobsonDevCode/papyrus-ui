import axiosInstance from "./AxiosInterceptor";
import type { SetUpAudioSettingsRequest } from "./models/SetUpAudioSettingsRequest";

class AudioSettingsUploadService{

    async createAudioSettings(request: SetUpAudioSettingsRequest) {
        try{
            const response = await axiosInstance.post('text-to-speech/setting', request);
            if(response.status !== 201){
                throw new Error(`Error creating audio settings server responded with ${response.status}: ${response.statusText}`);
            }
        }catch(error){
            throw new Error(`Error creating Audio settings: ${error instanceof Error ? error.message : "Unknown Error Occured"}`);
        }
    }
}

export const audioSettingsUploadApi = new AudioSettingsUploadService();
