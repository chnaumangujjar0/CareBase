import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import { hospitalApi } from "./hospitalApi";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [hospitalApi.reducerPath]: hospitalApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(hospitalApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;