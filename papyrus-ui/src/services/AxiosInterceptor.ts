import axiosInstance from "./AxiosInstance";

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve();
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (originalRequest.url === 'user/refresh-token') {
      isRefreshing = false;
      processQueue(error);
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => axiosInstance(originalRequest))
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      await axiosInstance.post('user/refresh-token');
      processQueue();
      isRefreshing = false;
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      isRefreshing = false;
      window.location.href = '/login';
      return Promise.reject(refreshError);
    }
  }
);

export default axiosInstance;