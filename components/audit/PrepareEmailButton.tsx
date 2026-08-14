"use client";

import { useState } from "react";
import { roundHandicapUpToHalf } from "@/lib/handicapRounding";
import { HANDICAP_COMMITTEE_CC_QUERY } from "@/lib/handicapCommittee";

type Props = {
  playerId: string;
  playerName: string;
  currentIndex: number | null;
  evidenceIndex: number | null;
  evidenceGap: number | null;
  suggestedIndex: number | null;
  decisionLabel: string;
  decisionSummary: string;
  decisionEvidence: string[];
};

function valueOrDash(value: number | null) {
  return value == null ? "-" : value.toFixed(1);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9.-]+/g, "-").replace(/^-|-$/g, "");
}

function buildEmailBody(props: Props) {
  const adjustedIndex =
    props.suggestedIndex != null
      ? roundHandicapUpToHalf(props.suggestedIndex)
      : null;

  const adjustment = adjustedIndex != null
    ? `\nBecause your Conservative Review HI is at least 2.0 strokes lower than your official handicap, a Committee-Adjusted Handicap Index of ${adjustedIndex.toFixed(
        1
      )} will be used for Goodrich Men's Club competitive events and matches. This review value gives you the benefit of the higher Last 20 Competition HI or Two-Year Committee Evidence HI when fewer than 10 recent Goodrich competition rounds are available, then rounds upward to the next half-stroke.`
    : "\nThis audit is being provided for review. No competition-only adjustment is indicated by the current 2.0-stroke threshold.";

  const evidence = props.decisionEvidence
    .map((item) => `- ${item}`)
    .join("\n");

  return `Hello ${props.playerName},

The Goodrich Men's Club Handicap Committee has completed its current review of your competition scoring history.

Official GHIN Handicap Index: ${valueOrDash(props.currentIndex)}
Conservative Review HI: ${valueOrDash(props.evidenceIndex)}
Stroke Discrepancy: ${valueOrDash(props.evidenceGap)} strokes
${adjustment}

Why this change is being made
Decision: ${props.decisionLabel}
${props.decisionSummary}

Evidence used for your review
${evidence}

The same evidence hierarchy and benefit-of-the-doubt selection are applied to every member. Once the Conservative Review HI is selected, the final test for every golfer is whether it is at least 2.0 strokes below the Current Handicap Index. Sample size and single-score sensitivity remain visible context but do not cancel a qualifying comparison.

Your official GHIN Handicap Index will not be changed. Any committee adjustment applies only to Goodrich Men's Club competitive events and matches.

We will review the calculation weekly as additional competition scores are posted. The attached audit PDF contains the scoring details used in this review.

If you have any questions, please contact a member of the Handicap Committee.

Thank you,
Goodrich Men's Club Handicap Committee`;
}

