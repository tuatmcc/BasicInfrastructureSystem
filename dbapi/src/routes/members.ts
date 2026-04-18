import { jsonError, jsonOk, noContent } from "../lib/errors";
import {
  getMemberAsAdmin,
  getMyMemberById,
  insertMyMember,
  listMembersAsAdminWithQuery,
  parseRows,
  parseSingleRow,
  patchMemberAsAdmin,
  patchMyMemberById,
  setUserMemberIdInAppMetadata,
} from "../lib/supabase";
import { requireRole } from "../lib/auth";
import type { AuthContext, Env, MemberCreateRequest, MemberUpdateRequest } from "../types";

type MemberRow = {
  member_id: string;
  name: string;
  grade: number;
  emergency_contact: string;
  student_id: string;
  student_email: string;
  insurance: boolean;
  some_allergy: boolean;
  created_at: string;
  updated_at: string;
};

function normalizeUpdatablePayload(payload: MemberUpdateRequest): MemberUpdateRequest {
  const normalized: MemberUpdateRequest = {};
  if (payload.name !== undefined) normalized.name = payload.name;
  if (payload.grade !== undefined) normalized.grade = payload.grade;
  if (payload.emergency_contact !== undefined) normalized.emergency_contact = payload.emergency_contact;
  if (payload.student_id !== undefined) normalized.student_id = payload.student_id;
  if (payload.student_email !== undefined) normalized.student_email = payload.student_email;
  if (payload.insurance !== undefined) normalized.insurance = payload.insurance;
  if (payload.some_allergy !== undefined) normalized.some_allergy = payload.some_allergy;
  return normalized;
}

export async function postMembersMe(request: Request, env: Env, auth: AuthContext): Promise<Response> {
  const memberId = auth.memberId;
  if (memberId) {
    const existsRes = await getMyMemberById(env, auth.token, memberId);
    if (existsRes.ok) {
      const parsed = await parseRows<MemberRow>(existsRes);
      if (!(parsed instanceof Response) && parsed.length > 0) {
        return jsonError(409, "Conflict");
      }
    }
  }

  let payload: MemberCreateRequest;
  try {
    payload = (await request.json()) as MemberCreateRequest;
  } catch {
    return jsonError(400, "Bad Request");
  }

  const createRes = await insertMyMember(env, auth.token, payload);
  if (createRes.status === 409) return jsonError(409, "Conflict");
  if (!createRes.ok) return jsonError(createRes.status, createRes.statusText || "Bad Request");

  const createdRows = (await createRes.json()) as MemberRow[];
  if (!Array.isArray(createdRows) || createdRows.length === 0) {
    return jsonError(500, "Internal Server Error");
  }

  const createdMemberId = createdRows[0].member_id;
  const metadataRes = await setUserMemberIdInAppMetadata(env, auth.userId, createdMemberId, auth.roles);
  if (!metadataRes.ok) {
    return jsonError(metadataRes.status, metadataRes.statusText || "Bad Request");
  }

  return noContent(204);
}

export async function getMembersMe(env: Env, auth: AuthContext): Promise<Response> {
  if (!auth.memberId) return jsonError(404, "Not Found");

  const response = await getMyMemberById(env, auth.token, auth.memberId);
  const row = await parseSingleRow<MemberRow>(response);
  if (row instanceof Response) return row;
  return jsonOk(row);
}

export async function patchMembersMe(request: Request, env: Env, auth: AuthContext): Promise<Response> {
  if (!auth.memberId) return jsonError(404, "Not Found");

  let payload: MemberUpdateRequest;
  try {
    payload = normalizeUpdatablePayload((await request.json()) as MemberUpdateRequest);
  } catch {
    return jsonError(400, "Bad Request");
  }

  if (Object.keys(payload).length === 0) return jsonError(400, "Bad Request");

  const response = await patchMyMemberById(env, auth.token, auth.memberId, payload);
  const row = await parseSingleRow<MemberRow>(response);
  if (row instanceof Response) return row;
  return jsonOk(row);
}

function parseSortBy(input: string | null): "name" | "grade" | "updated_at" | undefined {
  if (input === "name" || input === "grade" || input === "updated_at") return input;
  return undefined;
}

function parseSortOrder(input: string | null): "asc" | "desc" | undefined {
  if (input === "asc" || input === "desc") return input;
  return undefined;
}

function parseGrades(values: string[]): number[] {
  return values
    .flatMap((value) => value.split(","))
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value));
}

export async function listMembers(request: Request, env: Env, auth: AuthContext): Promise<Response> {
  const forbidden = requireRole(auth, "Admin");
  if (forbidden) return forbidden;

  const url = new URL(request.url);
  const gradeRaw = url.searchParams.getAll("grade");
  const someAllergyRaw = url.searchParams.get("some_allergy");
  const sortByRaw = url.searchParams.get("sort_by");
  const sortOrderRaw = url.searchParams.get("sort_order");

  const query = {
    grade: parseGrades(gradeRaw),
    someAllergy:
      someAllergyRaw === null ? undefined : someAllergyRaw === "true" ? true : someAllergyRaw === "false" ? false : undefined,
    sortBy: parseSortBy(sortByRaw),
    sortOrder: parseSortOrder(sortOrderRaw),
  };

  if (someAllergyRaw !== null && query.someAllergy === undefined) return jsonError(400, "Bad Request");
  if (sortByRaw !== null && query.sortBy === undefined) return jsonError(400, "Bad Request");
  if (sortOrderRaw !== null && query.sortOrder === undefined) return jsonError(400, "Bad Request");

  const response = await listMembersAsAdminWithQuery(env, query);
  if (!response.ok) return jsonError(response.status, response.statusText || "Bad Request");

  const rows = (await response.json()) as MemberRow[];
  return jsonOk(rows);
}

export async function getMemberById(env: Env, auth: AuthContext, memberId: string): Promise<Response> {
  const forbidden = requireRole(auth, "Admin");
  if (forbidden) return forbidden;

  const response = await getMemberAsAdmin(env, memberId);
  const row = await parseSingleRow<MemberRow>(response);
  if (row instanceof Response) return row;
  return jsonOk(row);
}

export async function patchMemberById(
  request: Request,
  env: Env,
  auth: AuthContext,
  memberId: string,
): Promise<Response> {
  const forbidden = requireRole(auth, "Admin");
  if (forbidden) return forbidden;

  let payload: MemberUpdateRequest;
  try {
    payload = normalizeUpdatablePayload((await request.json()) as MemberUpdateRequest);
  } catch {
    return jsonError(400, "Bad Request");
  }

  if (Object.keys(payload).length === 0) return jsonError(400, "Bad Request");

  const response = await patchMemberAsAdmin(env, memberId, payload);
  const row = await parseSingleRow<MemberRow>(response);
  if (row instanceof Response) return row;
  return jsonOk(row);
}
