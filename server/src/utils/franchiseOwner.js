/** Public franchise owner — never expose mobile/phone. */
export function publicFranchiseOwnerView(owner) {
  if (!owner) return null;
  return {
    fullName: owner.fullName || "",
    company: owner.company || "",
    profileImageUrl: owner.profileImageUrl || "",
    photo: owner.photo || null,
    status: owner.status,
  };
}

export function isFranchiseOwnerRegistration(reg) {
  return String(reg?.interest || "").toLowerCase() === "franchise";
}

/** Strip mobile from franchise-owner registration payloads sent to clients. */
export function hideFranchiseOwnerPhone(reg) {
  if (!reg || typeof reg !== "object" || !isFranchiseOwnerRegistration(reg)) return reg;
  return { ...reg, phone: "" };
}
