export const NAV = [
  { to: "/", key: "home", icon: "home", primary: true },
  { to: "/projects", key: "projects", icon: "grid", primary: true },
  { to: "/services", key: "services", icon: "layers", primary: true },
  { to: "/consultation", key: "consultation", icon: "chat", primary: true },
  { to: "/insights", key: "insights", icon: "book", primary: false },
  { to: "/about", key: "about", icon: "info", primary: false },
  { to: "/contact", key: "contact", icon: "phone", primary: true },
  { to: "/settings", key: "settings", icon: "cog", primary: false },
] as const;
