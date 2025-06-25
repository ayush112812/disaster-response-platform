import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { AppError } from './error';

export const validate = (validations?: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // If validations are provided, run them first
    if (validations) {
      await Promise.all(validations.map(validation => validation.run(req)));
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extractedErrors: { [key: string]: string }[] = [];
    errors.array().map(err => {
      // @ts-ignore - The type definition seems to be missing the 'path' property
      const { path, msg } = err;
      extractedErrors.push({ [path]: msg });
    });

    res.status(400).json({
      error: 'Validation failed',
      details: extractedErrors
    });
    return;
  };
};

export const validateCoordinates = (lat: number, lng: number): boolean => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

export const validateUuid = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};
