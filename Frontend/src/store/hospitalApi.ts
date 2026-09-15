import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { clearUser } from "./authSlice";

// 1. Base Query (Attaches the token to every request)
const baseQuery = fetchBaseQuery({
  baseUrl: "http://localhost:8000/api/v1", 
  prepareHeaders: (headers) => {
    const token:string  | null= localStorage.getItem("accessToken")
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const refreshToken:string  | null= localStorage.getItem("refreshToken")
    if (refreshToken) {
      const refreshResult = await baseQuery(
        {
          url: "/refresh-token",
          method: "POST",
          body: { refreshToken: refreshToken },
        },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        const newAccessToken = (refreshResult.data as { data: { accessToken: string } }).data.accessToken;
        localStorage.setItem("accessToken",newAccessToken)
        result = await baseQuery(args, api, extraOptions); // Retry original request
      } else {
        api.dispatch(clearUser()); // Log out if refresh fails
      }
    } else {
      api.dispatch(clearUser());
    }
  }
  return result;
};

export const hospitalApi = createApi({
  reducerPath: "hospitalApi",
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
  login: builder.mutation({
    query: (credentials) => ({
      url: "/users/login",
      method: "POST",
      body: credentials,
    }),
  }),
  register: builder.mutation({
    query: (newUserData) => ({
      url: "/users/register",
      method: "POST",
      body: newUserData,
    }),
  }),
  setupTenant: builder.mutation({
    query: (tenantData) => ({
      url: "/tenant/onboarding",
      method: "POST",
      body: tenantData,
    }),
  }),
}),
});

// 4. Export the auto-generated React Hooks
export const { useLoginMutation,useRegisterMutation, useSetupTenantMutation } = hospitalApi;