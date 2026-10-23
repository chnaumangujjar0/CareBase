import axios from "axios"
const API_URL = import.meta.env.VITE_API_URL;
import api from "./axiosinstance"
import type { AuthResponseData, LoginPayload, OnboardingPayload, OnboardingResponseData, PlatformTenant, SignupPayload } from "../types/auth";
import type {
  AvailabilityWindow,
  AppointmentDoctorOption,
  AppointmentRecord,
  AppointmentStats,
  AppointmentStatus,
  CreateAppointmentPayload,
  CreatePatientPayload,
  CreateStaffProfilePayload,
  GrantedStaffSystemAccessResponse,
  CreatedStaffProfileResponse,
  CreatePatientMedicalDataPayload,
  PatientDetail,
  PatientListResponse,
  PatientMedicalData,
  PatientOption,
  StaffDirectoryEntry,
  HrDashboardSummary,
  GrantStaffSystemAccessPayload,
  UpdateStaffProfilePayload,
  UpdateAppointmentPayload,
  UpdatePatientProfilePayload,
  RoleRecord,
  StandardRoleOption,
  RoleListResponse,
  UpdateTenantDetailsPayload,
  BedRecord,
  BedStatus,
  FacilityListResponse,
  RoomRecord,
  WardRecord,
  ClinicalEncounter,
  ClinicalEncounterDetail,
  ClinicalEncounterList,
  ClinicalAdmissionList,
  ClinicalSurgeryList,
  DashboardSummary,
  DashboardMonthlySales,
  DashboardMonthlyRevenue,
  PublicDoctorDirectoryResponse,
  PublicAppointmentSlot,
  PublicAppointmentResult,
  PublicAppointmentDetails,
  ClinicalMedicine,
  ClinicalPrescription,
  ClinicalStockTransaction,
  AuditLogList,
  ClinicalConsultation,
  ClinicalSurgeryCase,
  PharmacyRecord,
  PharmacyStock,
  StockRequestRecord,
  StockRequestStatus,
  PharmacyDashboardData,
  PharmacySaleRecord,
  BillingCategory,
  BillingInvoice,
  BillingRate,
} from "../types/global.types";
import type { Tenant } from "../types/auth";

// user apis

export const registerUser = async (values: SignupPayload & { recaptchaToken: string }) => {
  const res = await axios.post(`${API_URL}/user/register`, {
    name: values.name.trim(),
    email: values.email.trim(),
    password: values.password.trim(),
    recaptchaToken: values.recaptchaToken,
  })

  return res.data.data

}


export const loginUser = async (values: LoginPayload & { recaptchaToken: string }) => {
  
  const res = await axios.post(`${API_URL}/user/login`,{
    email: values.email.trim(),
    password: values.password.trim(),
    recaptchaToken: values.recaptchaToken,
  })

  return res.data.data as AuthResponseData;
}

export const logoutUser = async () => {
  const refreshToken = localStorage.getItem("refreshToken")
  const res = await api.post("/user/logout",{refreshToken})
  
  return res.data
} 

export const getAuditLogs = async (params: {
  page: number;
  limit: number;
  action?: string;
  entityType?: string;
}): Promise<AuditLogList> => {
  const res = await api.get("/audit-logs", { params });
  return res.data.data as AuditLogList;
};

// Tenant Apis

export const configureTenant = async (values: OnboardingPayload | FormData) => {
    const res = await api.post("/tenant/onboarding", values, {
      headers: values instanceof FormData
        ? { "Content-Type": "multipart/form-data" }
        : undefined,
    });

    return res.data.data as OnboardingResponseData
}

export const getPlatformTenants = async (): Promise<PlatformTenant[]> => {
  const res = await api.get("/super-admin/tenants");
  return res.data.data as PlatformTenant[];
};

export const updatePlatformTenantApproval = async (
  tenantId: string,
  payload: { status: "pending" | "approved" | "rejected"; note?: string },
): Promise<Pick<PlatformTenant, "id" | "name" | "approvalStatus" | "approvalNote" | "approvalReviewedAt">> => {
  const res = await api.patch(`/super-admin/tenants/${tenantId}/approval`, payload);
  return res.data.data;
};


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

// Facility APIs

export const getWards = async (params: {
  page?: number;
  limit?: number;
  search?: string;
} = {}): Promise<FacilityListResponse<WardRecord>> => {
  const res = await api.get("/facility/wards", { params });
  return res.data.data as FacilityListResponse<WardRecord>;
};

