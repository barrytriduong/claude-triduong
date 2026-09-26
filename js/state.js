import config from "./config.js";

/** Everything the page currently knows. Modules read and update this directly. */
export const state = {
  store: null,
  settings: { ...config.defaults },
  events: [],
  comments: [],
  reactions: [],
  measurements: [],
  letters: [],
  editing: false,
  user: null,
  myName: "",
  access: { admin: false, family: false },
  view: "timeline",
  filterTag: null,
};

export const COLORS = {
  pink: "#ff8fb1", peach: "#ffb38a", lemon: "#ffd66b", mint: "#74d6b8", sky: "#86c5ff", lavender: "#b8a2ff",
};
export const COLOR_KEYS = Object.keys(COLORS);

/** Built-in tags; their labels come from i18n ("tag_<key>"). Anything else is a custom tag shown as typed. */
export const PRESET_TAGS = ["firsts", "birthday", "trip", "funny", "family", "health", "school", "holiday"];

/** Re-render hooks, registered by app.js so modules can ask for a refresh without importing it. */
export const hooks = {
  renderTimeline: () => {},
  renderGrowth: () => {},
  renderLetters: () => {},
  /** Called after new memories are saved (reloads, then offers to email the family). */
  memoriesAdded: async () => {},
};
