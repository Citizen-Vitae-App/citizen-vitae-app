import { z } from 'zod';

/**
 * Schémas de validation centralisés pour les événements
 * Utilisés dans CreateEvent et EditEvent pour éviter la duplication
 */

export const eventNameSchema = z.string()
  .min(3, 'Le nom doit contenir au moins 3 caractères')
  .max(200, 'Le nom ne peut pas dépasser 200 caractères')
  .regex(/^[\w\s\-àéèêëïîôùûüÿçÀÉÈÊËÏÎÔÙÛÜŸÇ',.!?&()]+$/i, 'Le nom contient des caractères non autorisés');

export const eventLocationSchema = z.string()
  .min(3, 'Lieu requis')
  .max(500, 'L\'adresse ne peut pas dépasser 500 caractères');

export const eventCapacitySchema = z.string()
  .optional()
  .refine(val => !val || /^\d+$/.test(val), 'La capacité doit être un nombre')
  .refine(val => !val || parseInt(val) > 0, 'La capacité doit être supérieure à 0')
  .refine(val => !val || parseInt(val) <= 100000, 'La capacité ne peut pas dépasser 100 000');

export const eventDescriptionSchema = z.string()
  .max(10000, 'La description est trop longue')
  .optional();

export const eventSchema = z.object({
  name: eventNameSchema,
  startDate: z.date({ required_error: 'Date de début requise' }),
  startTime: z.string().min(1, 'Heure de début requise'),
  endDate: z.date({ required_error: 'Date de fin requise' }),
  endTime: z.string().min(1, 'Heure de fin requise'),
  location: eventLocationSchema,
  description: eventDescriptionSchema,
  capacity: eventCapacitySchema,
  requireApproval: z.boolean().default(false),
  allowSelfCertification: z.boolean().default(false),
});

export type EventFormData = z.infer<typeof eventSchema>;