export const getAllWards = async (): Promise<WardRecord[]> => {
  const result: WardRecord[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await getWards({ page, limit: 100 });
    result.push(...response.items);
    totalPages = response.pagination.totalPages;
    page += 1;
  }

  return result;
};

export const createWard = async (payload: {
  name: string;
  departmentId?: string | null;
}): Promise<WardRecord> => {
  const res = await api.post("/facility/wards", payload);
  return res.data.data as WardRecord;
};

export const updateWard = async (
  id: string,
  payload: { name?: string; departmentId?: string | null },
): Promise<WardRecord> => {
  const res = await api.patch(`/facility/wards/${id}`, payload);
  return res.data.data as WardRecord;
};

export const deleteWard = async (id: string): Promise<void> => {
  await api.delete(`/facility/wards/${id}`);
};

export const getRooms = async (params: {
  page?: number;
  limit?: number;
  search?: string;
  wardId?: string;
} = {}): Promise<FacilityListResponse<RoomRecord>> => {
  const res = await api.get("/facility/rooms", { params });
  return res.data.data as FacilityListResponse<RoomRecord>;
};

export const getAllRooms = async (): Promise<RoomRecord[]> => {
  const result: RoomRecord[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await getRooms({ page, limit: 100 });
    result.push(...response.items);
    totalPages = response.pagination.totalPages;
    page += 1;
  }

  return result;
};

export const createRoom = async (payload: {
  name: string;
  wardId: string;
}): Promise<RoomRecord> => {
  const res = await api.post("/facility/rooms", payload);
  return res.data.data as RoomRecord;
};

export const updateRoom = async (
  id: string,
  payload: { name?: string; wardId?: string },
): Promise<RoomRecord> => {
  const res = await api.patch(`/facility/rooms/${id}`, payload);
  return res.data.data as RoomRecord;
};

export const deleteRoom = async (id: string): Promise<void> => {
  await api.delete(`/facility/rooms/${id}`);
};

export const getBeds = async (params: {
  page?: number;
  limit?: number;
  search?: string;
  roomId?: string;
  wardId?: string;
  status?: BedStatus;
} = {}): Promise<FacilityListResponse<BedRecord>> => {
  const res = await api.get("/facility/beds", { params });
  return res.data.data as FacilityListResponse<BedRecord>;
};

export const createBed = async (payload: {
  code: string;
  roomId: string;
  status?: Exclude<BedStatus, "occupied">;
}): Promise<BedRecord> => {
  const res = await api.post("/facility/beds", payload);
  return res.data.data as BedRecord;
};

export const updateBed = async (
  id: string,
  payload: {
    version: number;
    code?: string;
    roomId?: string;
    status?: Exclude<BedStatus, "occupied">;
  },
): Promise<BedRecord> => {
  const res = await api.patch(`/facility/beds/${id}`, payload);
  return res.data.data as BedRecord;
};

export const deleteBed = async (id: string): Promise<void> => {
  await api.delete(`/facility/beds/${id}`);
};

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
};


// Staff apis

export const getHrDashboard = async (): Promise<HrDashboardSummary> => {
  const res = await api.get("/staff/hr-dashboard");
  return res.data.data as HrDashboardSummary;
};

export const createStaffProfile = async (values: CreateStaffProfilePayload) => {
  const res = await api.post("/staff/add", values)
  return res.data.data as CreatedStaffProfileResponse
}

export const updateStaffProfile = async (profileId: string, values: UpdateStaffProfilePayload) => {
  const res = await api.patch(`/staff/${profileId}`, values);
  return res.data.data;
};

export const grantStaffSystemAccess = async (profileId: string, values: GrantStaffSystemAccessPayload) => {
  const res = await api.post(`/staff/${profileId}/account`, values);
  return res.data.data as GrantedStaffSystemAccessResponse;
};

export const getGrantableStaffRoles = async (): Promise<GrantStaffSystemAccessPayload["role"][]> => {
  const res = await api.get("/staff/account-roles");
  return res.data.data as GrantStaffSystemAccessPayload["role"][];
};

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
  onlyNotCheckedIn?: boolean;
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

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const res = await api.get("/dashboard/summary");
  return res.data.data as DashboardSummary;
};

export const getDashboardMonthlySales = async (params: { months: 3 | 6 | 12; pharmacyId?: string }): Promise<DashboardMonthlySales> => {
  const res = await api.get("/dashboard/monthly-sales", { params });
  return res.data.data as DashboardMonthlySales;
};

