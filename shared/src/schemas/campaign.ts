import { z } from 'zod';

export const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  mode: z.enum(['SINGLE', 'CHOICE']),
  budgetCentsPerRecipient: z.number().nullable().optional(),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = z.object({
  name: z.string().optional(),
  mode: z.enum(['SINGLE', 'CHOICE']).optional(),
  budgetCentsPerRecipient: z.number().nullable().optional(),
  messageTemplate: z.string().optional(),
  branding: z.any().optional(), // { logoUrl, accentColor }
  expiresAt: z.string().optional(), // ISO date string
});
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

export const addCampaignProductSchema = z.object({
  productId: z.string(),
});
export type AddCampaignProductInput = z.infer<typeof addCampaignProductSchema>;

export const recipientRowSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
});
export type RecipientRow = z.infer<typeof recipientRowSchema>;

export const addSingleRecipientSchema = recipientRowSchema;
export type AddSingleRecipientInput = z.infer<typeof addSingleRecipientSchema>;
