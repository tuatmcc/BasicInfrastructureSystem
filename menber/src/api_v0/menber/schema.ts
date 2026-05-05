import { z } from "@hono/zod-openapi"

export const MemberSchema = z.object({
    member_id: z.string().openapi({ example: "member-123" }),
    name: z.string().openapi({ example: "John Doe" }),
    emergency_contact: z.string().openapi({ example: "Jane Doe - 555-1234" }),
    grade: z.number().openapi({ example: 1 }),
    insurance: z.boolean().openapi({ example: true }),
    some_allergy: z.boolean().openapi({ example: false }),
    student_email: z.string().email().openapi({ example: "john.doe@student.example.com" }),
    student_id: z.string().openapi({ example: "S12345678" }),
    created_at: z.string().openapi({ example: "2024-01-01T12:00:00Z" }),
    updated_at: z.string().openapi({ example: "2024-01-02T12:00:00Z" }),
}).openapi("Member")

export const UpdateMemberSchema = z.object({
    name: z.string().optional().openapi({ example: "John Doe" }),
    emergency_contact: z.string().optional().openapi({ example: "Jane Doe - 555-1234" }),
    grade: z.number().optional().openapi({ example: 1 }),
    insurance: z.boolean().optional().openapi({ example: true }),
    some_allergy: z.boolean().optional().openapi({ example: false }),
    student_email: z.string().email().optional().openapi({ example: "john.doe@student.example.com" }),
    student_id: z.string().optional().openapi({ example: "S12345678" }),
}).openapi("UpdateMemberRequest")