export const getDashboardMonthlyRevenue = async (params: { months: 3 | 6 | 12; source: "all" | "billing" | "pharmacy"; paymentMethod?: "cash" | "card" | "insurance" }): Promise<DashboardMonthlyRevenue> => {
  const res = await api.get("/dashboard/monthly-revenue", { params });
  return res.data.data as DashboardMonthlyRevenue;
};

export const getPublicDoctors = async (params: { q?: string; hospital?: string; page?: number; limit?: number } = {}): Promise<PublicDoctorDirectoryResponse> => {
  const res = await api.get("/public/doctors", { params });
  return res.data.data as PublicDoctorDirectoryResponse;
};

export const getPublicDoctorSlots = async (doctorId: string, params: { from?: string; days?: number } = {}): Promise<PublicAppointmentSlot[]> => {
  const res = await api.get(`/public/doctors/${encodeURIComponent(doctorId)}/slots`, { params });
  return res.data.data as PublicAppointmentSlot[];
};

export const createPublicAppointment = async (payload: {
  doctorId: string;
  scheduledAt: string;
  firstName: string;
  lastName: string;
  dob: string;
  email: string;
  phone?: string;
}): Promise<PublicAppointmentResult> => {
  const res = await api.post("/public/appointments", payload);
  return res.data.data as PublicAppointmentResult;
};

export const lookupPublicAppointment = async (payload: { bookingCode: string; email: string }): Promise<PublicAppointmentDetails> => {
  const res = await api.post("/public/appointments/lookup", payload);
  return res.data.data as PublicAppointmentDetails;
};

// Clinical workflow APIs
export const getClinicalEncounters = async (params: {
  page?: number;
  limit?: number;
  departmentId?: string;
  doctorId?: string;
  status?: "waiting" | "in_progress" | "closed";
  triageLevel?: "critical" | "urgent" | "normal";
} = {}): Promise<ClinicalEncounterList> => {
  const res = await api.get("/clinical/encounters", { params });
  return res.data.data as ClinicalEncounterList;
};

export const createClinicalEncounter = async (payload: {
  patientId?: string;
  departmentId?: string;
  doctorId?: string | null;
  appointmentId?: string | null;
  type?: "outpatient" | "inpatient" | "emergency";
  source?: "appointment" | "walk_in" | "emergency" | "referral";
  chiefComplaint?: string | null;
  arrivalMode?: "walk_in" | "ambulance" | "referral" | null;
  triageLevel?: "critical" | "urgent" | "normal" | null;
}): Promise<ClinicalEncounter> => {
  const res = await api.post("/clinical/encounters", payload);
  return res.data.data as ClinicalEncounter;
};

export const getClinicalEncounter = async (encounterId: string): Promise<ClinicalEncounterDetail> => {
  const res = await api.get(`/clinical/encounters/${encounterId}`);
  return res.data.data as ClinicalEncounterDetail;
};

export const getClinicalAdmissions = async (params: {
  status?: "admitted" | "discharged";
  page?: number;
  limit?: number;
} = {}): Promise<ClinicalAdmissionList> => {
  const res = await api.get("/clinical/admissions", { params });
  return res.data.data as ClinicalAdmissionList;
};

export const getClinicalSurgeries = async (params: {
  status?: "scheduled" | "in_progress" | "completed" | "cancelled" | "postponed";
  page?: number;
  limit?: number;
} = {}): Promise<ClinicalSurgeryList> => {
  const res = await api.get("/clinical/surgeries", { params });
  return res.data.data as ClinicalSurgeryList;
};

export const updateClinicalEncounter = async (
  encounterId: string,
  payload: {
    status?: "waiting" | "in_progress" | "closed";
    disposition?: "discharged_home" | "admitted" | "transferred" | "referred_out" | "left_without_being_seen" | "deceased" | null;
    doctorId?: string | null;
    triageLevel?: "critical" | "urgent" | "normal" | null;
    chiefComplaint?: string | null;
    version: number;
  },
): Promise<ClinicalEncounter> => {
  const res = await api.patch(`/clinical/encounters/${encounterId}`, payload);
  return res.data.data as ClinicalEncounter;
};

export const createClinicalConsultation = async (
  encounterId: string,
  payload: {
    kind?: "initial" | "ward_round" | "pre_operative";
    chiefComplaint?: string | null;
    findings?: string | null;
    diagnosis?: string | null;
    notes?: string | null;
    followUpDate?: string | null;
  },
): Promise<ClinicalConsultation> => {
  const res = await api.post(`/clinical/encounters/${encounterId}/consultations`, payload);
  return res.data.data as ClinicalConsultation;
};

