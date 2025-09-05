import type { ApiConfig } from "./models/ApiConfig";
import type { PageModel } from "./models/Page";
import axios from "axios";


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
    private axiosIntance;
    constructor(config: ApiConfig){
        this.axiosIntance = axios.create({
            baseURL: config.baseUrl,
            timeout: config.timeout || 30000,
            headers:{
                ...config.headers,
            }
        })
    }


    async getPages(request: FetchPagesRequest): Promise<ArrayBuffer> {
        try{
            const response = await this.axiosIntance.get<ArrayBuffer>(`document/${request.documentGroupId}`, {
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

    async getPage(request: FetchPageRequest): Promise<PageModel> {
        try{
            const response = await this.axiosIntance.get<PageModel>(`document/page/${request.documentGroupId}/${request.pageNumber}`)
            if(response.status != 200){
                throw new Error(`Error getting page ${request.pageNumber} for ${request.documentGroupId} server responded with ${response.status}: ${response.statusText}`)
            }

            return response.data; 
        }catch(error){
            throw new Error(`Get Failed: ${error instanceof Error ? error.message : `Unknown Error while getting page ${request.pageNumber}`}`)
        }
    }
}

export const pagesApi = new PagesApiService({
    baseUrl: import.meta.env.VITE_PAPYRUS_BASE_URL,
    timeout: 120000,
    headers: {
        'Content-Type': 'application/json'
    }
})