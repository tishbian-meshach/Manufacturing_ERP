// Simple authentication utilities for the ERP system
// This is a basic implementation - in production, use a proper auth service

export interface User {
  id: string
  email: string
  name: string
  role: "admin" | "manager" | "operator"
}

export interface AuthSession {
  user: User | null
  isAuthenticated: boolean
}

// Mock authentication for development
// In production, integrate with your preferred auth provider
export function createMockSession(user: User): AuthSession {
  return {
    user,
    isAuthenticated: true,
  }
}

export function getDefaultSession(): AuthSession {
  return {
    user: null,
    isAuthenticated: false,
  }
}

// Role-based access control
export function hasPermission(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = {
    admin: 3,
    manager: 2,
    operator: 1,
  }

  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0

  return userLevel >= requiredLevel
}

export function canAccessManufacturingOrders(userRole: string): boolean {
  return hasPermission(userRole, "operator")
}

export function canCreateManufacturingOrders(userRole: string): boolean {
  return hasPermission(userRole, "manager")
}

export function canAccessReports(userRole: string): boolean {
  return hasPermission(userRole, "manager")
}

export function canManageUsers(userRole: string): boolean {
  return hasPermission(userRole, "admin")
}

// Utility function to get current user's company ID
export function getCurrentUserCompanyId(): number | null {
  if (typeof window === 'undefined') return null; // Server-side

  try {
    const userData = localStorage.getItem('erp_user');
    if (userData) {
      const user = JSON.parse(userData);
      return user.companyId || user.company_id || null;
    }
  } catch (error) {
    console.error('Error getting user company ID:', error);
  }
  return null;
}

// Utility function to get current user
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null; // Server-side

  try {
    const userData = localStorage.getItem('erp_user');
    if (userData) {
      const user = JSON.parse(userData);
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      };
    }
  } catch (error) {
    console.error('Error getting current user:', error);
  }
  return null;
}

// Utility function to get current company
export function getCurrentCompany(): { id: string; name: string; domain: string } | null {
  if (typeof window === 'undefined') return null; // Server-side

  try {
    const companyData = localStorage.getItem('erp_company');
    if (companyData) {
      return JSON.parse(companyData);
    }
  } catch (error) {
    console.error('Error getting current company:', error);
  }
  return null;
}
