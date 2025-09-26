import type { ApiConfig } from "./models/ApiConfig";
import axios from "axios";
import type { VoiceRequest } from "./models/VoiceRequest";
import type { VoiceResponse } from "./models/VoiceResponse";

class VoiceRetrievalServcie {
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

  async getVoices(request: VoiceRequest): Promise<VoiceResponse> {
    try {
      const url = await this.buildQuery(request);
      console.log(url);
      const response = await this.axiosInstance.get<VoiceResponse>(url, {
        headers: { Accept: "application/json" },
      });

      if (response.status != 200) {
        throw new Error(
          `Error getting voices for ${request} server responded with ${response.status}: ${response.statusText}`
        );
      }

      console.log(response.data);
      return response.data;
    } catch (error) {
      throw new Error(
        `Get Failed: ${
          error instanceof Error
            ? error.message
            : `Unknown Error while getting voices`
        }`
      );
    }
  }

  async buildQuery(request: VoiceRequest): Promise<string> {
    const params = new URLSearchParams({
      page: request.page.toString(),
      size: request.size.toString(),
    });
    if (request.searchTerm && request.searchTerm.trim().length > 0) {
      params.append("searchTerm", request.searchTerm.trim());
      const jitter = Math.random() * 100;
      await new Promise((resolve) => setTimeout(resolve, jitter));
    }
    if (request.accent) {
      params.append("accent", request.accent);
    }
    if (request.useCase) {
      params.append("useCase", request.useCase);
    }
    if (request.gender) {
      params.append("gender", request.gender);
    }

    return `voice?${params}`;
  }
}


export const voiceRetrievalApi = new VoiceRetrievalServcie({
   baseUrl: import.meta.env.VITE_PAPYRUS_BASE_URL,
  timeout: 30000,
});