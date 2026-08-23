// Admin gate. The list of admin emails lives in a SERVER-ONLY env var
// (ADMIN_EMAILS, comma-separated), never in the code and never public. If the
// var is unset, nobody is an admin and the admin panel 404s for everyone.
export function adminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(email) {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}
