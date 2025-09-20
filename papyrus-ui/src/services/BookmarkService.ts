import type { ApiConfig } from "./models/ApiConfig";
import type { Bookmark } from "./models/Bookmark";
import type { Response } from "./models/Response";
import axios from "axios";


class BookMarkApiService{
    private axiosInstance; 
    constructor(config: ApiConfig){
        this.axiosInstance = axios.create({
            baseURL: config.baseUrl,
            timeout: config.timeout || 30000,
            headers: {
                ...config.headers
            }
        })
    }

    async createBookmark(request: Bookmark): Promise<Response> {
        try{
            const response = await this.axiosInstance.post('bookmarks', request);
            if(response.status != 200){
                throw new Error(`Error creating bookmark server responded with ${response.status}: ${response.statusText}`);
            }
            
            const result: Response = {
                success: true,
                message: `Bookmark ${request.id} created`
            };
            return result;
        }
        catch(error){
             throw new Error(`Creating bookmark failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

        }
    }

    async getBookmark(documentGroupId: string): Promise<Bookmark | undefined>{
        try{
            const response = await this.axiosInstance.get<Bookmark>(`bookmark/${documentGroupId}`, {
               headers: { 'Accept': 'application/json' },
               validateStatus: (status) => status < 500
            })

            console.log(response);
            if(response.status === 404){
                console.log("book mark returned not found");
                return undefined;
            }
            if(response.status != 200){
              throw new Error(`Error getting bookmark for ${documentGroupId} server responded with ${response.status}: ${response.statusText}`)
            }

            console.log(response.data); 
            const bookmark: Bookmark = {
            id: response.data.id,
            documentGroupId: response.data.documentGroupId,
            page: response.data.page,
            createdAt: new Date(response.data.createdAt) 
        };

            return bookmark;
        }catch(error){
          throw new Error(`Get Failed: ${error instanceof Error ? error.message : `Unknown Error while getting bookmark`}`)
        }
    }
}

export const bookmarkApi = new BookMarkApiService({
    baseUrl: import.meta.env.VITE_PAPYRUS_BASE_URL,
    timeout: 30000
})