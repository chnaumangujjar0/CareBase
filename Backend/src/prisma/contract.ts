import { defineContract, enumType, member } from '@prisma/orm-postgres/contract-builder';

const pgText = { codecId: 'pg/text@1', nativeType: 'text' } as const;

const Gender = enumType(
  'Gender',
  pgText,
  member('Male', 'male'),
  member('Female', 'female'),
  member('Other', 'other'),
);

const AppointmentStatus = enumType(
  'AppointmentStatus',
  pgText,
  member('Booked', 'booked'),
  member('Completed', 'completed'),
  member('Cancelled', 'cancelled'),
  member('NoShow', 'no_show'),
);

const BedStatus = enumType(
  'BedStatus',
  pgText,
  member('Available', 'available'),
  member('Occupied', 'occupied'),
  member('Maintenance', 'maintenance'),
  member('Cleaning', 'cleaning'),
);

const ShiftType = enumType(
  'ShiftType',
  pgText,
  member('Morning', 'morning'),
  member('Evening', 'evening'),
  member('Night', 'night'),
  member('Flexible', 'flexible'),
);

export const contract = defineContract({}, ({ field, model, rel }) => {
  // --------------------------------------------------------
  // 1. Tenant (Hospital) — the root. Nothing points up from here.
  // --------------------------------------------------------
  const Tenant = model('Tenant', {
    fields: {
      id: field.id.uuidv4String(),
      name: field.text(),
      slug: field.text().unique(),
      isActive: field.boolean().default(true),
      logo: field.text(),
      favicon: field.text(),
      address: field.text().optional(),
      city: field.text().optional(),
      state: field.text().optional(),
      country: field.text().default('PK'),
      postalCode: field.text().optional(),
      createdAt: field.temporal.createdAtString(),
      updatedAt: field.temporal.updatedAtString(),
    },
  });

  // --------------------------------------------------------
  // 2. Role
  // --------------------------------------------------------
  const Role = model('Role', {
    fields: {
      id: field.id.uuidv4String(),
      tenantId: field.uuidString(),
      name: field.text(),
      permissions: field.json(),
      createdAt: field.temporal.createdAtString(),
      updatedAt: field.temporal.updatedAtString(),
    },
  });

  // --------------------------------------------------------
  // 3. User
  // --------------------------------------------------------
  const User = model('User', {
    fields: {
      id: field.id.uuidv4String(),
      tenantId: field.uuidString().optional(),
      roleId: field.uuidString().optional(),
      isSuperAdmin: field.boolean().default(false),
      authProvider: field.text().optional().default('local'),
      name: field.text(),
      email: field.text().unique(),
      passwordHash: field.text(),
      isActive: field.boolean().default(true),
      createdAt: field.temporal.createdAtString(),
      updatedAt: field.temporal.updatedAtString(),
    },
  });

  // --------------------------------------------------------
  // 4. Session
  // --------------------------------------------------------
  const Session = model('Session', {
    fields: {
      id: field.id.uuidv4String(),
      userId: field.uuidString(),
      tokenHash: field.text().unique(),
      ipAddress: field.text().optional(),
      userAgent: field.text().optional(),
      expiresAt: field.dateTime(),
      revokedAt: field.dateTime().optional(),
      createdAt: field.temporal.createdAtString(),
    },
  });

  // --------------------------------------------------------
  // 5. Department
  // --------------------------------------------------------
  const Department = model('Department', {
    fields: {
      id: field.id.uuidv4String(),
      tenantId: field.uuidString(),
      name: field.text(),
      isActive: field.boolean().default(true),
      createdAt: field.temporal.createdAtString(),
      updatedAt: field.temporal.updatedAtString(),
    },
  });

  // --------------------------------------------------------
  // 6. DoctorProfile 
  // --------------------------------------------------------
  const DoctorProfile = model('DoctorProfile', {
    fields: {
      id: field.id.uuidv4String(),
      tenantId: field.uuidString(),
      userId: field.uuidString().unique(),
      departmentId: field.uuidString(),
      employeeId: field.text(),
      specialization: field.text(),
      qualifications: field.text().optional(),
      licenseNumber: field.text().optional(),
      description: field.text().optional(),
      designation: field.text().optional(),
      phone: field.text().unique(),
      isActive: field.boolean().default(true),
      createdAt: field.temporal.createdAtString(),
      updatedAt: field.temporal.updatedAtString(),
    },
  });

  // --------------------------------------------------------
  // 7. Patient 
  // --------------------------------------------------------
  const Patient = model('Patient', {
    fields: {
      id: field.id.uuidv4String(),
      tenantId: field.uuidString(),
      mrn: field.text(),
      firstName: field.text(),
      lastName: field.text(),
      dob: field.dateTime(),
      gender: field.namedType(Gender).optional(),
      contactPhone: field.text().optional(),
      contactEmail: field.text().optional(),
      address: field.text().optional(),
      emergencyContactName: field.text().optional(),
      emergencyContactPhone: field.text().optional(),
      isActive: field.boolean().default(true),
      createdAt: field.temporal.createdAtString(),
      updatedAt: field.temporal.updatedAtString(),
      deletedAt: field.dateTime().optional(),
    },
  });

  // --------------------------------------------------------
  // 8. Appointment
  // --------------------------------------------------------
  const Appointment = model('Appointment', {
    fields: {
      id: field.id.uuidv4String(),
      tenantId: field.uuidString(),
      patientId: field.uuidString(),
      doctorId: field.uuidString(),
      departmentId: field.uuidString(),
      scheduledAt: field.dateTime(),
      durationMinutes: field.int().default(30),
      status: field.namedType(AppointmentStatus).default(AppointmentStatus.members.Booked),
      notes: field.text().optional(),
      createdBy: field.uuidString().optional(),
      updatedBy: field.uuidString().optional(),
      version: field.int().default(1),
      createdAt: field.temporal.createdAtString(),
      updatedAt: field.temporal.updatedAtString(),
    },
  });

  // --------------------------------------------------------
  // 9. Ward → Room → Bed
  // --------------------------------------------------------
  const Ward = model('Ward', {
    fields: {
      id: field.id.uuidv4String(),
      tenantId: field.uuidString(),
      departmentId: field.uuidString().optional(),
      name: field.text(),
      createdAt: field.temporal.createdAtString(),
      updatedAt: field.temporal.updatedAtString(),
    },
  });

  const Room = model('Room', {
    fields: {
      id: field.id.uuidv4String(),
      tenantId: field.uuidString(),
      wardId: field.uuidString(),
      name: field.text(),
      createdAt: field.temporal.createdAtString(),
      updatedAt: field.temporal.updatedAtString(),
    },
  });

  const Bed = model('Bed', {
    fields: {
      id: field.id.uuidv4String(),
      tenantId: field.uuidString(),
      roomId: field.uuidString(),
      code: field.text(),
      status: field.namedType(BedStatus).default(BedStatus.members.Available),
      currentPatientId: field.uuidString().optional(),
      version: field.int().default(1),
      createdAt: field.temporal.createdAtString(),
      updatedAt: field.temporal.updatedAtString(),
    },
  });
  //  Staff model

  const StaffProfile = model('StaffProfile', {
    fields: {
      id: field.id.uuidv4String(),
      tenantId: field.uuidString(),
      userId: field.uuidString().unique(), // one profile per user, same pattern as DoctorProfile
      employeeId: field.text(), // human-readable staff ID, unique per tenant — see composite unique below
      departmentId: field.uuidString().optional(), // e.g. Receptionist at "Front Desk", optional for HR/Accounts
      wardId: field.uuidString().optional(), // e.g. Nurse assigned to a specific ward
      shift: field.namedType(ShiftType).optional(),
      joiningDate: field.dateTime().optional(),
      phone: field.text().optional(),
      isActive: field.boolean().default(true),
      createdAt: field.temporal.createdAtString(),
      updatedAt: field.temporal.updatedAtString(),
    },
  });

  const AuditLog = model('AuditLog', {
    fields: {
      id: field.id.uuidv4String(),
      tenantId: field.uuidString().optional(),
      userId: field.uuidString().optional(),
      action: field.text(),
      entityType: field.text(),
      entityId: field.uuidString().optional(),
      oldValue: field.json().optional(),
      newValue: field.json().optional(),
      ipAddress: field.text().optional(),
      userAgent: field.text().optional(),
      createdAt: field.temporal.createdAtString(),
    },
  });

  // --------------------------------------------------------
  // Register Models, Relations, Cascade Rules, and Indexes
  // --------------------------------------------------------
  return {
    enums: { Gender, AppointmentStatus, BedStatus },
    models: {
      Tenant: Tenant.relations({
        users: rel.hasMany(User, { by: 'tenantId' }),
        roles: rel.hasMany(Role, { by: 'tenantId' }),
        departments: rel.hasMany(Department, { by: 'tenantId' }),
        patients: rel.hasMany(Patient, { by: 'tenantId' }),
        appointments: rel.hasMany(Appointment, { by: 'tenantId' }),
        doctorProfiles: rel.hasMany(DoctorProfile, { by: 'tenantId' }),
        wards: rel.hasMany(Ward, { by: 'tenantId' }),
        rooms: rel.hasMany(Room, { by: 'tenantId' }),
        beds: rel.hasMany(Bed, { by: 'tenantId' }),
      }),

      Role: Role.relations({
        tenant: rel
          .belongsTo(Tenant, { from: 'tenantId', to: 'id' })
          .sql({ fk: { name: 'role_tenantId_fkey', onDelete: 'cascade' } }),
        users: rel.hasMany(User, { by: 'roleId' }),
      }).sql(({ cols, constraints }) => ({
        table: 'Role',
        indexes: [
          constraints.index([cols.tenantId]),
          constraints.index([cols.tenantId, cols.name], { unique: true, name: 'role_tenant_name_key' }),
        ],
      })),

      User: User.relations({
        tenant: rel
          .belongsTo(Tenant, { from: 'tenantId', to: 'id' })
          .sql({ fk: { name: 'user_tenantId_fkey', onDelete: 'cascade' } }),
        role: rel
          .belongsTo(Role, { from: 'roleId', to: 'id' })
          .sql({ fk: { name: 'user_roleId_fkey', onDelete: 'setNull' } }),
        sessions: rel.hasMany(Session, { by: 'userId' }),
        doctorProfile: rel.hasOne(DoctorProfile, { by: 'userId' }),
        createdAppointments: rel.hasMany(Appointment, { by: 'createdBy' }),
        updatedAppointments: rel.hasMany(Appointment, { by: 'updatedBy' }),
      }).sql(({ cols, constraints }) => ({
        table: 'User',
        indexes: [constraints.index([cols.tenantId]), constraints.index([cols.roleId])],
      })),

      Session: Session.relations({
        user: rel
          .belongsTo(User, { from: 'userId', to: 'id' })
          .sql({ fk: { name: 'session_userId_fkey', onDelete: 'cascade' } }),
      }).sql(({ cols, constraints }) => ({
        table: 'Session',
        indexes: [
          constraints.index([cols.userId]),
          constraints.index([cols.expiresAt]),
          constraints.index([cols.revokedAt])
        ],
      })),

       StaffProfile: StaffProfile.relations({
        tenant: rel
          .belongsTo(Tenant, { from: 'tenantId', to: 'id' })
          .sql({ fk: { name: 'staffProfile_tenantId_fkey', onDelete: 'cascade' } }),
        user: rel
          .belongsTo(User, { from: 'userId', to: 'id' })
          .sql({ fk: { name: 'staffProfile_userId_fkey', onDelete: 'cascade' } }),
        department: rel
          .belongsTo(Department, { from: 'departmentId', to: 'id' })
          .sql({ fk: { name: 'staffProfile_departmentId_fkey', onDelete: 'setNull' } }),
        ward: rel
          .belongsTo(Ward, { from: 'wardId', to: 'id' })
          .sql({ fk: { name: 'staffProfile_wardId_fkey', onDelete: 'setNull' } }),
      }).sql(({ cols, constraints }) => ({
        table: 'StaffProfile',
        indexes: [
          constraints.index([cols.tenantId]),
          constraints.index([cols.tenantId, cols.employeeId], { unique: true, name: 'staffProfile_tenant_employeeId_key' }),
          constraints.index([cols.departmentId]),
          constraints.index([cols.wardId]),
        ],
      })),

      Department: Department.relations({
        tenant: rel
          .belongsTo(Tenant, { from: 'tenantId', to: 'id' })
          .sql({ fk: { name: 'department_tenantId_fkey', onDelete: 'cascade' } }),
        doctors: rel.hasMany(DoctorProfile, { by: 'departmentId' }),
        appointments: rel.hasMany(Appointment, { by: 'departmentId' }),
        wards: rel.hasMany(Ward, { by: 'departmentId' }),
      }).sql(({ cols, constraints }) => ({
        table: 'Department',
        indexes: [
          constraints.index([cols.tenantId]),
          constraints.index([cols.tenantId, cols.name], { unique: true, name: 'department_tenant_name_key' }),
        ],
      })),

      DoctorProfile: DoctorProfile.relations({
        tenant: rel
          .belongsTo(Tenant, { from: 'tenantId', to: 'id' })
          .sql({ fk: { name: 'doctorProfile_tenantId_fkey', onDelete: 'cascade' } }),
        user: rel
          .belongsTo(User, { from: 'userId', to: 'id' })
          .sql({ fk: { name: 'doctorProfile_userId_fkey', onDelete: 'cascade' } }),
        department: rel
          .belongsTo(Department, { from: 'departmentId', to: 'id' })
          .sql({ fk: { name: 'doctorProfile_departmentId_fkey', onDelete: 'restrict' } }),
        appointments: rel.hasMany(Appointment, { by: 'doctorId' }),
      }).sql(({ cols, constraints }) => ({
        table: 'DoctorProfile',
        indexes: [constraints.index([cols.tenantId]), constraints.index([cols.departmentId])],
      })),

      Patient: Patient.relations({
        tenant: rel
          .belongsTo(Tenant, { from: 'tenantId', to: 'id' })
          .sql({ fk: { name: 'patient_tenantId_fkey', onDelete: 'restrict' } }),
        appointments: rel.hasMany(Appointment, { by: 'patientId' }),
        beds: rel.hasMany(Bed, { by: 'currentPatientId' }),
      }).sql(({ cols, constraints }) => ({
        table: 'Patient',
        indexes: [
          constraints.index([cols.tenantId, cols.mrn], { unique: true, name: 'patient_tenant_mrn_key' }),
          constraints.index([cols.tenantId, cols.lastName]),
        ],
      })),

      Appointment: Appointment.relations({
        tenant: rel
          .belongsTo(Tenant, { from: 'tenantId', to: 'id' })
          .sql({ fk: { name: 'appointment_tenantId_fkey', onDelete: 'cascade' } }),
        patient: rel
          .belongsTo(Patient, { from: 'patientId', to: 'id' })
          .sql({ fk: { name: 'appointment_patientId_fkey', onDelete: 'restrict' } }),
        doctor: rel
          .belongsTo(DoctorProfile, { from: 'doctorId', to: 'id' })
          .sql({ fk: { name: 'appointment_doctorId_fkey', onDelete: 'restrict' } }),
        department: rel
          .belongsTo(Department, { from: 'departmentId', to: 'id' })
          .sql({ fk: { name: 'appointment_departmentId_fkey', onDelete: 'restrict' } }),
        createdByUser: rel
          .belongsTo(User, { from: 'createdBy', to: 'id' })
          .sql({ fk: { name: 'appointment_createdBy_fkey', onDelete: 'setNull' } }),
        updatedByUser: rel
          .belongsTo(User, { from: 'updatedBy', to: 'id' })
          .sql({ fk: { name: 'appointment_updatedBy_fkey', onDelete: 'setNull' } }),
      }).sql(({ cols, constraints }) => ({
        table: 'Appointment',
        indexes: [
          constraints.index([cols.tenantId, cols.scheduledAt]),
          constraints.index([cols.doctorId, cols.scheduledAt], { name: 'appointment_doctor_schedule_idx' }),
          constraints.index([cols.patientId]),
          constraints.index([cols.createdBy]),
          constraints.index([cols.updatedBy]),
        ],
      })),

      Ward: Ward.relations({
        tenant: rel
          .belongsTo(Tenant, { from: 'tenantId', to: 'id' })
          .sql({ fk: { name: 'ward_tenantId_fkey', onDelete: 'cascade' } }),
        department: rel
          .belongsTo(Department, { from: 'departmentId', to: 'id' })
          .sql({ fk: { name: 'ward_departmentId_fkey', onDelete: 'setNull' } }),
        rooms: rel.hasMany(Room, { by: 'wardId' }),
      }).sql(({ cols, constraints }) => ({
        table: 'Ward',
        indexes: [constraints.index([cols.tenantId]), constraints.index([cols.departmentId])],
      })),

      Room: Room.relations({
        tenant: rel
          .belongsTo(Tenant, { from: 'tenantId', to: 'id' })
          .sql({ fk: { name: 'room_tenantId_fkey', onDelete: 'cascade' } }),
        ward: rel
          .belongsTo(Ward, { from: 'wardId', to: 'id' })
          .sql({ fk: { name: 'room_wardId_fkey', onDelete: 'cascade' } }),
        beds: rel.hasMany(Bed, { by: 'roomId' }),
      }).sql(({ cols, constraints }) => ({
        table: 'Room',
        indexes: [constraints.index([cols.tenantId]), constraints.index([cols.wardId])],
      })),

      Bed: Bed.relations({
        tenant: rel
          .belongsTo(Tenant, { from: 'tenantId', to: 'id' })
          .sql({ fk: { name: 'bed_tenantId_fkey', onDelete: 'cascade' } }),
        room: rel
          .belongsTo(Room, { from: 'roomId', to: 'id' })
          .sql({ fk: { name: 'bed_roomId_fkey', onDelete: 'cascade' } }),
        currentPatient: rel
          .belongsTo(Patient, { from: 'currentPatientId', to: 'id' })
          .sql({ fk: { name: 'bed_currentPatientId_fkey', onDelete: 'setNull' } }),
      }).sql(({ cols, constraints }) => ({
        table: 'Bed',
        indexes: [
          constraints.index([cols.tenantId]),
          constraints.index([cols.roomId, cols.code], { unique: true, name: 'bed_room_code_key' }),
          constraints.index([cols.currentPatientId]),
        ],
      })),

      AuditLog: AuditLog.relations({
        tenant: rel
          .belongsTo(Tenant, { from: 'tenantId', to: 'id' })
          .sql({ fk: { name: 'auditLog_tenantId_fkey', onDelete: 'setNull' } }),
        user: rel
          .belongsTo(User, { from: 'userId', to: 'id' })
          .sql({ fk: { name: 'auditLog_userId_fkey', onDelete: 'setNull' } }),
      }).sql(({ cols, constraints }) => ({
        table: 'AuditLog',
        indexes: [
          constraints.index([cols.tenantId, cols.createdAt]),
          constraints.index([cols.entityType, cols.entityId]),
          constraints.index([cols.userId]),
        ],
      })),

    },
  };
});