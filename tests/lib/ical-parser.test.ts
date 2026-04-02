import { describe, it, expect } from "vitest";
import { parseIcalDates } from "@/lib/ical-parser";

// Realistic Airbnb iCal content based on actual exports
const AIRBNB_FIXTURE = `BEGIN:VCALENDAR
PRODID;X-RICAL-TZSOURCE=TZINFO:-//Airbnb Inc//Hosting Calendar 0.8.8//EN
CALSCALE:GREGORIAN
VERSION:2.0
BEGIN:VEVENT
DTEND;VALUE=DATE:20260410
DTSTART;VALUE=DATE:20260405
UID:abc123@airbnb.com
SUMMARY:Reserved
DESCRIPTION:CHECKIN: 05/04/2026\\nCHECKOUT: 10/04/2026
END:VEVENT
BEGIN:VEVENT
DTEND;VALUE=DATE:20260416
DTSTART;VALUE=DATE:20260415
UID:def456@airbnb.com
SUMMARY:Airbnb (Not available)
END:VEVENT
END:VCALENDAR`;

describe("parseIcalDates", () => {
  it("extracts multi-day range with DTEND exclusive (Apr 5–10 = 5 dates: Apr 5–9)", () => {
    const single = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTEND;VALUE=DATE:20260410
DTSTART;VALUE=DATE:20260405
UID:test@airbnb.com
SUMMARY:Reserved
END:VEVENT
END:VCALENDAR`;

    const dates = parseIcalDates(single);
    expect(dates).toEqual([
      "2026-04-05",
      "2026-04-06",
      "2026-04-07",
      "2026-04-08",
      "2026-04-09",
    ]);
    // DTEND 20260410 is exclusive — Apr 10 is NOT included
    expect(dates).not.toContain("2026-04-10");
  });

  it("handles single-day event (DTSTART + 1 day DTEND)", () => {
    const single = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTEND;VALUE=DATE:20260416
DTSTART;VALUE=DATE:20260415
UID:single@airbnb.com
SUMMARY:Airbnb (Not available)
END:VEVENT
END:VCALENDAR`;

    const dates = parseIcalDates(single);
    expect(dates).toEqual(["2026-04-15"]);
  });

  it("handles multiple events from real Airbnb fixture", () => {
    const dates = parseIcalDates(AIRBNB_FIXTURE);
    // First event: Apr 5–9 (5 dates)
    // Second event: Apr 15 (1 date)
    expect(dates).toHaveLength(6);
    expect(dates).toEqual([
      "2026-04-05",
      "2026-04-06",
      "2026-04-07",
      "2026-04-08",
      "2026-04-09",
      "2026-04-15",
    ]);
  });

  it("deduplicates overlapping events", () => {
    const overlapping = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTEND;VALUE=DATE:20260408
DTSTART;VALUE=DATE:20260405
UID:overlap1@airbnb.com
SUMMARY:Reserved
END:VEVENT
BEGIN:VEVENT
DTEND;VALUE=DATE:20260410
DTSTART;VALUE=DATE:20260407
UID:overlap2@airbnb.com
SUMMARY:Reserved
END:VEVENT
END:VCALENDAR`;

    const dates = parseIcalDates(overlapping);
    // Event 1: Apr 5, 6, 7
    // Event 2: Apr 7, 8, 9
    // Merged & deduped: Apr 5, 6, 7, 8, 9
    expect(dates).toEqual([
      "2026-04-05",
      "2026-04-06",
      "2026-04-07",
      "2026-04-08",
      "2026-04-09",
    ]);
  });

  it("returns sorted array", () => {
    // Events in reverse chronological order
    const reversed = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTEND;VALUE=DATE:20260502
DTSTART;VALUE=DATE:20260501
UID:later@airbnb.com
SUMMARY:Reserved
END:VEVENT
BEGIN:VEVENT
DTEND;VALUE=DATE:20260402
DTSTART;VALUE=DATE:20260401
UID:earlier@airbnb.com
SUMMARY:Reserved
END:VEVENT
END:VCALENDAR`;

    const dates = parseIcalDates(reversed);
    expect(dates).toEqual(["2026-04-01", "2026-05-01"]);
    // Verify ascending order even though later event was first in file
    expect(dates[0] < dates[1]).toBe(true);
  });

  it("returns empty array for calendar with no events", () => {
    const empty = `BEGIN:VCALENDAR
PRODID:-//Airbnb Inc//Hosting Calendar 1.0//EN
CALSCALE:GREGORIAN
VERSION:2.0
END:VCALENDAR`;

    expect(parseIcalDates(empty)).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(parseIcalDates("")).toEqual([]);
  });

  it("handles DateTime format (DTSTART:20260405T140000Z)", () => {
    const datetime = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20260701T140000Z
DTEND:20260705T110000Z
UID:dt@airbnb.com
SUMMARY:Reserved
DESCRIPTION:Booking via Airbnb
END:VEVENT
END:VCALENDAR`;

    const dates = parseIcalDates(datetime);
    // Jul 1 to Jul 5 — dates extracted, time discarded
    // DTEND day (Jul 5) excluded since we extract date part only and DTEND is exclusive
    expect(dates).toEqual([
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
      "2026-07-04",
    ]);
  });

  it("handles VEVENT with no DTEND (treats as single day)", () => {
    const noDtend = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260520
UID:noend@airbnb.com
SUMMARY:Not available
END:VEVENT
END:VCALENDAR`;

    const dates = parseIcalDates(noDtend);
    expect(dates).toEqual(["2026-05-20"]);
  });

  it("handles DTSTART with TZID parameter", () => {
    const tzid = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART;TZID=US/Eastern:20260610T140000
DTEND;TZID=US/Eastern:20260612T110000
UID:tz@airbnb.com
SUMMARY:Reserved
END:VEVENT
END:VCALENDAR`;

    const dates = parseIcalDates(tzid);
    expect(dates).toEqual(["2026-06-10", "2026-06-11"]);
  });

  it("handles line folding (RFC 5545 continuation lines)", () => {
    // Long DESCRIPTION line folded with leading whitespace
    const folded = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260801
DTEND;VALUE=DATE:20260803
UID:fold@airbnb.com
SUMMARY:Reserved
DESCRIPTION:CHECKIN: 01/08/2026\\nCHECKOUT: 03/08/2026\\nNIGHTS: 2\\nPHONE: +1234
 567890\\nEMAIL: guest@airbnb.com
END:VEVENT
END:VCALENDAR`;

    const dates = parseIcalDates(folded);
    expect(dates).toEqual(["2026-08-01", "2026-08-02"]);
  });

  it("handles Windows-style line endings (\\r\\n)", () => {
    const crlf =
      "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20261001\r\nDTEND;VALUE=DATE:20261003\r\nUID:crlf@airbnb.com\r\nSUMMARY:Reserved\r\nEND:VEVENT\r\nEND:VCALENDAR";

    const dates = parseIcalDates(crlf);
    expect(dates).toEqual(["2026-10-01", "2026-10-02"]);
  });

  it("ignores malformed VEVENT with no DTSTART", () => {
    const noStart = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTEND;VALUE=DATE:20260410
UID:nostart@airbnb.com
SUMMARY:Reserved
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260501
DTEND;VALUE=DATE:20260502
UID:good@airbnb.com
SUMMARY:Reserved
END:VEVENT
END:VCALENDAR`;

    const dates = parseIcalDates(noStart);
    // Only the valid event should produce dates
    expect(dates).toEqual(["2026-05-01"]);
  });

  it("handles month boundaries correctly", () => {
    const boundary = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260430
DTEND;VALUE=DATE:20260503
UID:boundary@airbnb.com
SUMMARY:Reserved
END:VEVENT
END:VCALENDAR`;

    const dates = parseIcalDates(boundary);
    expect(dates).toEqual(["2026-04-30", "2026-05-01", "2026-05-02"]);
  });
});
