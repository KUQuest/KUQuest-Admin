const requestedDispute = new URLSearchParams(location.search).get("openDispute");
if (requestedDispute) {
  const disputeIndex = data.disputes.findIndex((dispute) => dispute.id === requestedDispute);
  if (disputeIndex >= 0) {
    navigate("disputes");
    requestAnimationFrame(() => ensureDetailDrawer("disputes", disputeIndex));
  }
}
