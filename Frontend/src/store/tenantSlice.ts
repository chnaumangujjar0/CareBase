import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import type { Tenant } from "../types/auth";
import api from "../services/axiosinstance";

export interface TenantState {
  data: Tenant | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
}

const initialState: TenantState = {
  data: null,
  loading: false,
  initialized: false,
  error: null,
};

export const fetchTenantById = createAsyncThunk<
  Tenant,
  string,
  { rejectValue: { message: string; isAuthFailure: boolean } }
>("tenant/getTenantById", async (tenantId, { rejectWithValue }) => {
  try {
    const response = await api.get(`/tenant/${tenantId}`);
    return response.data?.data || response.data;
  } catch (err: any) {
    const status = err?.response?.status;
    const isAuthFailure = status === 401 || status === 403;
    const message =
      err?.response?.data?.message ||
      (err?.response ? "Failed to fetch tenant" : "Network error while fetching tenant");

    return rejectWithValue({ message, isAuthFailure });
  }
});

export const tenantSlice = createSlice({
  name: "tenant",
  initialState,
  reducers: {
    setTenant: (state, action: PayloadAction<Tenant>) => {
      state.data = action.payload;
      state.loading = false;
      state.initialized = true;
      state.error = null;
    },
    clearTenant: (state) => {
      state.data = null;
      state.loading = false;
      state.initialized = true;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTenantById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTenantById.fulfilled, (state, action: PayloadAction<Tenant>) => {
        state.data = action.payload;
        state.loading = false;
        state.initialized = true;
        state.error = null;
      })
      .addCase(fetchTenantById.rejected, (state, action) => {
        state.loading = false;
        state.initialized = true;
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
export const selectTenantError = (state: { tenant: TenantState }) => state.tenant.error;