function buildEmailHtml(props: Props) {
  const adjustedIndex =
    props.suggestedIndex != null
      ? roundHandicapUpToHalf(props.suggestedIndex)
      : null;

  const adjustment = adjustedIndex != null
    ? `<p>Because your Conservative Review HI is at least <strong>2.0 strokes lower</strong> than your official handicap, a <strong>Committee-Adjusted Handicap Index of ${adjustedIndex.toFixed(
        1
      )}</strong> will be used for Goodrich Men's Club competitive events and matches. This review value gives you the benefit of the <strong>higher Last 20 Competition HI or Two-Year Committee Evidence HI</strong> when fewer than 10 recent Goodrich competition rounds are available, then rounds upward to the next half-stroke.</p>`
    : "<p>This audit is being provided for review. <strong>No competition-only adjustment</strong> is indicated by the current 2.0-stroke threshold.</p>";

  const evidence = props.decisionEvidence
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  return `<p>Hello ${escapeHtml(props.playerName)},</p>
<p>The Goodrich Men's Club Handicap Committee has completed its current review of your competition scoring history.</p>
<p><strong>Official GHIN Handicap Index: ${valueOrDash(
    props.currentIndex
  )}</strong><br>
<strong>Conservative Review HI: ${valueOrDash(
    props.evidenceIndex
  )}</strong><br>
<strong>Stroke Discrepancy: ${valueOrDash(props.evidenceGap)} strokes</strong></p>
${adjustment}
<p><strong>Why this change is being made</strong><br>
<strong>Decision: ${escapeHtml(props.decisionLabel)}</strong><br>
${escapeHtml(props.decisionSummary)}</p>
<p><strong>Evidence used for your review</strong></p>
<ul>${evidence}</ul>
<p>The same <strong>evidence hierarchy and benefit-of-the-doubt selection</strong> are applied to every member. Once the Conservative Review HI is selected, the <strong>final test for every golfer</strong> is whether it is at least <strong>2.0 strokes below the Current Handicap Index</strong>. Sample size and single-score sensitivity remain visible context but do not cancel a qualifying comparison.</p>
<p><strong>Your official GHIN Handicap Index will not be changed.</strong> Any committee adjustment applies <strong>only to Goodrich Men's Club competitive events and matches.</strong></p>
<p>We will review the calculation weekly as additional competition scores are posted. The attached audit PDF contains the scoring details used in this review.</p>
<p>If you have any questions, please contact a member of the Handicap Committee.</p>
<p>Thank you,<br>
<strong>Goodrich Men's Club Handicap Committee</strong></p>`;
}

async function copyFormattedEmail(html: string, text: string) {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
    await navigator.clipboard.writeText(text);
    return false;
  }

  await navigator.clipboard.write([
    new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([text], { type: "text/plain" }),
    }),
  ]);

  return true;
}

export function PrepareEmailButton(props: Props) {
  const [preparing, setPreparing] = useState(false);

  async function prepareEmail() {
    setPreparing(true);
    const draftWindow = window.open("about:blank", "_blank");

    if (draftWindow) {
      draftWindow.opener = null;
    }

    try {
      const response = await fetch(
        `/api/audit/export?playerId=${encodeURIComponent(props.playerId)}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("Unable to generate this player's audit PDF.");
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `${safeFileName(props.playerName)}-handicap-review.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);

      const subject = `${props.playerName} - Goodrich Men's Club Competition Handicap Review`;
      const body = buildEmailBody(props);
      const htmlBody = buildEmailHtml(props);
      let copiedFormatted = false;

      try {
        copiedFormatted = await copyFormattedEmail(htmlBody, body);
      } catch {
        // Gmail receives the plain-text body if clipboard access is blocked.
      }

      const gmailUrl = new URL("https://mail.google.com/mail/");
      gmailUrl.searchParams.set("view", "cm");
      gmailUrl.searchParams.set("fs", "1");
      gmailUrl.searchParams.set("su", subject);
      gmailUrl.searchParams.set("cc", HANDICAP_COMMITTEE_CC_QUERY);
      if (!copiedFormatted) {
        gmailUrl.searchParams.set("body", body);
      }
      if (draftWindow) {
        draftWindow.location.href = gmailUrl.toString();
      } else {
        window.location.href = gmailUrl.toString();
      }

      window.alert(
        copiedFormatted
          ? "The formatted email was copied and the player PDF was downloaded. Paste the email into Gmail, then attach the downloaded PDF before sending."
          : "The player PDF was downloaded and a plain-text Gmail draft was prepared. Attach the downloaded PDF before sending."
      );
    } catch (error) {
      draftWindow?.close();
      window.alert(
        error instanceof Error ? error.message : "Unable to prepare the email."
      );
    } finally {
      setPreparing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={prepareEmail}
      disabled={preparing}
      className="inline-flex min-h-10 w-full items-center justify-center rounded-md border border-green-700 bg-green-50 px-3 py-1.5 text-center text-sm font-semibold text-green-800 transition-colors hover:bg-green-100 disabled:cursor-wait disabled:opacity-60"
      title="Download the player's PDF and open a Gmail draft with the Handicap Committee CCed"
    >
      {preparing ? "Preparing..." : "Prepare Change Email"}
    </button>
  );
}
