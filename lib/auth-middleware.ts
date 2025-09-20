import type { NextRequest } from "next/server"
import jwt from "jsonwebtoken"
import { sql } from "@/lib/db"

export async function verifyAuth(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { success: false, error: "No token provided" }
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret") as any

    // Get user details from database to ensure we have latest company_id
    const users = await sql`
      SELECT id, email, role, company_id
      FROM users
      WHERE id = ${decoded.userId}
    `

    if (users.length === 0) {
      return { success: false, error: "User not found" }
    }

    const user = users[0]

    return {
      success: true,
      user: {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.company_id || 2, // Default to company 2 if null
      },
    }
  } catch (error) {
    return { success: false, error: "Invalid token" }
  }
}

export function requireRole(allowedRoles: string[]) {
  return async (request: NextRequest) => {
    const authResult = await verifyAuth(request)

    if (!authResult.success) {
      return { success: false, error: "Unauthorized" }
    }

    if (!authResult.user || !allowedRoles.includes(authResult.user.role)) {
      return { success: false, error: "Insufficient permissions" }
    }

    return authResult
  }
}

export const verifyToken = verifyAuth
