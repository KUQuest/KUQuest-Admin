const adminSession = localStorage.getItem("kuquest-admin-session");
if (!adminSession) location.replace("/login");
