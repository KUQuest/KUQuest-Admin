const requestedDispute = new URLSearchParams(location.search).get("openDispute");
if (requestedDispute) {
  const disputeIndex = data.disputes.findIndex((dispute) => dispute.id === requestedDispute);
  if (disputeIndex >= 0) {
    navigate("disputes");
    requestAnimationFrame(() => ensureDetailDrawer("disputes", disputeIndex));
  }
}
const requestedUser = new URLSearchParams(location.search).get("openUser");
if (requestedUser) {
  const userIndex = data.users.findIndex((user) => user.id === requestedUser);
  if (userIndex >= 0) {
    navigate("users");
    requestAnimationFrame(() => openDrawer("users", userIndex));
  }
}
