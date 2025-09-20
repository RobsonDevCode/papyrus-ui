import type { Paginiation } from "./Pagination";

export interface PagedResponse<T>{
    items: T[];
    pagination: Paginiation;
}