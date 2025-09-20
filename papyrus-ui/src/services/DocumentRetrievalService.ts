import axios from "axios";
import type { ApiConfig } from "./models/ApiConfig";
import type { PagedResponse } from "./models/PagedResponse";
import type { BookDocument } from "./models/BookDocument";

class DocumentRetrievalApiService {
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

  async getBooks(
    page: number,
    size: number,
    searchTerm?: string
  ): Promise<PagedResponse<BookDocument>> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
      });

      if (searchTerm && searchTerm.trim().length > 0) {
        //add simple jitter
        params.append("searchTerm", searchTerm.trim());
         const jitter = Math.random() * 100;
         await new Promise((resolve) => setTimeout(resolve, jitter));
      }

      const response = await this.axiosInstance.get<
        PagedResponse<BookDocument>
      >(`document?${params}`, {
        headers: { Accept: "application/json" },
      });

      if (response.status !== 200) {
        throw new Error(`Error getting available documents for page ${page}`);
      }

      console.log(response.data);
      return response.data;
    } catch (error) {
      throw new Error(
        `Get Failed: ${
          error instanceof Error
            ? error.message
            : `Unknown Error while getting documents`
        }`
      );
    }
  }
}

export const documentApi = new DocumentRetrievalApiService({
  baseUrl: import.meta.env.VITE_PAPYRUS_BASE_URL,
  timeout: 30000,
});
