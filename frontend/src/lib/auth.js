export const ROLES = {
  admin: "admin",
  student: "student",
}

export function getUserRole(user) {
  return user?.user_metadata?.role === ROLES.admin ? ROLES.admin : ROLES.student
}

export function getDashboardPath(role) {
  return role === ROLES.admin ? "/admin/dashboard" : "/student/dashboard"
}

export function isKnownRole(role) {
  return role === ROLES.admin || role === ROLES.student
}
