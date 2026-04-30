import type { NextFunction, Request, Response } from "express"; 
import { redis } from "../config/redis.ts";
import logger from "./logger.ts";

export const rateLimit = async (req:Request, res:Response, next:NextFunction) => {
try {
    //   const ip = req.ip;
      const ip =  req.ip || req.socket.remoteAddress || "unknown";;
    
      const count = await redis.incr(`ratelimit:${ip}`);
    
      if (count === 1) await redis.expire(`ratelimit:${ip}`, 60);
    
      if (count > 100)
        return res.status(429).json({ message: "Too many requests" });
    
      next();
} catch (error) {
    logger.error("RateLimit error", error);
    res.status(500).json({ message: "RateLimit Error" });
}
};


// import type { Request, Response, NextFunction } from "express";
// import Redis from "ioredis";
// import { RateLimiterRedis } from "rate-limiter-flexible";

// const redisClient = new Redis({
//   host: process.env.REDIS_HOST,
//   port: Number(process.env.REDIS_PORT),
//   password: process.env.REDIS_PASSWORD,
// });

// const rateLimiter = new RateLimiterRedis({
//   storeClient: redisClient,
//   keyPrefix: "ratelimit",
//   points: 100, 
//   duration: 60, 
// });

// // 🔹 Middleware
// export const rateLimitMiddleware = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const ip = req.ip || req.socket.remoteAddress || "unknown";

//     await rateLimiter.consume(ip);

//     next();
//   } catch (rejRes: any) {
//     console.warn("Rate limit exceeded", { ip });

//     return res.status(429).json({
//       success: false,
//       message: "Too many requests",
//       retryAfter: Math.round(rejRes?.msBeforeNext / 1000) || 60,
//     });
//   }
// };