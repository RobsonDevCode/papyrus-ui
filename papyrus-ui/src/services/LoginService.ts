import axiosInstance from "./AxiosInterceptor";
import type { LoginRequest } from "./models/LoginRequest";
import type { UserResponse } from "./models/LoginResponse";
import type { SignUpRequest } from "./models/SignUpRequest";

class LoginApiService {
    async login(requst: LoginRequest): Promise<UserResponse> {
        try{
            const response = await axiosInstance.post<UserResponse>("user/login", requst);
            if(response.status != 200 && response.status != 400){
                throw new Error(`Error logging in server responded with ${response.status}: ${response.statusText}`)
            }

            return response.data;
        }catch(error){
            throw new Error(
                `Login Failed: ${error instanceof Error ? error.message : "Unknown error"}`)
        }
    }

    async signUp(request: SignUpRequest): Promise<UserResponse> {
        try{
            const response = await axiosInstance.post<UserResponse>("user", request);
            if(response.status !== 201 && response.status !== 400){
                throw new Error(`Error creating account server responded with ${response.status}: ${response.statusText}`)
            }

            return response.data;
        }catch(error){
            throw new Error(
                `Creating account Failed: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }

    }
}


export const userApi = new LoginApiService();