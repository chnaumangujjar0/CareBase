import axios from "axios"
const API_URL = import.meta.env.VITE_API_URL;
import api from "./axiosinstance.js"
import type { AuthResponseData, LoginPayload, OnboardingPayload, OnboardingResponseData, SignupPayload } from "../types/auth.js";


// user apis

export const registerUser = async (values: SignupPayload) => {
  console.log(values)
  const res = await axios.post(`${API_URL}/user/register`, {
    name: values.name.trim(),
    email: values.email.trim(),
    password: values.password.trim()
  })

  return res.data.data

}


export const loginUser = async (values:LoginPayload) => {
  
  const res = await axios.post(`${API_URL}/user/login`,{
    email: values.email.trim(),
    password: values.password.trim()
  })

  return res.data.data as AuthResponseData;
}

export const logoutUser = async () => {
  const refreshToken = localStorage.getItem("refreshToken")
  const res = await api.post("/user/logout",{refreshToken})
  
  return res.data
} 

// Tenant Apis

export const configureTenat = async (values: OnboardingPayload | FormData) => {
    const res = await api.post("/tenant/onboarding", values, {
      headers: values instanceof FormData
        ? { "Content-Type": "multipart/form-data" }
        : undefined,
    });

    return res.data.data as OnboardingResponseData
}