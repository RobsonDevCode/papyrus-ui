import axios from "axios";
import type { ApiConfig } from "./models/ApiConfig";

export interface UploadResponse {
  success: boolean;
  message?: string;
  error?: string;
}

class ApiService {
  private axiosInstance;
  constructor(config: ApiConfig) {
    console.log(`base url ${config.baseUrl}`);
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        ...config.headers,
      },
    });
  }

  async uploadPDF(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("pdfFile", file);
    try {
      const response = await this.axiosInstance.post("/document/save", formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
      });

      if (response.status != 200) {
        throw new Error(
          `Error saving document server responsded with ${response.status}: ${response.statusText}`
        );
      }

      const result: UploadResponse = {
        success: true,
        message: "Document Uploaded",
      };

      return result;
    } catch (error) {
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const papyrusApi = new ApiService({
    baseUrl: "https://localhost:7281/",
    timeout: 30000
});

export default ApiService;