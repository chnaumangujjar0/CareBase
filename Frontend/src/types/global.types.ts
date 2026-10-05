export interface Department {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  tenantId: string;
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