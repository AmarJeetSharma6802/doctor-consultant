import type { Request, Response } from "express";
import prisma from "../DB/primsa.ts";
import logger from "../utils/logger.ts";

const allowedRoles = ["USER", "ADMIN", "SUB_ADMIN"] as const;

export const postCreate = async (req: Request, res: Response) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: "fields required" });
    }

    const createPost = await prisma.post.create({
      data: {
        title,
        description,
        userId: (req as any).user.id,
      },
    });

    return res.status(201).json({
      message: "Post created",
      data: createPost,
    });
  } catch (error) {
    logger.error(`post error: ${error}`);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const updatePost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, role } = req.body;

    if (!id) {
      return res.status(400).json({ message: "post id required" });
    }

    if (!title && !description && !role) {
      return res
        .status(400)
        .json({ message: "title, description or role required" });
    }

    const post = await prisma.post.findUnique({
      where: { id:id as string },
    });

    if (!post) {
      return res.status(404).json({ message: "post not found" });
    }

    if (post.userId !== (req as any).user.id) {
      return res
        .status(403)
        .json({ message: "you can update only your own post" });
    }

    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ message: "invalid role value" });
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        title,
        description,
        role,
      },
    });

    return res.status(200).json({
      message: "Post updated",
      data: updatedPost,
    });
  } catch (error) {
    logger.error(`post update error: ${error}`);
    return res.status(500).json({
      message: "Server error",
    });
  }
};
