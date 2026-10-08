export interface Department {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  tenantId: string;
}

export interface FacilityPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FacilityListResponse<T> {
  items: T[];
  pagination: FacilityPagination;
}

export interface WardRecord {
  id: string;
  name: string;
  departmentId: string | null;
  tenantId: string;
  Department?: { id: string; name: string } | null;
  _count?: { Room: number };
}

export interface RoomRecord {
  id: string;
  name: string;
  wardId: string;
  tenantId: string;
  Ward?: { id: string; name: string };
  _count?: { Bed: number };
}

export type BedStatus =
  | "available"
  | "occupied"
  | "cleaning"
  | "maintenance"
  | "reserved";

export interface BedRecord {
  id: string;
  code: string;
  status: BedStatus;
  roomId: string;
  tenantId: string;
  currentPatientId: string | null;
  version: number;
  Room?: {
    id: string;
    name: string;
    wardId?: string;
    Ward?: { id: string; name: string };
  };
}

export interface AvailabilityWindow {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  isActive?: boolean;
}

export interface StaffDirectoryEntry {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  type: "Doctor" | "Staff";
  bio: string;
  availability: AvailabilityWindow[];
  image: string;
}

interface StaffProfilePayloadBase {
  name: string;
  email: string;
  password: string;
  employeeId: string;
  departmentId: string;
  phone: string;
  isActive: boolean;
  availability: AvailabilityWindow[];
  description?: string;
  designation?: string;
}

export type CreateStaffProfilePayload = StaffProfilePayloadBase &
  (
    | {
        type: "Doctor";
        specialization: string;
        licenseNumber: string;
        qualifications?: string;
      }
    | {
        type: "Staff";
        role: string;
        wardId?: string;
        joiningDate?: string;
      }
  );

export interface CreatedStaffProfileResponse {
  user: {
    id: string;
    name: string;
    email: string;
    tenantId: string;
    roleId: string;
    isActive: boolean;
  };
  profile: { id: string };
  availability: AvailabilityWindow[];
  type: "Doctor" | "Staff";
}

export type AppointmentStatus = "booked" | "completed" | "cancelled" | "no_show";

export interface AppointmentRecord {
  id: string;
  status: AppointmentStatus;
  scheduledAt: string;
  durationMinutes: number;
  notes: string | null;
  version: number;
  Patient: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
    contactPhone: string | null;
  };
  DoctorProfile: {
    id: string;
    specialization: string;
    designation: string | null;
    User: { id: string; name: string };
  };
  Department: { id: string; name: string };
}

export interface AppointmentStats {
  appointments: AppointmentRecord[];
  counts: {
    total: number;
    uniquePatients: number;
    booked: number;
    completed: number;
    cancelled: number;
    no_show: number;
    byStatus: Partial<Record<AppointmentStatus, number>>;
  };
}

export interface RoleRecord {
  id: string;
  code: string;
  name: string;
  permissions: string[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoleListResponse {
  roles: RoleRecord[];
  page: number;
  limit: number;
  total: number;
  showingFrom: number;
  showingTo: number;
}

export interface AppointmentDoctorOption {
  id: string;
  departmentId: string;
  specialization: string;
  designation: string | null;
  User: { name: string };
  Department: { name: string };
}

export interface PatientOption {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  address: string | null;
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  isActive: boolean;
}

export interface PatientListResponse {
  items: PatientOption[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreatePatientPayload {
  mrn: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender?: "male" | "female" | "other" | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
}

export interface PatientMedicalData {
  id: string;
  recordedAt: string;
  heartRate: number | null;
  totalCholesterol: number | null;
  hemoglobin: number | null;
  systolicBloodPressure: number | null;
  diastolicBloodPressure: number | null;
  bloodGlucose: number | null;
  whiteBloodCellCount: number | null;
  bodyMassIndex: number | null;
  respiratoryRate: number | null;
  plateletCount: number | null;
  allergies: string | null;
  chronicConditions: string | null;
  pastSurgeries: string | null;
  note: string | null;
}

export interface PatientUpcomingAppointment {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  Department: { name: string };
  DoctorProfile: {
    designation: string | null;
    specialization: string;
    User: { name: string };
  };
}

export interface PatientDetail extends PatientOption {
  tenantId: string;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  MedicalData: PatientMedicalData[];
  Appointment: PatientUpcomingAppointment[];
}

export interface CreatePatientMedicalDataPayload {
  recordedAt?: string;
  heartRate?: number;
  totalCholesterol?: number;
  hemoglobin?: number;
  systolicBloodPressure?: number;
  diastolicBloodPressure?: number;
  bloodGlucose?: number;
  whiteBloodCellCount?: number;
  bodyMassIndex?: number;
  respiratoryRate?: number;
  plateletCount?: number;
  allergies?: string;
  chronicConditions?: string;
  pastSurgeries?: string;
  note?: string;
}

export interface UpdatePatientProfilePayload {
  insuranceProvider?: string | null;
  insurancePolicyNumber?: string | null;
}

export interface UpdateTenantDetailsPayload {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface CreateAppointmentPayload {
  patientId: string;
  doctorId: string;
  departmentId: string;
  scheduledAt: string;
  durationMinutes: number;
  notes?: string;
}

export interface UpdateAppointmentPayload {
  scheduledAt?: string;
  durationMinutes?: number;
  status?: AppointmentStatus;
  notes?: string | null;
  version: number;
}