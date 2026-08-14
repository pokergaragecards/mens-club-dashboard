export const HANDICAP_COMMITTEE_CC = [
  { name: "Marlin Morseth", email: "mmorseth@msn.com" },
  { name: "Fred Velasquez", email: "dafredv@gmail.com" },
  { name: "Robert Casura", email: "rcasura@yahoo.com" },
  { name: "Colin Kania", email: "colinkania15@gmail.com" },
] as const;

export const HANDICAP_COMMITTEE_CC_QUERY = HANDICAP_COMMITTEE_CC.map(
  ({ email }) => email
).join(",");

export const HANDICAP_COMMITTEE_CC_LABEL = HANDICAP_COMMITTEE_CC.map(
  ({ name, email }) => `${name} <${email}>`
).join(", ");
