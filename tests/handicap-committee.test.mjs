import assert from "node:assert/strict";
import test from "node:test";

import {
  HANDICAP_COMMITTEE_CC,
  HANDICAP_COMMITTEE_CC_QUERY,
} from "../lib/handicapCommittee.ts";

test("change emails CC the current Handicap Committee recipients", () => {
  assert.deepEqual(
    HANDICAP_COMMITTEE_CC.map(({ email }) => email),
    [
      "mmorseth@msn.com",
      "dafredv@gmail.com",
      "rcasura@yahoo.com",
      "colinkania15@gmail.com",
    ]
  );
  assert.equal(
    HANDICAP_COMMITTEE_CC_QUERY,
    "mmorseth@msn.com,dafredv@gmail.com,rcasura@yahoo.com,colinkania15@gmail.com"
  );
});
