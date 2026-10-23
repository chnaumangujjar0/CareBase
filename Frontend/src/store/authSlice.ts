import {
  createListenerMiddleware,
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import axios from "axios";
import type { AuthUser } from "../types/auth";
import api from "../services/axiosinstance";

const STORAGE_KEY = "carebase-user";

const getStoredUser = (): AuthUser | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedUser = localStorage.getItem(STORAGE_KEY);
    if (!storedUser) return null;
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    return null;
  }
};

const persistUser = (user: AuthUser) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    // Keep authentication usable when browser storage is unavailable.
  }
};

const clearStoredSession = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  } catch {
    // Keep the Redux session state authoritative when browser storage is unavailable.
  }
};

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  requestId: string | null;
  error: string | null;
}

const initialState: AuthState = {
  user: getStoredUser(),
  loading: false,
  initialized: false,
  requestId: null,
  error: null,
};

export const fetchCurrentUser = createAsyncThunk<
  AuthUser,
  void,
  { rejectValue: { message: string; isAuthFailure: boolean }; state: { auth: AuthState } }
>("auth/fetchCurrentUser", async (_, { rejectWithValue }) => {
  try {
    const hasSessionToken = localStorage.getItem("accessToken") || localStorage.getItem("refreshToken");
    if (!hasSessionToken) {
      return rejectWithValue({ message: "No session token found", isAuthFailure: true });
    }

    const response = await api.get("/user/current-user");
    return response.data?.data;
  } catch (err: unknown) {
    const error = axios.isAxiosError(err) ? err : undefined;
    const status = error?.response?.status;

    const isAuthFailure = status === 401 || status === 403;
    const message =
      error?.response?.data?.message ||
      (error?.response ? "Failed to fetch session" : "Network error while verifying session");

    return rejectWithValue({ message, isAuthFailure });
  }
}, {
    condition: (_argument, { getState }) => !getState().auth.loading,
});

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      state.loading = false;
      state.initialized = true;
      state.requestId = null;
      state.error = null;
    },
    clearUser: (state) => {
      state.user = null;
      state.loading = false;
      state.initialized = true;
      state.requestId = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state, action) => {
        state.loading = true;
        state.requestId = action.meta.requestId;
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.user = action.payload;
        state.loading = false;
        state.initialized = true;
        state.requestId = null;
        state.error = null;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.loading = false;
        state.initialized = true;
        state.requestId = null;
        state.error = action.payload?.message || "Session expired";

        if (action.payload?.isAuthFailure) {
          state.user = null;
        }
      });
  },
});

export const { setUser, clearUser } = authSlice.actions;
export const authListenerMiddleware = createListenerMiddleware();
authListenerMiddleware.startListening({
  actionCreator: setUser,
  effect: ({ payload }) => persistUser(payload),
});
authListenerMiddleware.startListening({
  actionCreator: clearUser,
  effect: () => clearStoredSession(),
});
authListenerMiddleware.startListening({
  actionCreator: fetchCurrentUser.fulfilled,
  effect: ({ payload, meta }, listenerApi) => {
    const originalState = listenerApi.getOriginalState() as { auth: AuthState };
    if (originalState.auth.requestId === meta.requestId) persistUser(payload);
  },
});
authListenerMiddleware.startListening({
  actionCreator: fetchCurrentUser.rejected,
  effect: ({ payload, meta }, listenerApi) => {
    const originalState = listenerApi.getOriginalState() as { auth: AuthState };
    if (originalState.auth.requestId === meta.requestId && payload?.isAuthFailure) {
      clearStoredSession();
    }
  },
});

export default authSlice.reducer;

export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.loading;
export const selectAuthInitialized = (state: { auth: AuthState }) => state.auth.initialized;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
