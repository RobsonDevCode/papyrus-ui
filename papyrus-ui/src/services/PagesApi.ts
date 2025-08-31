import type { ApiConfig } from "./models/ApiConfig";
import type { PageModel } from "./models/Page";
import axios from "axios";


export interface FetchPagesRequest{
    documentGroupId: string;
    pages: number[];
}

export interface PageResponse{
  pages: PageModel[];
  totalPages: number;
}

class PagesApiService{
    private axiosIntance;
    constructor(config: ApiConfig){
        console.log(`base url: ${config.baseUrl}`);
        this.axiosIntance = axios.create({
            baseURL: config.baseUrl,
            timeout: config.timeout || 30000,
            headers:{
                ...config.headers,
            }
        })
    }


    async getPages(request: FetchPagesRequest): Promise<PageResponse> {
        try{
            const params = new URLSearchParams();
            for(var i = 0; i < request.pages.length; i++){
                params.append(`pageNumbers`, request.pages[i].toString())
            }

            const response = await this.axiosIntance.get<PageResponse>(`document/${request.documentGroupId}?${params}`,)
            console.log(`document/${request.documentGroupId}?${params}`);

            if(response.status != 200){
                throw new Error(`Error getting pages ${request.pages} server responded with ${response.status}: ${response.statusText}`)
            }

            console.log(response.data);
            return response.data;
        }catch(error){
            throw new Error(`Get Failed: ${error instanceof Error ? error.message : 'Unknown Error while getting pages'}`)
        }
    }
}

export const pagesApi = new PagesApiService({
    baseUrl: "https://localhost:7281/",
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
})