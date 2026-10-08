import { Router } from "express";

import {
  createWard,
  deleteWard,
  getWard,
  listWards,
  updateWard,
} from "../controllers/ward.controller";
import {
  createRoom,
  deleteRoom,
  getRoom,
  listRooms,
  updateRoom,
} from "../controllers/room.controller";
import {
  createBed,
  deleteBed,
  getBed,
  listBeds,
  updateBed,
} from "../controllers/bed.controller";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  checkAuthorizationForSuperRoles,
  checkEligibilty,
} from "../middlewares/RBAC.middleware.js";

const router = Router();

router.use(requireAuth, checkEligibilty, checkAuthorizationForSuperRoles);

router.route("/wards").get(listWards).post(createWard);
router
  .route("/wards/:id")
  .get(getWard)
  .patch(updateWard)
  .delete(deleteWard);

router.route("/rooms").get(listRooms).post(createRoom);
router
  .route("/rooms/:id")
  .get(getRoom)
  .patch(updateRoom)
  .delete(deleteRoom);

router.route("/beds").get(listBeds).post(createBed);
router.route("/beds/:id").get(getBed).patch(updateBed).delete(deleteBed);

export default router;