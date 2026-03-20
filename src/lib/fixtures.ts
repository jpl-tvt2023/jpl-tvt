// Fixture Generation Utilities
// Generates round-robin fixtures for TVT Fantasy Super League

interface TeamForFixture {
  id: string;
  name: string;
}

interface GeneratedFixture {
  homeTeamId: string;
  awayTeamId: string;
  gameweekNumber: number;
}

/**
 * Generate round-robin fixtures for a group of teams
 * Each team plays every other team twice (home and away) over the league stage
 * 
 * For 16 teams: 15 rounds × 2 = 30 gameweeks
 * Each round has 8 matches (16 teams / 2)
 */
export function generateRoundRobinFixtures(teams: TeamForFixture[]): GeneratedFixture[] {
  const n = teams.length;
  if (n < 2) return [];
  
  const fixtures: GeneratedFixture[] = [];
  
  // For round-robin, we need n-1 rounds if n is even
  // Using the "circle method" algorithm
  const teamIds = teams.map(t => t.id);
  
  // If odd number of teams, add a "bye" team
  if (n % 2 !== 0) {
    teamIds.push("BYE");
  }
  
  const totalTeams = teamIds.length;
  const rounds = totalTeams - 1;
  const matchesPerRound = totalTeams / 2;
  
  // First half of the season (each team plays every other team once)
  for (let round = 0; round < rounds; round++) {
    const gameweekNumber = round + 1;
    
    for (let match = 0; match < matchesPerRound; match++) {
      const home = (round + match) % (totalTeams - 1);
      let away = (totalTeams - 1 - match + round) % (totalTeams - 1);
      
      // Last team stays in place, others rotate
      if (match === 0) {
        away = totalTeams - 1;
      }
      
      const homeTeamId = teamIds[home];
      const awayTeamId = teamIds[away];
      
      // Skip "BYE" matches
      if (homeTeamId === "BYE" || awayTeamId === "BYE") {
        continue;
      }
      
      fixtures.push({
        homeTeamId,
        awayTeamId,
        gameweekNumber,
      });
    }
  }
  
  // Second half of the season (reverse fixtures)
  const firstHalfFixtures = [...fixtures];
  for (const fixture of firstHalfFixtures) {
    fixtures.push({
      homeTeamId: fixture.awayTeamId, // Swap home/away
      awayTeamId: fixture.homeTeamId,
      gameweekNumber: fixture.gameweekNumber + rounds, // Add to second half
    });
  }
  
  return fixtures;
}

/**
 * Generate all gameweeks for the season
 * GW1-30: League Stage
 * GW31-38: Playoffs
 */
export function generateGameweeks(): { number: number; isPlayoffs: boolean }[] {
  const gameweeks: { number: number; isPlayoffs: boolean }[] = [];
  
  // League Stage: GW1-30
  for (let i = 1; i <= 30; i++) {
    gameweeks.push({ number: i, isPlayoffs: false });
  }
  
  // Playoffs: GW31-38
  for (let i = 31; i <= 38; i++) {
    gameweeks.push({ number: i, isPlayoffs: true });
  }
  
  return gameweeks;
}

/**
 * Get chip set for a gameweek
 * Set 1: GW1-15
 * Set 2: GW16-30
 * Playoffs: GW31-38 (no chip sets, unlimited captaincy)
 */
export function getChipSet(gameweekNumber: number): "set1" | "set2" | "playoffs" {
  if (gameweekNumber <= 15) return "set1";
  if (gameweekNumber <= 30) return "set2";
  return "playoffs";
}

/**
 * Check if a gameweek is in the league stage
 */
export function isLeagueStage(gameweekNumber: number): boolean {
  return gameweekNumber >= 1 && gameweekNumber <= 30;
}

/**
 * Check if a gameweek is in the playoffs
 */
export function isPlayoffs(gameweekNumber: number): boolean {
  return gameweekNumber >= 31 && gameweekNumber <= 38;
}
