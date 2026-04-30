import type { Request, Response } from "express";
import prisma from "../DB/primsa.ts";
import logger from "../utils/logger.ts";

export const bookAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const {
      doctorId,
      appointmentDate,
      startTime,
      endTime,
      patientName,
      patientAge,
      patientPhone,
      isForSelf = true,
    } = req.body;

   
    if (!doctorId || !appointmentDate || !startTime || !endTime || !patientName || patientAge === undefined) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      res.status(404).json({ error: "Doctor not found" });
      return;
    }

    const requestedDate = new Date(appointmentDate);
    if (Number.isNaN(requestedDate.getTime())) {
      res.status(400).json({ error: "Invalid date format" });
      return;
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId: user.id,
        doctorId,
        appointmentDate: requestedDate,
        startTime,
        endTime,
        patientName,
        patientAge: Number(patientAge),
        patientPhone,
        isForSelf,
        status: "booked",
      },
    });

    res.status(201).json({
      message: "Appointment booked successfully",
      appointment,
    });
  } catch (error) {
    logger.error(`Error booking appointment: ${error}`);
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const appointments = await prisma.appointment.findMany({
      where: { patientId: user.id },
      include: {
        doctor: {
          select: { name: true, specialization: true },
        },
      },
      orderBy: { appointmentDate: "desc" },
    });

    res.json(appointments);
  } catch (error) {
    logger.error(`Error fetching appointments: ${error}`);
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

export const cancelAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: rawId } = req.params;
    
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!id || typeof id !== "string") {
      res.status(400).json({ error: "Invalid appointment ID" });
      return;
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }

    if (appointment.patientId !== user.id) {
      res.status(403).json({ error: "Forbidden: You can only cancel your own appointments" });
      return;
    }

    if (appointment.status === "cancelled") {
      res.status(400).json({ error: "Appointment is already cancelled" });
      return;
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: { status: "cancelled" },
    });

    res.json({
      message: "Appointment cancelled successfully",
      appointment: updatedAppointment,
    });
  } catch (error) {
    logger.error(`Error cancelling appointment: ${error}`);
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

