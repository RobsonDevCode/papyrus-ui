export interface UserResponse{
    id: string,
    username: string,
    name: string | null,
    email: string | null,
    createdAt: Date,
    updatedAt: Date
}