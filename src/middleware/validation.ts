import { NextFunction, Request, Response } from 'express';
import { ApiResponse } from '../types/express';

export const validateStartAkinator = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { region } = req.query;

  if (!region || typeof region !== 'string' || region.trim().length === 0) {
    const response: ApiResponse = {
      success: false,
      message: 'region is required and must be a non-empty string',
    };
    res.status(400).json(response);
    return;
  }
  next();
};

export const validateAnswerAkinator = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { id, answer } = req.query;

  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    const response: ApiResponse = {
      success: false,
      message: 'id is required and must be a non-empty string',
    };
    res.status(400).json(response);
    return;
  }

  if (!answer || typeof answer !== 'string' || answer.trim().length === 0) {
    const response: ApiResponse = {
      success: false,
      message: 'answer is required and must be a non-empty string',
    };
    res.status(400).json(response);
    return;
  }

  const parsedAnswer = Number(answer);

  if (isNaN(parsedAnswer) || parsedAnswer < 0 || parsedAnswer > 4) {
    const response: ApiResponse = {
      success: false,
      message: 'answer must be a number between 0 and 4',
    };
    res.status(400).json(response);
    return;
  }

  next();
};

export const validateCancelAnswerAkinator = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { id } = req.query;

  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    const response: ApiResponse = {
      success: false,
      message: 'id is required and must be a non-empty string',
    };
    res.status(400).json(response);
    return;
  }

  next();
};
