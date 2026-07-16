import { z } from "zod";

const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const createOrgSchema = z.object({
  name: z.string().min(2, { message: "Organization name is required" }),
  gstin: z.string().regex(gstinRegex, { message: "Invalid GSTIN format" }),
  stateCode: z.string().length(2, { message: "Invalid state code" }),
});

export type CreateOrgInput = z.infer<typeof createOrgSchema>;

export const inviteTeamMemberSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  role: z.enum(["ADMIN", "MEMBER", "FINANCE"], {
    required_error: "Role is required",
  }),
});

export type InviteTeamMemberInput = z.infer<typeof inviteTeamMemberSchema>;