export const getClinicalMedicines = async (
  search?: string,
  includeInactive = false,
): Promise<ClinicalMedicine[]> => {
  const res = await api.get("/medicines", {
    params: { ...(search ? { search } : {}), ...(includeInactive ? { includeInactive: true } : {}) },
  });
  return res.data.data as ClinicalMedicine[];
};

export const createClinicalMedicine = async (payload: {
  name: string;
  genericName?: string | null;
  form?: string | null;
  strength?: string | null;
  purchasePrice?: number;
  sellingPrice?: number;
}): Promise<ClinicalMedicine> => {
  const res = await api.post("/medicines", payload);
  return res.data.data as ClinicalMedicine;
};

export const setClinicalMedicineActive = async (medicineId: string, isActive: boolean): Promise<ClinicalMedicine> => {
  const res = await api.patch(`/medicines/${medicineId}`, { isActive });
  return res.data.data as ClinicalMedicine;
};

export const getClinicalMedicineStockTransactions = async (
  medicineId: string,
): Promise<{ balance: number; transactions: ClinicalStockTransaction[] }> => {
  const res = await api.get(`/medicines/${medicineId}/stock-transactions`);
  return res.data.data as { balance: number; transactions: ClinicalStockTransaction[] };
};

export const createClinicalMedicineStockTransaction = async (
  medicineId: string,
  payload: { type: "IN" | "OUT"; quantity: number; reason?: string | null },
): Promise<{ balance: number; transaction: ClinicalStockTransaction }> => {
  const res = await api.post(`/medicines/${medicineId}/stock-transactions`, payload);
  return res.data.data as { balance: number; transaction: ClinicalStockTransaction };
};

export const getPharmacies = async (): Promise<PharmacyRecord[]> => {
  const res = await api.get("/pharmacies");
  return res.data.data as PharmacyRecord[];
};

export const getPharmacists = async (): Promise<Array<{ userId: string; name: string; email: string; role: string }>> => {
  const res = await api.get("/pharmacies/pharmacists");
  return res.data.data;
};

export const createPharmacy = async (payload: { name: string; type: "central_store" | "sub_store" }) => {
  const res = await api.post("/pharmacies", payload);
  return res.data.data as PharmacyRecord;
};

export const updatePharmacy = async (pharmacyId: string, payload: { name?: string; type?: "central_store" | "sub_store"; isActive?: boolean }) => {
  const res = await api.patch(`/pharmacies/${pharmacyId}`, payload);
  return res.data.data as PharmacyRecord;
};

export const assignPharmacist = async (pharmacyId: string, pharmacistUserId: string | null) => {
  const res = await api.patch(`/pharmacies/${pharmacyId}/pharmacist`, { pharmacistUserId });
  return res.data.data as PharmacyRecord;
};

export const getPharmacyDashboard = async (): Promise<PharmacyDashboardData> => {
  const res = await api.get("/pharmacies/dashboard");
  return res.data.data as PharmacyDashboardData;
};

export const createPharmacySale = async (pharmacyId: string, payload: {
  customerName: string;
  customerPhone?: string | null;
  patientId?: string | null;
  paymentMethod: "cash" | "card" | "insurance";
  items: Array<{ medicineId: string; quantity: number }>;
}): Promise<PharmacySaleRecord> => {
  const res = await api.post(`/pharmacies/${pharmacyId}/sales`, payload);
  return res.data.data as PharmacySaleRecord;
};

export const getPharmacyStock = async (pharmacyId: string): Promise<PharmacyStock[]> => {
  const res = await api.get(`/pharmacies/${pharmacyId}/stock`);
  return res.data.data as PharmacyStock[];
};

export const createPharmacyStockTransaction = async (
  pharmacyId: string,
  payload: { medicineId: string; type: "IN" | "OUT"; quantity: number; reason?: string | null; reorderLevel?: number },
) => {
  const res = await api.post(`/pharmacies/${pharmacyId}/stock-transactions`, payload);
  return res.data.data as { balance: number; stock: PharmacyStock; transaction: ClinicalStockTransaction };
};

export const transferWarehouseStock = async (payload: {
  sourcePharmacyId: string;
  destinationPharmacyId: string;
  medicineId: string;
  quantity: number;
  reason?: string | null;
}) => {
  const res = await api.post("/pharmacies/transfers", payload);
  return res.data.data as {
    transferId: string;
    quantity: number;
    source: Pick<PharmacyRecord, "id" | "name">;
    destination: Pick<PharmacyRecord, "id" | "name">;
  };
};

