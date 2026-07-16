import { z } from 'zod';

export const CreateRazorpayOrderSchema = z.object({
  amountCents: z.number().int().positive('Amount must be positive'),
});

export const RazorpayWebhookSchema = z.object({
  event: z.string(),
  payload: z.object({
    payment: z.object({
      entity: z.object({
        id: z.string(),
        order_id: z.string(),
        amount: z.number(),
        status: z.string(),
      })
    })
  })
});
