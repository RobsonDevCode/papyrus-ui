import axiosInstance from "./AxiosInterceptor";
import type { Bookmark } from "./models/Bookmark";
import type { CreateBookmarkRequet } from "./models/CreateBookmark";
import type { Response } from "./models/Response";

class BookMarkApiService {
  async createBookmark(request: CreateBookmarkRequet): Promise<Response> {
    try {
      const response = await axiosInstance.post("bookmark", request);
      console.log(`response ${response.status}`);
      if (response.status !== 201) {
        throw new Error(
          `Error creating bookmark server responded with ${response.status}: ${response.statusText}`
        );
      }

      const result: Response = {
        success: true,
        message: `Bookmar created`,
      };
      return result;
    } catch (error) {
      throw new Error(
        `Creating bookmark failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async getBookmark(documentGroupId: string, userId: string): Promise<Bookmark | undefined> {
    try {
      const response = await axiosInstance.get<Bookmark>(
        `bookmark/${userId}/${documentGroupId}`,
        {
          headers: { Accept: "application/json" },
          validateStatus: (status) => status < 500,
        }
      );

      if (response.status === 404) {
        console.log("book mark returned not found");
        return undefined;
      }
      if (response.status != 200) {
        throw new Error(
          `Error getting bookmark for ${documentGroupId} server responded with ${response.status}: ${response.statusText}`
        );
      }

      return response.data;
    } catch (error) {
      throw new Error(
        `Get Failed: ${
          error instanceof Error
            ? error.message
            : `Unknown Error while getting bookmark`
        }`
      );
    }
  }
}

export const bookmarkApi = new BookMarkApiService();
