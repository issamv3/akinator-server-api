import { Request, Response } from 'express';

import { region } from '../constants';
import {
  answerAkinator,
  cancelAnswerAkinator,
  startSessionAkinator,
} from '../libs/akinator';
import { ApiResponse } from '../types/express';

export class AkinatorController {
  async start(req: Request, res: Response) {
    try {
      const region = req.query.region as region;
      const childMode = req.query.child_mode == 'true';

      const akinator = await startSessionAkinator(region, childMode);
      const response: ApiResponse = {
        success: true,
        data: akinator,
      };
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: 'Failed to start akinator',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(500).json(response);
    }
  }

  async answer(req: Request, res: Response) {
    try {
      const id = req.query.id as string;
      const answer = Number(req.query.answer);

      const akinator = await answerAkinator(id, answer);
      const response: ApiResponse = {
        success: true,
        data: akinator,
      };
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: 'Failed to answer akinator',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(500).json(response);
    }
  }

  async cancelAnswer(req: Request, res: Response) {
    try {
      const id = req.query.id as string;

      const akinator = await cancelAnswerAkinator(id);
      const response: ApiResponse = {
        success: true,
        data: akinator,
      };
      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: 'Failed to cancel answer akinator',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(500).json(response);
    }
  }
}

export default new AkinatorController();
