import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { verifyAuth } from "@/lib/auth-middleware"

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userCompanyId = authResult.user.companyId

    // Try to get existing settings for the company
    const settings = await sql`
      SELECT * FROM settings WHERE company_id = ${userCompanyId} LIMIT 1
    `

    if (settings.length === 0) {
      // Return default settings if none exist
      return NextResponse.json({
        companyName: "",
        companyDomain: "",
        emailNotifications: true,
        autoBackup: true,
        maintenanceMode: false,
        theme: "system",
        language: "en",
        timezone: "UTC",
        dateFormat: "MM/DD/YYYY",
        currency: "USD",
      })
    }

    return NextResponse.json(settings[0])
  } catch (error) {
    console.error("Get settings error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can update settings
    if (authResult.user.role !== "admin") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const userCompanyId = authResult.user.companyId
    const settingsData = await request.json()

    // Check if settings already exist for this company
    const existingSettings = await sql`
      SELECT id FROM settings WHERE company_id = ${userCompanyId}
    `

    let result
    if (existingSettings.length > 0) {
      // Update existing settings
      result = await sql`
        UPDATE settings
        SET
          company_name = ${settingsData.companyName || ""},
          company_domain = ${settingsData.companyDomain || ""},
          email_notifications = ${settingsData.emailNotifications ?? true},
          auto_backup = ${settingsData.autoBackup ?? true},
          maintenance_mode = ${settingsData.maintenanceMode ?? false},
          theme = ${settingsData.theme || "system"},
          language = ${settingsData.language || "en"},
          timezone = ${settingsData.timezone || "UTC"},
          date_format = ${settingsData.dateFormat || "MM/DD/YYYY"},
          currency = ${settingsData.currency || "USD"},
          updated_at = NOW()
        WHERE company_id = ${userCompanyId}
        RETURNING *
      `
    } else {
      // Create new settings
      result = await sql`
        INSERT INTO settings (
          company_id, company_name, company_domain, email_notifications,
          auto_backup, maintenance_mode, theme, language, timezone,
          date_format, currency, created_at, updated_at
        )
        VALUES (
          ${userCompanyId}, ${settingsData.companyName || ""}, ${settingsData.companyDomain || ""},
          ${settingsData.emailNotifications ?? true}, ${settingsData.autoBackup ?? true},
          ${settingsData.maintenanceMode ?? false}, ${settingsData.theme || "system"},
          ${settingsData.language || "en"}, ${settingsData.timezone || "UTC"},
          ${settingsData.dateFormat || "MM/DD/YYYY"}, ${settingsData.currency || "USD"},
          NOW(), NOW()
        )
        RETURNING *
      `
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Update settings error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}