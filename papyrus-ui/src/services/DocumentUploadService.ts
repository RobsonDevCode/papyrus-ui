import axiosInstance from "./AxiosInstance";
import type { Response } from "./models/Response";



class DocumentUploadService {

  async uploadPDF(file: File, userId: string): Promise<Response> {
    const formData = new FormData();
    formData.append("pdfFile", file);
    try {
      const response = await axiosInstance.post(`/document/${userId}/save`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        },
        timeout: 180000,
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

export const papyrusApi = new DocumentUploadService();

export default DocumentUploadService;