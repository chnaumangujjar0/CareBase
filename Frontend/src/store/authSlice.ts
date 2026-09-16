import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser } from "../types/auth";
import api from "../services/axiosinstance";

const getStoredUser = (): AuthUser | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const storedUser = window.localStorage.getItem("carebase-user");
  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    return null;
  }
};

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: getStoredUser(),
  loading: false,
  error: null,
};

export const fetchCurrentUser = createAsyncThunk<
  AuthUser,
  void,
  { rejectValue: string }
>("user/fetchCurrentUser", async (_, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      return rejectWithValue("No access token found");
    }

    const response = await api.get("/user/current-user");
    return response.data?.data || response.data;
  } catch (err: any) {
    const message = err?.response?.data?.message || "Failed to fetch session";
    return rejectWithValue(message);
  }
});

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      state.loading = false;
      state.error = null;
      localStorage.setItem("carebase-user", JSON.stringify(action.payload));
    },
    clearUser: (state) => {
      state.user = null;
      state.loading = false;
      state.error = null;
      localStorage.removeItem("carebase-user");
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
        state.error = null;
        localStorage.setItem("carebase-user", JSON.stringify(action.payload));
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.user = null;
        state.loading = false;
        state.error = action.payload || "Session expired";
        localStorage.removeItem("carebase-user");
      });
  },
});

export const { setUser, clearUser } = authSlice.actions;
export default authSlice.reducer;

export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.loading;