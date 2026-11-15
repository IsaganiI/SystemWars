export const vetoScenarios = [
  { id: "ticket-onsale", name: "Ticket Onsale" },
  { id: "live-chat", name: "Live Chat" },
  { id: "video-streaming", name: "Video Streaming" },
] as const;

export type VetoScenario = typeof vetoScenarios[number]["id"];
