import { redis } from "../config/redis.ts";
import prisma from "../DB/primsa.ts";
import logger from "../utils/logger.ts";
import type { Request, Response } from "express";



const  getDoctor = async(req:Request, res:Response)=> {

    try {
        const getDoctor = await prisma.doctor.findMany({
            select:{
                id:true,
                name:true,
                specialization:true
            }
        })
        res.json(getDoctor)
        
    } catch (error) {
        logger.error(`Auth error: ${error}`);
        console.log(error)
    }
}

const getAvailableSlots = async(req:Request,res:Response)=>{

    const doctorId = req.params.id;
    const date = req.query.date;

    if (!doctorId) {
      return res.status(400).json({ error: "Doctor id required" });
    }

    if (typeof doctorId !== "string") {
      return res.status(400).json({ error: "Invalid doctor id" });
    }

    if (!date) {
      return res.status(400).json({ error: "Date required" });
    }

    if (typeof date !== "string") {
      return res.status(400).json({ error: "Invalid date" });
    }

    const requestedDate = new Date(date);
    if (Number.isNaN(requestedDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
    }

    try {
      const cacheKey = `slots:${doctorId}:${date}`;
      const cached = await redis.get<string>(cacheKey);

      if (cached) {
        return res.json({
          doctorId,
          date,
          availableSlots: JSON.parse(cached) as { startTime: string; endTime: string }[],
          source: "cache",
        });
      }

      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
        select: { id: true },
      });

      if (!doctor) {
        return res.status(404).json({ error: "Doctor not found" });
      }

      const dayOfWeek = requestedDate.getDay();

      const availability = await prisma.doctorAvailability.findMany({
        where: {
          doctorId,
          dayOfWeek,
        },
        orderBy: { startTime: "asc" },
      });

      if (availability.length === 0) {
        await redis.set(cacheKey, JSON.stringify([]), { ex: 300 });
        return res.json({ doctorId, date, availableSlots: [] });
      }

      const appointments = await prisma.appointment.findMany({
        where: {
          doctorId,
          appointmentDate: {
            gte: new Date(`${date}T00:00:00.000Z`),
            lt: new Date(`${date}T23:59:59.999Z`),
          },
          status: {
            not: "cancelled",
          },
        },
        select: {
          startTime: true,
          endTime: true,
        },
      });

      const bookedSlots = new Set(appointments.map((a) => `${a.startTime}-${a.endTime}`));

      const toMinutes = (time: string): number => {
        const parts = time.split(":");
        if (parts.length !== 2) return Number.NaN;
        const hours = Number(parts[0]);
        const minutes = Number(parts[1]);
        if (Number.isNaN(hours) || Number.isNaN(minutes)) return Number.NaN;
        return hours * 60 + minutes;
      };

      const toTimeString = (minutes: number): string => {
        const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
        const mins = String(minutes % 60).padStart(2, "0");
        return `${hours}:${mins}`;
      };

      const availableSlots: { startTime: string; endTime: string }[] = [];

      for (const block of availability) {
        const blockStart = toMinutes(block.startTime);
        const blockEnd = toMinutes(block.endTime);
        if (Number.isNaN(blockStart) || Number.isNaN(blockEnd)) continue;

        for (
          let start = blockStart;
          start + block.slotDuration <= blockEnd;
          start += block.slotDuration
        ) {
          const end = start + block.slotDuration;
          const slot = {
            startTime: toTimeString(start),
            endTime: toTimeString(end),
          };
          const slotKey = `${slot.startTime}-${slot.endTime}`;

          if (!bookedSlots.has(slotKey)) {
            availableSlots.push(slot);
          }
        }
      }

      await redis.set(cacheKey, JSON.stringify(availableSlots), { ex: 300 });

      return res.json({
        doctorId,
        date,
        availableSlots,
        source: "db",
      });
    } catch (error) {
      logger.error(`Get slots error: ${error}`);
      return res.status(500).json({ error: "Server error" });
    }
}  

export {
    getDoctor,
    getAvailableSlots
}
