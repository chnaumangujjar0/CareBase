import { defineContract } from '@prisma/orm-postgres/contract-builder';

export const contract = defineContract({}, ({ field, model, rel }) => {
  // --------------------------------------------------------
  // 1. Tenant (Hospital)
  // --------------------------------------------------------
  const Tenant = model('Tenant', {
    fields: {
      id: field.id.uuidv4String(),
      name: field.text(),
      slug: field.text().unique(),
      isActive: field.boolean().default(true),
      createdAt: field.temporal.createdAtString(),
      updatedAt: field.temporal.updatedAtString(),
    },
  });

  // --------------------------------------------------------
  // 2. Roles
  // --------------------------------------------------------
  const Role = model('Role', {
    fields: {
      id: field.id.uuidv4String().unique(),
      tenantId: field.uuidString(),
      name: field.text().unique(),
      permissions: field.json(),
      createdAt: field.temporal.createdAtString(),
      updatedAt: field.temporal.updatedAtString(),
    },
  })

  // --------------------------------------------------------
  // 3. User
  // --------------------------------------------------------
  const User = model('User', {
    fields: {
      id: field.id.uuidv4String(),
      tenantId: field.uuidString().optional(),
      roleId: field.uuidString().optional(),
      isSuperAdmin: field.boolean().default(false),
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
  // Register Models and Define Relations
  // --------------------------------------------------------
  return {
    models: {
      Tenant: Tenant.relations({
        users: rel.hasMany(User, { by: 'tenantId' }),
        roles: rel.hasMany(Role, { by: 'tenantId' }),
      }),
      
      Role: Role.relations({
        tenant: rel.belongsTo(Tenant, { from: 'tenantId', to: 'id' }),
        users: rel.hasMany(User, { by: 'roleId' }),
      }),
      
      User: User.relations({
        tenant: rel.belongsTo(Tenant, { from: 'tenantId', to: 'id'}),
        role: rel.belongsTo(Role, { from: 'roleId', to: 'id'}),
        sessions: rel.hasMany(Session, { by: 'userId' }),
      }),
      
      Session: Session.relations({
        user: rel.belongsTo(User, { from: 'userId', to: 'id'}),
      }),
    },
  };
});