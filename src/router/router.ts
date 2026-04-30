import express from "express";
import { authUser } from "../middleware/authUser.ts";
import { auth,fetchUser,getCurrentUser,updateAccount,changePassword,deleteAccount } from "../controllers/auth.controller.ts";
import { rateLimit } from "../utils/rateLimit.ts";
import { postCreate, updatePost } from "../controllers/post.controller.ts"
import { bookAppointment, getAppointments, cancelAppointment } from "../controllers/appointment.controller.ts";
import { getDoctor, getAvailableSlots } from "../controllers/doctor.controller.ts";
const router = express.Router()

router.route("/auth").post(auth)
router.route("/me").get(authUser, getCurrentUser)
router.route("/allUser").get(rateLimit, fetchUser)
router.route("/update-account").put(authUser, updateAccount)
router.route("/change-pass").post(authUser,changePassword)
router.route("/deleteAccount").delete(authUser,deleteAccount)

router.route("/post-create").post(authUser,postCreate)
router.route("/posts/:id").put(authUser, updatePost)

router.route("/book-appointment").post(authUser, bookAppointment)
router.route("/my-appointments").get(authUser, getAppointments)
router.route("/appointments/:id/cancel").patch(authUser, cancelAppointment)

router.route("/doctors").get(getDoctor)
router.route("/doctors/:id/slots").get(getAvailableSlots)


export default router
