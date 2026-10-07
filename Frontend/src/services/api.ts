import axios from "axios"
const API_URL = import.meta.env.VITE_API_URL;
import api from "./axiosinstance.js"
import type { AuthResponseData, LoginPayload, OnboardingPayload, OnboardingResponseData, SignupPayload } from "../types/auth.js";
import type {
  AvailabilityWindow,
  AppointmentDoctorOption,
  AppointmentRecord,
  AppointmentStats,
  AppointmentStatus,
  CreateAppointmentPayload,
  CreatePatientPayload,
  CreateStaffProfilePayload,
  CreatedStaffProfileResponse,
  CreatePatientMedicalDataPayload,
  PatientDetail,
  PatientListResponse,
  PatientMedicalData,
  PatientOption,
  StaffDirectoryEntry,
  UpdateAppointmentPayload,
  UpdatePatientProfilePayload,
  RoleRecord,
  RoleListResponse,
  UpdateTenantDetailsPayload,
} from "../types/global.types";
import type { Tenant } from "../types/auth";

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


export const getTenantById = async (tenantId : string) => {
  const res = await api.get(`/tenant/${tenantId}`)

  return res.data.data
}

export const updateTenantDetails = async (
  values: UpdateTenantDetailsPayload | FormData,
): Promise<Tenant> => {
  const res = await api.patch("/tenant", values, {
    headers: values instanceof FormData
      ? { "Content-Type": "multipart/form-data" }
      : undefined,
  });

  return res.data.data as Tenant;
}

// department Apis 
interface DepartmentPayload {
  name: string;
  isActive: boolean;
}
export const addDepartment = async (values:DepartmentPayload,tenantId:string) => {
  const res = await api.post(`/department/${tenantId}/add`,values)
  return res.data.data
}

export const getDepartments = async (tenantId:string) => {
  const res = await api.get(`/department/${tenantId}/all`)

  return res.data.data
}

export const updateDepartment = async (tenantId: string,deptId: string,values:Record<string, unknown>) => {
  const res = await api.patch(`/department/${tenantId}/update`,{departmentId: deptId,...values})

  return res.data.data
}

export const deleteDepartment = async (tenantId: string,deptId: string,) => {
  const res = await api.delete(`/department/${tenantId}/delete`, { data: { departmentId: deptId } })

  return res.data
}


// Staff apis

export const createStaffProfile = async (values: CreateStaffProfilePayload) => {
  const res = await api.post("/staff/add", values)
  return res.data.data as CreatedStaffProfileResponse
}

export const getAllStaff = async (): Promise<StaffDirectoryEntry[]> => {
  const res = await api.get("/staff/get-staff")

  return (res.data.data as Omit<StaffDirectoryEntry, "image">[]).map((profile) => ({
    ...profile,
    availability: profile.availability as AvailabilityWindow[],
    image: `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=E2E8F0&color=0F766E`,
  }))
}

export const updateStaffAvailability = async (
  profileId: string,
  type: "Doctor" | "Staff",
  availability: AvailabilityWindow[],
): Promise<AvailabilityWindow[]> => {
  const res = await api.patch("/staff/availability", { profileId, type, availability })
  return res.data.data as AvailabilityWindow[]
}

export const getPatients = async (params: {
  search?: string;
  page?: number;
  limit?: number;
  isActive?: "true" | "false";
} = {}) => {
  const res = await api.get("/patients", { params })
  return res.data.data as PatientListResponse
}

export const createPatient = async (payload: CreatePatientPayload): Promise<PatientOption> => {
  const res = await api.post("/patients", payload)
  return res.data.data as PatientOption
}

export const getPatient = async (patientId: string): Promise<PatientDetail> => {
  const res = await api.get(`/patients/${patientId}`)
  return res.data.data as PatientDetail
}

export const updatePatient = async (
  patientId: string,
  payload: UpdatePatientProfilePayload,
): Promise<PatientDetail> => {
  const res = await api.patch(`/patients/${patientId}`, payload)
  return res.data.data as PatientDetail
}

export const addPatientMedicalData = async (
  patientId: string,
  payload: CreatePatientMedicalDataPayload,
): Promise<PatientMedicalData> => {
  const res = await api.post(`/patients/${patientId}/medical-data`, payload)
  return res.data.data as PatientMedicalData
}

export const getAppointmentOptions = async () => {
  const res = await api.get("/appointments/options")
  return res.data.data as { doctors: AppointmentDoctorOption[] }
}

export const getAppointments = async (params: {
  doctorId?: string;
  status?: AppointmentStatus;
  from?: string;
  to?: string;
} = {}) => {
  const res = await api.get("/appointments", { params })
  return res.data.data as AppointmentRecord[]
}

export const createAppointment = async (payload: CreateAppointmentPayload) => {
  const res = await api.post("/appointments", payload)
  return res.data.data as AppointmentRecord
}

export const updateAppointment = async (
  appointmentId: string,
  payload: UpdateAppointmentPayload,
) => {
  const res = await api.patch(`/appointments/${appointmentId}`, payload)
  return res.data.data as AppointmentRecord
}

export const getAppointmentStat = async (params: { from: string; to: string }): Promise<AppointmentStats> => {
  const res = await api.get("/appointments/get-stats", { params })
  return res.data.data as AppointmentStats
}

export interface RolePayload {
  name: string;
  permissions: string[];
}

export const getRoles = async (params: { page: number; limit: number }): Promise<RoleListResponse> => {
  const res = await api.get("/roles/get-roles", { params })
  return res.data.data as RoleListResponse
}

export const createRole = async (payload: RolePayload): Promise<RoleRecord> => {
  const res = await api.post("/roles/create", payload)
  return res.data.data as RoleRecord
}

export const updateRole = async (roleId: string, payload: Partial<RolePayload>): Promise<RoleRecord> => {
  const res = await api.patch(`/roles/${roleId}`, payload)
  return res.data.data as RoleRecord
}

export const deleteRole = async (roleId: string): Promise<void> => {
  await api.delete(`/roles/${roleId}`)
}