import axios from "axios";
import type { ApiConfig } from "./models/ApiConfig";
import type { Response } from "./models/Response";



class DocumentUploadService {
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

  async uploadPDF(file: File): Promise<Response> {
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

      const result: Response = {
        success: true,
        message: "Document Uploaded",
      };

      return result;
    } catch (error) {
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const papyrusApi = new DocumentUploadService({
    baseUrl: import.meta.env.VITE_PAPYRUS_BASE_URL,
    timeout: 30000
});

export default DocumentUploadService;