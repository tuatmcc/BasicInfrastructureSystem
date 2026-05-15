import { z } from 'zod';

// --- role schemas ---
export const RoleSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type Role = z.infer<typeof RoleSchema>;

export const GetUserRolesInputSchema = z.object({
  userId: z.string(),
});
export type GetUserRolesInput = z.infer<typeof GetUserRolesInputSchema>;