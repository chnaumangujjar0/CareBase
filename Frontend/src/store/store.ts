import { configureStore } from "@reduxjs/toolkit";
import authReducer, { authListenerMiddleware } from "./authSlice";
import tenantReducer from "./tenantSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tenant: tenantReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(authListenerMiddleware.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
