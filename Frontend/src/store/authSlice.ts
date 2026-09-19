import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser } from "../types/auth";
import api from "../services/axiosinstance";

const STORAGE_KEY = "carebase-user";

const getStoredUser = (): AuthUser | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const storedUser = localStorage.getItem(STORAGE_KEY);
  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: getStoredUser(),
  loading: false,
  initialized: false,
  error: null,
};

export const fetchCurrentUser = createAsyncThunk<
  AuthUser,
  void,
  { rejectValue: { message: string; isAuthFailure: boolean } }
>("auth/fetchCurrentUser", async (_, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      return rejectWithValue({ message: "No access token found", isAuthFailure: true });
    }

    const response = await api.get("/user/current-user");
    console.log(response.data?.data);
    return response.data?.data;
  } catch (err: any) {
    const status = err?.response?.status;

    const isAuthFailure = status === 401 || status === 403;
    const message =
      err?.response?.data?.message ||
      (err?.response ? "Failed to fetch session" : "Network error while verifying session");

    return rejectWithValue({ message, isAuthFailure });
  }
});

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      state.loading = false;
      state.initialized = true;
      state.error = null;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(action.payload));
    },
    clearUser: (state) => {
      state.user = null;
      state.loading = false;
      state.initialized = true;
      state.error = null;
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action: PayloadAction<AuthUser>) => {
        state.user = action.payload;
        state.loading = false;
        state.initialized = true;
        state.error = null;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(action.payload));
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.initialized = true;
        state.error = action.payload?.message || "Session expired";

        if (action.payload?.isAuthFailure) {
          state.user = null;
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
        }
      });
  },
});

export const { setUser, clearUser } = authSlice.actions;
export default authSlice.reducer;

export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.loading;
export const selectAuthInitialized = (state: { auth: AuthState }) => state.auth.initialized;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;