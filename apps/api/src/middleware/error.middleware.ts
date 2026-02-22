import type { NextFunction, Request, Response } from "express";
import { fail } from "@typeracrer/shared";
import { HttpError } from "../utils/http-error.js";

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json(fail("NOT_FOUND", "Resource not found"));
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json(fail(error.code, error.message));
    return;
  }

  console.error(error);
  res.status(500).json(fail("INTERNAL_ERROR", "Unexpected server error"));
}

