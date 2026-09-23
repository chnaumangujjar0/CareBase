#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/4a19c1c4bef5466155c441d8dadbfed36932fe2d8f31b5832b860baa7533b3b1/contract';
import endContract from '../../snapshots/4a19c1c4bef5466155c441d8dadbfed36932fe2d8f31b5832b860baa7533b3b1/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/8584ae967928dd7aae3f5a0270919fb1322be296f24f0ac8a0464152fd12b84b/contract';
import startContract from '../../snapshots/8584ae967928dd7aae3f5a0270919fb1322be296f24f0ac8a0464152fd12b84b/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropConstraint({ schema: 'public', table: 'Role', constraint: 'Role_id_key' }),
      this.dropConstraint({ schema: 'public', table: 'Role', constraint: 'Role_name_key' }),
      this.createTable({
        schema: 'public',
        table: 'appointment',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('createdBy', 'character(36)', {
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
          col('departmentId', 'character(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
          col('doctorId', 'character(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
          col('durationMinutes', 'int4', {
            notNull: true,
            default: lit(30),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'character(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('patientId', 'character(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
          col('scheduledAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('booked'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'character(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('updatedBy', 'character(36)', {
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
          col('version', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'appointment_status_check_a8851325',
            "\"status\" IN ('booked', 'completed', 'cancelled', 'no_show')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'bed',
        columns: [
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('currentPatientId', 'character(36)', {
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
          col('id', 'character(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
          col('roomId', 'character(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('available'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('tenantId', 'character(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('version', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'bed_status_check_b354a3db',
            "\"status\" IN ('available', 'occupied', 'maintenance', 'cleaning')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'department',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'character(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'character(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'doctorProfile',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('departmentId', 'character(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
          col('id', 'character(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('licenseNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('qualifications', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('specialization', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'character(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'character(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'patient',
        columns: [
          col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('contactEmail', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('contactPhone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('deletedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('dob', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('emergencyContactName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('emergencyContactPhone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('firstName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('gender', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'character(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('lastName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('mrn', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'character(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'patient_gender_check_f90b1c49',
            "\"gender\" IN ('male', 'female', 'other')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'room',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'character(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'character(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('wardId', 'character(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ward',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('departmentId', 'character(36)', {
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
          col('id', 'character(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'character(36)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 36 } },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('authProvider', 'text', {
          default: lit('local'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'doctorProfile',
        constraint: 'doctorProfile_userId_key',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Role',
        index: 'Role_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Role',
        index: 'role_tenant_name_key_efdfefee',
        columns: ['tenantId', 'name'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Session',
        index: 'Session_expiresAt_idx_6b6b8c10',
        columns: ['expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Session',
        index: 'Session_revokedAt_idx_f1d8e6b3',
        columns: ['revokedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Session',
        index: 'Session_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_roleId_idx_ffccc9a4',
        columns: ['roleId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'appointment',
        index: 'appointment_createdBy_idx_ba0f792f',
        columns: ['createdBy'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'appointment',
        index: 'appointment_departmentId_idx_8e261ed8',
        columns: ['departmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'appointment',
        index: 'appointment_doctorId_idx_04369053',
        columns: ['doctorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'appointment',
        index: 'appointment_doctor_schedule_idx_23b246b0',
        columns: ['doctorId', 'scheduledAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'appointment',
        index: 'appointment_patientId_idx_e5f07e88',
        columns: ['patientId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'appointment',
        index: 'appointment_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'appointment',
        index: 'appointment_tenantId_scheduledAt_idx_31e2839e',
        columns: ['tenantId', 'scheduledAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'appointment',
        index: 'appointment_updatedBy_idx_0780dcde',
        columns: ['updatedBy'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'bed',
        index: 'bed_currentPatientId_idx_41689716',
        columns: ['currentPatientId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'bed',
        index: 'bed_roomId_idx_fe51d647',
        columns: ['roomId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'bed',
        index: 'bed_room_code_key_aff24a4e',
        columns: ['roomId', 'code'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'bed',
        index: 'bed_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'department',
        index: 'department_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'department',
        index: 'department_tenant_name_key_efdfefee',
        columns: ['tenantId', 'name'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'doctorProfile',
        index: 'doctorProfile_departmentId_idx_8e261ed8',
        columns: ['departmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'doctorProfile',
        index: 'doctorProfile_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'patient',
        index: 'patient_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'patient',
        index: 'patient_tenantId_lastName_idx_8d5f431c',
        columns: ['tenantId', 'lastName'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'patient',
        index: 'patient_tenant_mrn_key_0c21d836',
        columns: ['tenantId', 'mrn'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'room',
        index: 'room_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'room',
        index: 'room_wardId_idx_6180a90a',
        columns: ['wardId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ward',
        index: 'ward_departmentId_idx_8e261ed8',
        columns: ['departmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ward',
        index: 'ward_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Role',
        foreignKey: {
          name: 'role_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Session',
        foreignKey: {
          name: 'session_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'User',
        foreignKey: {
          name: 'user_roleId_fkey',
          columns: ['roleId'],
          references: { schema: 'public', table: 'Role', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'User',
        foreignKey: {
          name: 'user_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'appointment',
        foreignKey: {
          name: 'appointment_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'appointment',
        foreignKey: {
          name: 'appointment_patientId_fkey',
          columns: ['patientId'],
          references: { schema: 'public', table: 'patient', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'appointment',
        foreignKey: {
          name: 'appointment_doctorId_fkey',
          columns: ['doctorId'],
          references: { schema: 'public', table: 'doctorProfile', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'appointment',
        foreignKey: {
          name: 'appointment_departmentId_fkey',
          columns: ['departmentId'],
          references: { schema: 'public', table: 'department', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'appointment',
        foreignKey: {
          name: 'appointment_createdBy_fkey',
          columns: ['createdBy'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'appointment',
        foreignKey: {
          name: 'appointment_updatedBy_fkey',
          columns: ['updatedBy'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'bed',
        foreignKey: {
          name: 'bed_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'bed',
        foreignKey: {
          name: 'bed_roomId_fkey',
          columns: ['roomId'],
          references: { schema: 'public', table: 'room', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'bed',
        foreignKey: {
          name: 'bed_currentPatientId_fkey',
          columns: ['currentPatientId'],
          references: { schema: 'public', table: 'patient', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'department',
        foreignKey: {
          name: 'department_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'doctorProfile',
        foreignKey: {
          name: 'doctorProfile_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'doctorProfile',
        foreignKey: {
          name: 'doctorProfile_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'doctorProfile',
        foreignKey: {
          name: 'doctorProfile_departmentId_fkey',
          columns: ['departmentId'],
          references: { schema: 'public', table: 'department', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'patient',
        foreignKey: {
          name: 'patient_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'room',
        foreignKey: {
          name: 'room_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'room',
        foreignKey: {
          name: 'room_wardId_fkey',
          columns: ['wardId'],
          references: { schema: 'public', table: 'ward', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ward',
        foreignKey: {
          name: 'ward_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'Tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ward',
        foreignKey: {
          name: 'ward_departmentId_fkey',
          columns: ['departmentId'],
          references: { schema: 'public', table: 'department', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
