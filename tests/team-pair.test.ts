/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";
import { createPrivateToken, invitationFragment, validRoom, validToken } from "../src/lib/team-pair-client";

describe("passwordless private pairing", () => {
  test("generates a 256-bit unpredictable 43-character capability", () => {
    const a = createPrivateToken(), b = createPrivateToken();
    expect(validToken(a)).toBe(true);
    expect(validToken(b)).toBe(true);
    expect(a).not.toBe(b);
  });
  test("rejects malformed or short capabilities", () => {
    expect(validToken("123456")).toBe(false);
    expect(validToken("a".repeat(43))).toBe(true);
    expect(validToken("a".repeat(42))).toBe(false);
    expect(validToken("x".repeat(42)+"=")).toBe(false);
  });
  test("requires a valid room and uses URL fragments, never query strings", () => {
    const room="123e4567-e89b-12d3-a456-426614174000";
    expect(validRoom(room)).toBe(true);
    expect(validRoom("../invalid")).toBe(false);
    const token = createPrivateToken();
    expect(invitationFragment(room,token,"sean")).toBe(`#coilside-invite=${room}.${token}`);
    expect(invitationFragment(room,token,"owner")).toBe(`#coilside-owner=${room}.${token}`);
    expect(invitationFragment(room,token,"sean")).not.toContain("?");
  });
});
