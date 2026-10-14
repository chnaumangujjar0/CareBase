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

export type EncounterType = "outpatient" | "inpatient" | "emergency";
export type EncounterSource = "appointment" | "walk_in" | "emergency" | "referral";
export type EncounterStatus = "waiting" | "in_progress" | "closed";
export type TriageLevel = "critical" | "urgent" | "normal";
export type EncounterDisposition =
  | "discharged_home"
  | "admitted"
  | "transferred"
  | "referred_out"
  | "left_without_being_seen"
  | "deceased";

export interface ClinicalEncounter {
  id: string;
  type: EncounterType;
  source: EncounterSource;
  status: EncounterStatus;
  disposition: EncounterDisposition | null;
  chiefComplaint: string | null;
  startedAt: string;
  endedAt: string | null;
  version: number;
  queueDate: string | null;
  queueNumber: number | null;
  triageLevel: TriageLevel | null;
  patientId: string;
  departmentId: string;
  doctorId: string | null;
  appointmentId: string | null;
  Patient: Pick<PatientOption, "id" | "mrn" | "firstName" | "lastName" | "contactPhone">;
  Department: { id: string; name: string };
  DoctorProfile: { id: string; User: { id: string; name: string } } | null;
  Appointment: { id: string; scheduledAt: string; status: AppointmentStatus } | null;
}

export interface ClinicalConsultation {
  id: string;
  kind: "initial" | "ward_round" | "pre_operative";
  chiefComplaint: string | null;
  findings: string | null;
  diagnosis: string | null;
  notes: string | null;
  followUpDate: string | null;
  createdAt: string;
  DoctorProfile?: { User: { name: string } };
}

export interface ClinicalMedicine {
  id: string;
  name: string;
  genericName: string | null;
  form: string | null;
  strength: string | null;
  isActive: boolean;
  stockCount: number;
}

export interface ClinicalPrescriptionItem {
  id: string;
  medicineName: string;
  dose: string;
  frequency: string;
  durationDays: number | null;
  instructions: string | null;
  Medicine: ClinicalMedicine | null;
}

export interface ClinicalStockTransaction {
  id: string;
  type: "IN" | "OUT";
  quantity: number;
  reason: string | null;
  createdAt: string;
  User: { id: string; name: string } | null;
}

export interface AuditLogEntry {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  User: { id: string; name: string; email: string } | null;
}

export interface AuditLogList {
  items: AuditLogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ClinicalPrescription {
  id: string;
  status: "active" | "cancelled";
  notes: string | null;
  createdAt: string;
  PrescriptionItem: ClinicalPrescriptionItem[];
}

export interface ClinicalAdmission {
  id: string;
  status: "admitted" | "discharged";
  reason: string;
  admissionDiagnosis: string | null;
  admittedAt: string;
  dischargedAt: string | null;
  dischargeType: string | null;
  version: number;
  BedAssignment: Array<{
    id: string;
    bedId: string;
    assignedAt: string;
    releasedAt: string | null;
    Bed: BedRecord;
  }>;
  Encounter?: Pick<ClinicalEncounter, "id" | "type" | "status" | "startedAt"> & {
    Patient: Pick<PatientOption, "id" | "mrn" | "firstName" | "lastName">;
    Department: { id: string; name: string };
  };
  AdmittingDoctor?: { User: { id: string; name: string } };
  DischargeSummary: {
    finalDiagnosis: string | null;
    proceduresPerformed: string | null;
    courseInHospital: string | null;
    conditionAtDischarge: string | null;
    followUpInstructions: string | null;
    followUpDate: string | null;
  } | null;
}

export interface ClinicalSurgeryCase {
  id: string;
  procedureName: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "postponed";
  scheduledAt: string;
  durationMinutes: number;
  startedAt: string | null;
  endedAt: string | null;
  anesthesiaType: string | null;
  preOpNotes: string | null;
  outcomeNotes: string | null;
  version: number;
  Encounter?: {
    id: string;
    Patient: Pick<PatientOption, "id" | "mrn" | "firstName" | "lastName">;
    Department: { id: string; name: string };
  };
  OperatingTheatre: { id: string; name: string };
  Surgeon?: { id: string; User: { id: string; name: string } };
  SurgeryTeamMember: Array<{ id: string; role: string; userId: string; User?: { name: string } }>;
}

export interface ClinicalEncounterDetail extends ClinicalEncounter {
  Consultation: ClinicalConsultation[];
  Prescription: ClinicalPrescription[];
  Admission: ClinicalAdmission | null;
  BedAssignment: ClinicalAdmission["BedAssignment"];
  SurgeryCase: ClinicalSurgeryCase[];
  PatientMedicalData: PatientMedicalData[];
}

export interface ClinicalEncounterList {
  items: ClinicalEncounter[];
  pagination: FacilityPagination;
}

export interface ClinicalAdmissionList {
  items: ClinicalAdmission[];
  pagination: FacilityPagination;
}

export interface ClinicalSurgeryList {
  items: ClinicalSurgeryCase[];
  pagination: FacilityPagination;
}

export interface DashboardSummary {
  generatedAt: string;
  scope: "hospital" | "doctor";
  stats: {
    activePatients: number;
    newPatientsToday: number;
    activeDoctors: number;
    activeStaff: number;
    appointmentsToday: number;
    bookedAppointmentsToday: number;
    completedAppointmentsToday: number;
    cancelledAppointmentsToday: number;
    noShowAppointmentsToday: number;
    availableBeds: number;
    occupiedBeds: number;
    totalBeds: number;
    activeAdmissions: number;
    waitingEncounters: number;
    openEncountersToday: number;
  };
  appointments: Array<{
    id: string;
    scheduledAt: string;
    durationMinutes: number;
    status: AppointmentStatus;
    Patient: Pick<PatientOption, "id" | "mrn" | "firstName" | "lastName">;
    Department: { id: string; name: string };
    DoctorProfile: { id: string; User: { name: string } };
  }>;
}