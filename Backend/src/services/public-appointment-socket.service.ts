import type { Server, Socket } from "socket.io";
import { z } from "zod";
import { db } from "../db/index.js";

const subscriptionSchema = z.object({ doctorId: z.uuid() });
const roomForDoctor = (doctorId: string) => `public-appointment-slots:${doctorId}`;

export const registerPublicAppointmentSockets = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    socket.on("public:slots:subscribe", async (payload: unknown, acknowledge?: (result: { ok: boolean }) => void) => {
      const parsed = subscriptionSchema.safeParse(payload);
      if (!parsed.success) {
        acknowledge?.({ ok: false });
        return;
      }
      try {
        const doctor = await db.doctorProfile.findFirst({
          where: {
            id: parsed.data.doctorId,
            isActive: true,
            Department: { is: { isActive: true } },
            DoctorAvailability: { some: { isActive: true } },
            Tenant: { is: { isActive: true, approvalStatus: "approved" } },
          },
          select: { id: true },
        });
        if (!doctor) {
          acknowledge?.({ ok: false });
          return;
        }
        await socket.join(roomForDoctor(doctor.id));
        acknowledge?.({ ok: true });
      } catch {
        acknowledge?.({ ok: false });
      }
    });

    socket.on("public:slots:unsubscribe", (payload: unknown) => {
      const parsed = subscriptionSchema.safeParse(payload);
      if (parsed.success) void socket.leave(roomForDoctor(parsed.data.doctorId));
    });
  });
};
