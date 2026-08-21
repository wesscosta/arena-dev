import type { Classroom, Enrollment, Student } from "./types";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

type ApiErrorBody = {
  message?: string;
  fields?: Record<string, string>;
};

export class ArenaApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ArenaApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = undefined;
    }
    throw new ArenaApiError(body?.message || `Falha na API (${response.status}).`, response.status, body?.fields);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

type ClassroomView = {
  id: string;
  name: string;
  code: string | null;
  active: boolean;
  createdAt: string;
};

type StudentView = {
  id: string;
  registration: string | null;
  name: string;
  nickname: string | null;
  active: boolean;
  createdAt: string;
};

type EnrollmentView = {
  enrollmentId: string;
  studentId: string;
  registration: string | null;
  name: string;
  nickname: string | null;
  studentActive: boolean;
  enrollmentActive: boolean;
  joinedAt: string;
};

function mapClassroom(item: ClassroomView): Classroom {
  return {
    id: item.id,
    name: item.name,
    code: item.code ?? "",
    active: item.active,
    createdAt: item.createdAt,
  };
}

function mapStudent(item: StudentView): Student {
  return {
    id: item.id,
    registration: item.registration ?? "",
    name: item.name,
    nickname: item.nickname ?? "",
    active: item.active,
    createdAt: item.createdAt,
  };
}

function mapEnrollment(classroomId: string, item: EnrollmentView): Enrollment {
  return {
    id: item.enrollmentId,
    classroomId,
    studentId: item.studentId,
    active: item.enrollmentActive,
    joinedAt: item.joinedAt,
  };
}

export async function fetchClassroomDomain(): Promise<{
  classrooms: Classroom[];
  students: Student[];
  enrollments: Enrollment[];
}> {
  const [classroomViews, studentViews] = await Promise.all([
    request<ClassroomView[]>("/api/classrooms"),
    request<StudentView[]>("/api/students?includeInactive=true"),
  ]);

  const classrooms = classroomViews.map(mapClassroom);
  const students = studentViews.map(mapStudent);
  const enrollmentGroups = await Promise.all(
    classrooms.map(async (classroom) => {
      const rows = await request<EnrollmentView[]>(`/api/classrooms/${classroom.id}/students?includeInactive=true`);
      return rows.map((row) => mapEnrollment(classroom.id, row));
    }),
  );

  return {
    classrooms,
    students,
    enrollments: enrollmentGroups.flat(),
  };
}

export async function createClassroom(input: { name: string; code?: string }): Promise<Classroom> {
  const result = await request<ClassroomView>("/api/classrooms", {
    method: "POST",
    body: JSON.stringify({ name: input.name, code: input.code || null }),
  });
  return mapClassroom(result);
}

export async function createStudent(input: { name: string; nickname?: string; registration?: string }): Promise<Student> {
  const result = await request<StudentView>("/api/students", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      nickname: input.nickname || null,
      registration: input.registration || null,
    }),
  });
  return mapStudent(result);
}

export async function enrollStudent(classroomId: string, studentId: string): Promise<Enrollment> {
  const result = await request<EnrollmentView>(`/api/classrooms/${classroomId}/students/${studentId}`, {
    method: "POST",
  });
  return mapEnrollment(classroomId, result);
}

export async function setEnrollmentActive(classroomId: string, studentId: string, active: boolean): Promise<Enrollment> {
  const result = await request<EnrollmentView>(`/api/classrooms/${classroomId}/students/${studentId}`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });
  return mapEnrollment(classroomId, result);
}

export async function removeEnrollment(classroomId: string, studentId: string): Promise<void> {
  await request<void>(`/api/classrooms/${classroomId}/students/${studentId}`, {
    method: "DELETE",
  });
}

export async function createAndEnrollStudent(
  classroomId: string,
  input: { name: string; nickname?: string; registration?: string },
): Promise<{ student: Student; enrollment: Enrollment }> {
  const student = await createStudent(input);
  try {
    const enrollment = await enrollStudent(classroomId, student.id);
    return { student, enrollment };
  } catch (error) {
    // The student remains globally registered if enrollment fails. This is intentional:
    // Student and Enrollment are separate domain concepts and no destructive compensation
    // should be attempted from the browser.
    throw error;
  }
}