export const getStockRequests = async (status?: StockRequestStatus): Promise<StockRequestRecord[]> => {
  const res = await api.get("/pharmacies/requests", { params: status ? { status } : undefined });
  return res.data.data as StockRequestRecord[];
};

export const createStockRequest = async (payload: {
  requestingPharmacyId: string;
  fulfillingPharmacyId: string;
  notes?: string | null;
  items: Array<{ medicineId: string; requestedQuantity: number }>;
}): Promise<StockRequestRecord> => {
  const res = await api.post("/pharmacies/requests", payload);
  return res.data.data as StockRequestRecord;
};

export const updateStockRequestStatus = async (
  requestId: string,
  payload: { status: StockRequestStatus; notes?: string | null; receiptNote?: string | null; items?: Array<{ medicineId: string; approvedQuantity?: number; receivedQuantity?: number }> },
): Promise<StockRequestRecord> => {
  const res = await api.patch(`/pharmacies/requests/${requestId}/status`, payload);
  return res.data.data as StockRequestRecord;
};

export const getBillingRates = async (category?: BillingCategory): Promise<BillingRate[]> => {
  const res = await api.get("/billing/rates", { params: category ? { category } : undefined });
  return res.data.data as BillingRate[];
};

export const createBillingRate = async (payload: {
  code: string; name: string; category: BillingCategory; amount: number; taxRate: number; appointmentType?: string | null; procedureCode?: string | null; doctorId?: string | null; bedId?: string | null;
}): Promise<BillingRate> => {
  const res = await api.post("/billing/rates", payload);
  return res.data.data as BillingRate;
};

export const getBillingInvoices = async (params: { status?: string; patientId?: string } = {}): Promise<BillingInvoice[]> => {
  const res = await api.get("/billing/invoices", { params });
  return res.data.data as BillingInvoice[];
};

export const getBillableAppointments = async (): Promise<Array<{ id: string; scheduledAt: string; doctorId: string; Patient: { mrn: string; firstName: string; lastName: string }; DoctorProfile: { User: { name: string } } }>> => {
  const res = await api.get("/billing/candidates/appointments");
  return res.data.data;
};

export const getBillableAdmissions = async (): Promise<Array<{ id: string; admittedAt: string; Encounter: { Patient: { mrn: string; firstName: string; lastName: string } } }>> => {
  const res = await api.get("/billing/candidates/admissions");
  return res.data.data;
};

export const createAppointmentInvoice = async (appointmentId: string, rateId: string): Promise<BillingInvoice> => {
  const res = await api.post("/billing/invoices/appointment", { appointmentId, rateId });
  return res.data.data as BillingInvoice;
};

export const createInpatientInvoice = async (admissionId: string): Promise<BillingInvoice> => {
  const res = await api.post("/billing/invoices/inpatient", { admissionId });
  return res.data.data as BillingInvoice;
};

export const addBillingInvoiceItem = async (invoiceId: string, payload: { rateId: string; quantity: number; description?: string }): Promise<BillingInvoice> => {
  const res = await api.post(`/billing/invoices/${invoiceId}/items`, payload);
  return res.data.data as BillingInvoice;
};

export const collectBillingPayment = async (invoiceId: string, payload: { amount: number; method: "cash" | "card"; reference?: string; notes?: string }): Promise<BillingInvoice> => {
  const res = await api.post(`/billing/invoices/${invoiceId}/payments`, payload);
  return res.data.data as BillingInvoice;
};

export const getClinicalAvailableBeds = async (): Promise<BedRecord[]> => {
  const res = await api.get("/clinical/beds");
  return res.data.data as BedRecord[];
};

export const createClinicalPrescription = async (
  encounterId: string,
  payload: {
    notes?: string | null;
    items: Array<{
      medicineId?: string | null;
      medicineName: string;
      dose: string;
      frequency: string;
      durationDays?: number | null;
      instructions?: string | null;
    }>;
  },
): Promise<ClinicalPrescription> => {
  const res = await api.post(`/clinical/encounters/${encounterId}/prescriptions`, payload);
  return res.data.data as ClinicalPrescription;
};

export const cancelClinicalPrescription = async (prescriptionId: string): Promise<ClinicalPrescription> => {
  const res = await api.post(`/clinical/prescriptions/${prescriptionId}/cancel`);
  return res.data.data as ClinicalPrescription;
};

