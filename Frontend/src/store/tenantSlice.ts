import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import type { Tenant } from "../types/auth";
import api from "../services/axiosinstance";

export interface TenantState {
  data: Tenant | null;
  loading: boolean;
  initialized: boolean;
  requestId: string | null;
  requestedTenantId: string | null;
  error: string | null;
}

const initialState: TenantState = {
  data: null,
  loading: false,
  initialized: false,
  requestId: null,
  requestedTenantId: null,
  error: null,
};

export const fetchTenantById = createAsyncThunk<
  Tenant,
  string,
  { rejectValue: { message: string; isAuthFailure: boolean }; state: { tenant: TenantState } }
>("tenant/getTenantById", async (tenantId, { rejectWithValue }) => {
  try {
    const response = await api.get(`/tenant/${tenantId}`);
    return response.data?.data || response.data;
  } catch (err: unknown) {
    const error = axios.isAxiosError(err) ? err : undefined;
    const status = error?.response?.status;
    const isAuthFailure = status === 401 || status === 403;
    const message =
      error?.response?.data?.message ||
      (error?.response ? "Failed to fetch tenant" : "Network error while fetching tenant");

    return rejectWithValue({ message, isAuthFailure });
  }
}, {
  condition: (_tenantId, { getState }) => !getState().tenant.loading,
});

export const tenantSlice = createSlice({
  name: "tenant",
  initialState,
  reducers: {
    setTenant: (state, action: PayloadAction<Tenant>) => {
      state.data = action.payload;
      state.loading = false;
      state.initialized = true;
      state.requestId = null;
      state.requestedTenantId = action.payload.id;
      state.error = null;
    },
    clearTenant: (state) => {
      state.data = null;
      state.loading = false;
      state.initialized = true;
      state.requestId = null;
      state.requestedTenantId = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTenantById.pending, (state, action) => {
        state.loading = true;
        state.initialized = false;
        state.requestId = action.meta.requestId;
        state.requestedTenantId = action.meta.arg;
        state.error = null;
        if (state.data?.id !== action.meta.arg) state.data = null;
      })
      .addCase(fetchTenantById.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.data = action.payload;
        state.loading = false;
        state.initialized = true;
        state.requestId = null;
        state.requestedTenantId = action.payload.id;
        state.error = null;
      })
      .addCase(fetchTenantById.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.loading = false;
        state.initialized = true;
        state.requestId = null;
        state.error = action.payload?.message || "Failed to load tenant";

        // Same principle as authSlice: a network blip shouldn't wipe
        // already-loaded tenant data, only an actual auth rejection should.
        if (action.payload?.isAuthFailure) {
          state.data = null;
        }
      });
  },
});

export const { setTenant, clearTenant } = tenantSlice.actions;
export default tenantSlice.reducer;

export const selectCurrentTenant = (state: { tenant: TenantState }) => state.tenant.data;
export const selectTenantLoading = (state: { tenant: TenantState }) => state.tenant.loading;
export const selectTenantInitialized = (state: { tenant: TenantState }) =>
  state.tenant.initialized;
export const selectRequestedTenantId = (state: { tenant: TenantState }) =>
  state.tenant.requestedTenantId;
export const selectTenantError = (state: { tenant: TenantState }) => state.tenant.error;
