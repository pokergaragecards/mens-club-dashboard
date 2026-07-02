export async function getPlayerSummary(playerId: string)

export async function getPlayerRoundHistory(
    playerId: string,
    limit = 20
)

export async function getPlayerHoleStats(
    playerId: string,
    options?: {
        startDate?: string
        endDate?: string
        teeName?: string
    }
)

export async function getPlayerScoringBreakdown(
    playerId: string
)

export async function getPlayerHandicapTrend(
    playerId: string
)

export async function getPlayerBestHoles(
    playerId: string
)

export async function getPlayerWorstHoles(
    playerId: string
)