export const createClinicalAdmission = async (
  encounterId: string,
  payload: { reason: string; admissionDiagnosis?: string | null },
) => {
  const res = await api.post(`/clinical/encounters/${encounterId}/admissions`, payload);
  return res.data.data as { id: string; status: "admitted" | "discharged" };
};

export const assignClinicalAdmissionBed = async (admissionId: string, bedId: string) => {
  const res = await api.post(`/clinical/admissions/${admissionId}/bed-assignments`, { bedId });
  return res.data.data;
};

export const assignClinicalEncounterBed = async (encounterId: string, bedId: string) => {
  const res = await api.post(`/clinical/encounters/${encounterId}/bed-assignments`, { bedId });
  return res.data.data;
};

export const transferClinicalEncounterBed = async (
  encounterId: string,
  bedId: string,
  targetBedId: string,
) => {
  const res = await api.post(`/clinical/encounters/${encounterId}/bed-transfers`, { bedId, targetBedId });
  return res.data.data;
};

export const releaseClinicalEncounterBed = async (encounterId: string, bedId: string): Promise<void> => {
  await api.post(`/clinical/encounters/${encounterId}/bed-release`, { bedId });
};

export const transferClinicalAdmissionBed = async (
  admissionId: string,
  bedId: string,
  targetBedId: string,
) => {
  const res = await api.post(`/clinical/admissions/${admissionId}/bed-transfers`, { bedId, targetBedId });
  return res.data.data;
};

export const dischargeClinicalAdmission = async (
  admissionId: string,
  payload: {
    dischargeType: "routine" | "against_medical_advice" | "transferred" | "deceased";
    finalDiagnosis?: string | null;
    proceduresPerformed?: string | null;
    courseInHospital?: string | null;
    conditionAtDischarge?: string | null;
    followUpInstructions?: string | null;
    followUpDate?: string | null;
  },
) => {
  const res = await api.post(`/clinical/admissions/${admissionId}/discharge`, payload);
  return res.data.data;
};

export interface ClinicalTheatre {
  id: string;
  name: string;
  isActive: boolean;
}

export const getClinicalTheatres = async (includeInactive = false): Promise<ClinicalTheatre[]> => {
  const res = await api.get("/clinical/theatres", { params: includeInactive ? { includeInactive: true } : undefined });
  return res.data.data as Array<{ id: string; name: string; isActive: boolean }>;
};

export const getClinicalSurgeryTeamOptions = async (): Promise<Array<{ id: string; name: string }>> => {
  const res = await api.get("/clinical/surgery-team-options");
  return res.data.data as Array<{ id: string; name: string }>;
};

export const createClinicalTheatre = async (name: string): Promise<ClinicalTheatre> => {
  const res = await api.post("/clinical/theatres", { name });
  return res.data.data as ClinicalTheatre;
};

export const updateClinicalTheatre = async (
  theatreId: string,
  payload: { name?: string; isActive?: boolean },
): Promise<ClinicalTheatre> => {
  const res = await api.patch(`/clinical/theatres/${theatreId}`, payload);
  return res.data.data as ClinicalTheatre;
};

export const createClinicalSurgery = async (
  encounterId: string,
  payload: {
    procedureName: string;
    scheduledAt: string;
    durationMinutes: number;
    theatreId: string;
    surgeonId: string;
    admissionId?: string | null;
    anesthesiaType?: "general" | "regional" | "local" | "sedation" | null;
    preOpNotes?: string | null;
    team?: Array<{ userId: string; role: "assistant_surgeon" | "anesthetist" | "scrub_nurse" | "circulating_nurse" }>;
  },
): Promise<ClinicalSurgeryCase> => {
  const res = await api.post(`/clinical/encounters/${encounterId}/surgeries`, payload);
  return res.data.data as ClinicalSurgeryCase;
};

export const updateClinicalSurgery = async (
  surgeryId: string,
  payload: {
    status?: "scheduled" | "in_progress" | "completed" | "cancelled" | "postponed";
    scheduledAt?: string;
    version: number;
    outcomeNotes?: string | null;
  },
) => {
  const res = await api.patch(`/clinical/surgeries/${surgeryId}`, payload);
  return res.data.data as ClinicalSurgeryCase;
};


// role apis

export interface RolePayload {
  name: string;
}

export const getRoleCatalog = async (): Promise<StandardRoleOption[]> => {
  const res = await api.get("/roles/catalog");
  return res.data.data as StandardRoleOption[];
};

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
