import { userService } from "../services/userService";

// Map to cache real-time personnel/user names from Firestore indexed by email
let userMapByEmail = new Map<string, string>();

// Subscribe to real-time users collection in Personnel Protocols
try {
  userService.subscribeToUsers((users) => {
    const newMap = new Map<string, string>();
    if (Array.isArray(users)) {
      users.forEach((u) => {
        if (u.email && u.name) {
          newMap.set(u.email.toLowerCase().trim(), u.name.trim());
        }
      });
    }
    userMapByEmail = newMap;
  });
} catch (error) {
  console.error("Failed to subscribe to users in creatorUtils:", error);
}

export function formatCreatorName(name: string | undefined, email: string | undefined): string {
  if (!name && !email) return "System / Auto";
  const normalizedEmail = email?.toLowerCase().trim() || "";
  const normalizedName = name?.toUpperCase().trim() || "";

  // 1. Check if the email exists in User Management / Personnel Protocols
  if (normalizedEmail && userMapByEmail.has(normalizedEmail)) {
    const matchedName = userMapByEmail.get(normalizedEmail);
    if (matchedName) {
      // Avoid picking corporate placeholder names if we can map them, but otherwise return the correct employee name
      if (
        matchedName.toUpperCase().includes("SITVIK RENEW PRIVATE LIMITED") ||
        matchedName.toUpperCase().includes("SITVIK RENEW") ||
        matchedName.toUpperCase().includes("SITVIK")
      ) {
        return "Laxmi Narayan Meena";
      }
      return matchedName;
    }
  }

  // 2. Direct check for Sitvik or Laxmi Narayan Meena email
  if (
    normalizedEmail === "sitvik24@gmail.com" ||
    normalizedName.includes("SITVIK RENEW PRIVATE LIMITED") ||
    normalizedName.includes("SITVIK RENEW") ||
    normalizedName.includes("SITVIK")
  ) {
    return "Laxmi Narayan Meena";
  }

  // 3. Predefined email mapping fallback for precise employee names
  if (normalizedEmail === "kishanlalmeena.admin@gmail.com") return "Kishan Lal Meena";
  if (normalizedEmail === "pawanchaudharyaaaa051@gmail.com") return "Pawan Kumar";
  if (normalizedEmail === "rahulnagarwal366@gmail.com") return "Rahul Nagarwal";
  if (normalizedEmail === "76513vk@gmail.com") return "Vishnu Kumar Sharma";
  if (normalizedEmail === "anmolrathi20@gmail.com") return "Anmol Rathi";
  if (normalizedEmail === "gajendrameena3164@gmail.com") return "Gajendra Meena";
  if (normalizedEmail === "nm8877485@gmail.com") return "Nitesh";
  if (
    normalizedEmail === "hemanttyagi225@gmail.com" ||
    normalizedEmail === "hemant.tyagi@bharatamtechnology.com"
  ) {
    return "Hemant Tyagi";
  }

  // 4. If name is an email address, parse the prefix
  if (name && name.includes("@")) {
    const prefix = name.split("@")[0];
    return prefix
      .replace(/[._-]/g, " ")
      .replace(/([a-z])([0-9])/g, "$1 $2")
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  return name || "System / Auto";
}
