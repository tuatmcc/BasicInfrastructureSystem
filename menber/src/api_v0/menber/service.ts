import type { Context } from "hono"
import { AppContext } from "../../core/types"
import { HTTPException } from "hono/http-exception"

const mockMember = {
    member_id: "member-123",
    name: "John Doe",
    emergency_contact: "Jane Doe - 555-1234",
    grade: 1,
    insurance: true,
    some_allergy: false,
    student_email: "john.doe@student.example.com",
    student_id: "S12345678",
    created_at: "2024-01-01T12:00:00Z",
    updated_at: "2024-01-02T12:00:00Z",
};

export const createMenberService = async (c: Context<AppContext>) => {
    const body = await c.req.json();
    return c.json({ ...mockMember, ...body }, 201);
};

export const getMenberService = async (c: Context<AppContext>) => {
    const user = c.get("appUser");
    return c.json(mockMember, 200);
};

export const getMenbersByIdService = async (c: Context<AppContext>) => {
    const user = c.get("appUser");
    if (user.role !== "admin") {
        throw new HTTPException(403, { message: "Forbidden" });
    }
    const id = c.req.param("id");
    return c.json([mockMember], 200);
}

export const getMenbersByConditionService = async (c: Context<AppContext>) => {
    const user = c.get("appUser");
    if (user.role !== "admin") {
        throw new HTTPException(403, { message: "Forbidden" });
    }
    return c.json([mockMember], 200);
}

export const updateMenberService = async (c: Context<AppContext>) => {
    const body = await c.req.json();
    return c.json({ ...mockMember, ...body }, 200);
};

export const updateMenberByIdService = async (c: Context<AppContext>) => {
    const user = c.get("appUser");
    if (user.role !== "admin") {
        throw new HTTPException(403, { message: "Forbidden" });
    }
    const id = c.req.param("id");
    const body = await c.req.json();
    return c.json({ ...mockMember, member_id: id, ...body }, 200);
}

export const deleteUserService = async (c: Context<AppContext>) => {
    const user = c.get("appUser");
    if (user.role !== "admin") {
        throw new HTTPException(403, { message: "Forbidden" });
    }
    return c.body(null, 204);
};