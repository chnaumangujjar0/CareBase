import axios, {
  AxiosError,
} from "axios";
import type { AxiosInstance ,InternalAxiosRequestConfig,AxiosResponse} from "axios";
interface QueueItem {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface RefreshTokenResponse {
  accessToken?: string;
  data?: {
    accessToken?: string;
  };
}

const API_URL = import.meta.env.VITE_API_URL as string;

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});


let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("accessToken");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err: unknown) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
          throw new Error("No refresh token stored in local storage.");
        }

        const response = await axios.post<RefreshTokenResponse>(
          `${API_URL}/user/refresh-token`,
          { refreshToken },
        );

        const newAccessToken =
          response.data?.accessToken || response.data?.data?.accessToken;

        if (!newAccessToken) {
          throw new Error("Invalid token response structure from server.");
        }

        localStorage.setItem("accessToken", newAccessToken);

        api.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);

        return api(originalRequest);
      } catch (refreshError: unknown) {
        processQueue(refreshError, null);

        
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");

        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;