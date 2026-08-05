"use client";

import { useState } from "react";

type Props = {
  playerId: string;
  playerName: string;
  currentIndex: number | null;
  competitionIndex: number | null;
  competitionGap: number | null;
};

function valueOrDash(value: number | null) {
  return value == null ? "-" : value.toFixed(1);
}

function roundedUpHalf(value: number) {
  return Math.ceil(value * 2) / 2;
}

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9.-]+/g, "-").replace(/^-|-$/g, "");
}

function buildEmailBody(props: Props) {
  const qualifies =
    props.competitionIndex != null &&
    props.competitionGap != null &&
    props.competitionGap >= 2;

  const adjustedIndex =
    qualifies && props.competitionIndex != null
      ? roundedUpHalf(props.competitionIndex)
      : null;

  const adjustment = qualifies
    ? `\nBecause your Competition Handicap Index is at least 2.0 strokes lower than your official handicap, a Committee-Adjusted Handicap Index of ${adjustedIndex?.toFixed(
        1
      )} will be used for Goodrich Men's Club competitive events and matches. This value is your Competition Handicap Index rounded upward to the next half-stroke.`
    : "\nThis audit is being provided for review. No competition-only adjustment is indicated by the current 2.0-stroke threshold.";

  return `Hello ${props.playerName},

The Goodrich Men's Club Handicap Committee has completed its current review of your competition scoring history.

Official GHIN Handicap Index: ${valueOrDash(props.currentIndex)}
Competition Handicap Index: ${valueOrDash(props.competitionIndex)}
Difference: ${valueOrDash(props.competitionGap)} strokes
${adjustment}

Your official GHIN Handicap Index will not be changed. Any committee adjustment applies only to Goodrich Men's Club competitive events and matches.

We will review the calculation weekly as additional competition scores are posted. The attached audit PDF contains the scoring details used in this review.

If you have any questions, please contact a member of the Handicap Committee.

Thank you,
Goodrich Men's Club Handicap Committee`;
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
      anchor.download = `${safeFileName(props.playerName)}-handicap-audit.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);

      const subject = "Goodrich Men's Club Competition Handicap Review";
      const body = buildEmailBody(props);

      try {
        await navigator.clipboard.writeText(body);
      } catch {
        // Gmail still receives the draft text if clipboard access is blocked.
      }

      const gmailUrl = new URL("https://mail.google.com/mail/");
      gmailUrl.searchParams.set("view", "cm");
      gmailUrl.searchParams.set("fs", "1");
      gmailUrl.searchParams.set("su", subject);
      gmailUrl.searchParams.set("body", body);
      if (draftWindow) {
        draftWindow.location.href = gmailUrl.toString();
      } else {
        window.location.href = gmailUrl.toString();
      }

      window.alert(
        "The player PDF was downloaded and the Gmail draft was prepared. Attach the downloaded PDF before sending."
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
      className="rounded-md border border-green-700 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800 transition-colors hover:bg-green-100 disabled:cursor-wait disabled:opacity-60"
      title="Download the player's PDF and open a Gmail draft"
    >
      {preparing ? "Preparing..." : "Prepare Email"}
    </button>
  );
}
