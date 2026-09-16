import { createSlice,type PayloadAction } from '@reduxjs/toolkit';
import type { Tenant } from '../types/auth';



// Maps over the Tenant interface to allow null values for the initial state
export type TenantState = {
  [K in keyof Tenant]: Tenant[K] | null;
};

const initialState: TenantState = {
  id: null,
  name: null,
  slug: null,
  logo: null,
  favicon: null,
  address: null,
  city: null,
  state: null,
  country: null,
  postalCode: null,
};

export const tenantSlice = createSlice({
  name: 'tenant',
  initialState,
  reducers: {
    // Sets the tenant data from the payload
    setTenant: (state, action: PayloadAction<Tenant>) => {
      return { ...state, ...action.payload };
    },
    clearTenant: () => {
      return initialState;
    },
  },
});

export const { setTenant, clearTenant } = tenantSlice.actions;
export default tenantSlice.reducer;