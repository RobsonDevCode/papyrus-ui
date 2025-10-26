import type { PageModel } from "./models/Page";
import axiosInstance from "./AxiosInterceptor";


export interface FetchPagesRequest{
    documentGroupId: string;
}

export interface FetchPageRequest{
    documentGroupId: string
    pageNumber: number, 
}

export interface PageResponse{
  pages: PageModel[];
  totalPages: number;
}

class PagesApiService{

    async getPages(request: FetchPagesRequest, userId: string): Promise<ArrayBuffer> {
        try{
            const response = await axiosInstance.get<ArrayBuffer>(`document/${userId}/${request.documentGroupId}`, {
                responseType: 'arraybuffer'
            });
            
            if(response.status != 200){
                throw new Error(`Error getting document for ${request.documentGroupId} server responded with ${response.status}: ${response.statusText}`)
            }

            return response.data;
        }catch(error){
            throw new Error(`Get Failed: ${error instanceof Error ? error.message : 'Unknown Error while getting pages'}`)
        }
    }

    async getPage(request: FetchPageRequest, userId: string): Promise<PageModel> {
        try{
            const response = await axiosInstance.get<PageModel>(`document/${userId}/page/${request.documentGroupId}/${request.pageNumber}`)
            if(response.status != 200){
                throw new Error(`Error getting page ${request.pageNumber} for ${request.documentGroupId} server responded with ${response.status}: ${response.statusText}`)
            }

            return response.data; 
        }catch(error){
            throw new Error(`Get Failed: ${error instanceof Error ? error.message : `Unknown Error while getting page ${request.pageNumber}`}`)
        }
    }
}

export const pagesApi = new PagesApiService()