const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const SUITS = ['s', 'h', 'd', 'c']; // Spades, Hearts, Diamonds, Clubs

export function generateComboMatrix(): string[][] {
  const matrix: string[][] = [];
  for (let r = 0; r < 13; r++) {
    const row: string[] = [];
    for (let c = 0; c < 13; c++) {
      if (r < c) {
        // Suited above diagonal
        row.push(RANKS[r] + RANKS[c] + 's');
      } else if (r > c) {
        // Offsuit below diagonal
        row.push(RANKS[c] + RANKS[r] + 'o');
      } else {
        // Pairs on diagonal
        row.push(RANKS[r] + RANKS[c]);
      }
    }
    matrix.push(row);
  }
  return matrix;
}

// Check if a combo is a pair, suited, or offsuit
export function getComboType(combo: string): 'pair' | 'suited' | 'offsuit' {
  if (combo.length === 2) return 'pair';
  if (combo.endsWith('s')) return 'suited';
  return 'offsuit';
}

/**
 * Parses standard preflop poker notation (e.g., "88+, AQs+, KJo+, JTs")
 * and returns a list of hand combos matching that notation.
 */
export function parseRangeNotation(text: string): string[] {
  if (!text || !text.trim()) return [];
  
  const combos: string[] = [];
  const tokens = text.replace(/\s+/g, '').split(',');

  for (const token of tokens) {
    if (!token) continue;

    // Pairs: "88+" or "88-TT" or "88"
    if (token.match(/^([2-9TJQKA])\1$/)) {
      combos.push(token);
    } else if (token.match(/^([2-9TJQKA])\1\+$/)) {
      const rank = token[0];
      const rankIdx = RANKS.indexOf(rank);
      for (let i = 0; i <= rankIdx; i++) {
        combos.push(RANKS[i] + RANKS[i]);
      }
    } else if (token.match(/^([2-9TJQKA])\1-([2-9TJQKA])\2$/)) {
      const r1 = token[0];
      const r2 = token[2];
      const idx1 = RANKS.indexOf(r1);
      const idx2 = RANKS.indexOf(r2);
      const startIdx = Math.max(idx1, idx2);
      const endIdx = Math.min(idx1, idx2);
      for (let i = endIdx; i <= startIdx; i++) {
        combos.push(RANKS[i] + RANKS[i]);
      }
    }
    
    // Suited: "AQs+", "KQs", "QJs-KTs" etc.
    else if (token.match(/^([2-9TJQKA])([2-9TJQKA])s$/)) {
      const r1 = token[0];
      const r2 = token[1];
      combos.push(r1 + r2 + 's');
    } else if (token.match(/^([2-9TJQKA])([2-9TJQKA])s\+$/)) {
      const r1 = token[0];
      const r2 = token[1];
      const r1Idx = RANKS.indexOf(r1);
      const r2Idx = RANKS.indexOf(r2);
      
      // Usually Rank 1 > Rank 2 (e.g., AQs means A is r1, Q is r2).
      // "+" means Rank 2 increases up to just below Rank 1.
      for (let i = r1Idx + 1; i <= r2Idx; i++) {
        combos.push(r1 + RANKS[i] + 's');
      }
    } else if (token.match(/^([2-9TJQKA])([2-9TJQKA])s-([2-9TJQKA])([2-9TJQKA])s$/)) {
      const r1 = token[0];
      const r2 = token[1];
      const r3 = token[3];
      const r4 = token[4];
      if (r1 === r3) {
        const r1Idx = RANKS.indexOf(r1);
        const r2Idx = RANKS.indexOf(r2);
        const r4Idx = RANKS.indexOf(r4);
        const start = Math.max(r2Idx, r4Idx);
        const end = Math.min(r2Idx, r4Idx);
        for (let i = end; i <= start; i++) {
          combos.push(r1 + RANKS[i] + 's');
        }
      } else {
        // Just single push of endpoints if complex
        combos.push(r1 + r2 + 's');
        combos.push(r3 + r4 + 's');
      }
    }

    // Offsuit: "AQo+", "KQo", "KJo-T9o"
    else if (token.match(/^([2-9TJQKA])([2-9TJQKA])o$/)) {
      const r1 = token[0];
      const r2 = token[1];
      combos.push(r1 + r2 + 'o');
    } else if (token.match(/^([2-9TJQKA])([2-9TJQKA])o\+$/)) {
      const r1 = token[0];
      const r2 = token[1];
      const r1Idx = RANKS.indexOf(r1);
      const r2Idx = RANKS.indexOf(r2);
      for (let i = r1Idx + 1; i <= r2Idx; i++) {
        combos.push(r1 + RANKS[i] + 'o');
      }
    } else if (token.match(/^([2-9TJQKA])([2-9TJQKA])o-([2-9TJQKA])([2-9TJQKA])o$/)) {
      const r1 = token[0];
      const r2 = token[1];
      const r3 = token[3];
      const r4 = token[4];
      if (r1 === r3) {
        const r1Idx = RANKS.indexOf(r1);
        const r2Idx = RANKS.indexOf(r2);
        const r4Idx = RANKS.indexOf(r4);
        const start = Math.max(r2Idx, r4Idx);
        const end = Math.min(r2Idx, r4Idx);
        for (let i = end; i <= start; i++) {
          combos.push(r1 + RANKS[i] + 'o');
        }
      } else {
        combos.push(r1 + r2 + 'o');
        combos.push(r3 + r4 + 'o');
      }
    }

    // Simple hands like "AK", "AQ" -> converts to both suited and offsuit
    else if (token.match(/^([2-9TJQKA])([2-9TJQKA])$/) && token[0] !== token[1]) {
      const r1 = token[0];
      const r2 = token[1];
      combos.push(r1 + r2 + 's');
      combos.push(r1 + r2 + 'o');
    }
  }

  return Array.from(new Set(combos));
}

/**
 * Summarizes a list of combos back into a clean standard poker notation
 * e.g. ["AA", "KK", "AKs", "AQs"] -> "KK+, AQs+"
 */
export function generateRangeNotation(activeCombos: string[]): string {
  if (activeCombos.length === 0) return 'Empty';
  if (activeCombos.length === 169) return '100% (Any two cards)';

  const activeSet = new Set(activeCombos);
  const pairs: string[] = [];
  const suited: { [rank1: string]: string[] } = {};
  const offsuit: { [rank1: string]: string[] } = {};

  for (const combo of activeCombos) {
    if (getComboType(combo) === 'pair') {
      pairs.push(combo);
    } else if (getComboType(combo) === 'suited') {
      const r1 = combo[0];
      const r2 = combo[1];
      if (!suited[r1]) suited[r1] = [];
      suited[r1].push(r2);
    } else {
      const r1 = combo[0];
      const r2 = combo[1];
      if (!offsuit[r1]) offsuit[r1] = [];
      offsuit[r1].push(r2);
    }
  }

  const resultParts: string[] = [];

  // 1. Process Pairs
  if (pairs.length > 0) {
    // Sort pairs descending AA, KK, QQ, JJ...
    pairs.sort((a, b) => RANKS.indexOf(a[0]) - RANKS.indexOf(b[0]));
    
    let tempGroup: string[] = [];
    const groups: string[][] = [];

    for (let i = 0; i < pairs.length; i++) {
      if (tempGroup.length === 0) {
        tempGroup.push(pairs[i]);
      } else {
        const lastRankIdx = RANKS.indexOf(tempGroup[tempGroup.length - 1][0]);
        const currentRankIdx = RANKS.indexOf(pairs[i][0]);
        if (currentRankIdx === lastRankIdx + 1) {
          tempGroup.push(pairs[i]);
        } else {
          groups.push(tempGroup);
          tempGroup = [pairs[i]];
        }
      }
    }
    if (tempGroup.length > 0) groups.push(tempGroup);

    for (const group of groups) {
      if (group.length === 1) {
        resultParts.push(group[0]);
      } else {
        const topPair = group[0];
        const bottomPair = group[group.length - 1];
        
        // If it goes all the way to AA
        if (RANKS.indexOf(topPair[0]) === 0) {
          resultParts.push(`${bottomPair}+`);
        } else {
          resultParts.push(`${bottomPair}-${topPair}`);
        }
      }
    }
  }

  // Helper to process suited/offsuit groups
  const processNonPairs = (
    data: { [rank1: string]: string[] },
    suffix: 's' | 'o'
  ) => {
    // Sort keys descending (A, K, Q...)
    const keys = Object.keys(data).sort((a, b) => RANKS.indexOf(a) - RANKS.indexOf(b));
    
    for (const r1 of keys) {
      const secondRanks = data[r1];
      // Sort second ranks descending
      secondRanks.sort((a, b) => RANKS.indexOf(a) - RANKS.indexOf(b));
      
      let tempGroup: string[] = [];
      const groups: string[][] = [];

      for (let i = 0; i < secondRanks.length; i++) {
        if (tempGroup.length === 0) {
          tempGroup.push(secondRanks[i]);
        } else {
          const lastRankIdx = RANKS.indexOf(tempGroup[tempGroup.length - 1]);
          const currentRankIdx = RANKS.indexOf(secondRanks[i]);
          if (currentRankIdx === lastRankIdx + 1) {
            tempGroup.push(secondRanks[i]);
          } else {
            groups.push(tempGroup);
            tempGroup = [secondRanks[i]];
          }
        }
      }
      if (tempGroup.length > 0) groups.push(tempGroup);

      for (const group of groups) {
        if (group.length === 1) {
          resultParts.push(`${r1}${group[0]}${suffix}`);
        } else {
          const topRank = group[0];
          const bottomRank = group[group.length - 1];
          const topRankIdx = RANKS.indexOf(topRank);
          const r1Idx = RANKS.indexOf(r1);

          // If the group goes up to the highest possible card (just below r1, e.g. AKs, AQs, AJs)
          if (topRankIdx === r1Idx + 1) {
            resultParts.push(`${r1}${bottomRank}${suffix}+`);
          } else {
            resultParts.push(`${r1}${bottomRank}${suffix}-${r1}${topRank}${suffix}`);
          }
        }
      }
    }
  };

  processNonPairs(suited, 's');
  processNonPairs(offsuit, 'o');

  return resultParts.join(', ');
}

/**
 * Draws a random individual matchup (52-card deck) for training
 */
export function drawRandomHand(filterCombos?: string[]): {
  hand: string;
  combo: string;
  suits: string[];
} {
  const allCards: { rank: string; suit: string }[] = [];
  for (const r of RANKS) {
    for (const s of SUITS) {
      allCards.push({ rank: r, suit: s });
    }
  }

  // Draw 2 cards. If filterCombos is provided, try drawing until we get a card combo
  // that exists in the filter list (limit 500 attempts to avoid infinite loops, fallback to any random).
  let attempts = 0;
  while (attempts < 500) {
    attempts++;
    const idx1 = Math.floor(Math.random() * 52);
    let idx2 = Math.floor(Math.random() * 52);
    while (idx1 === idx2) {
      idx2 = Math.floor(Math.random() * 52);
    }

    const c1 = allCards[idx1];
    const c2 = allCards[idx2];

    const r1Idx = RANKS.indexOf(c1.rank);
    const r2Idx = RANKS.indexOf(c2.rank);

    let high = c1;
    let low = c2;

    if (r1Idx > r2Idx) {
      high = c2;
      low = c1;
    }

    let combo = '';
    if (high.rank === low.rank) {
      combo = high.rank + low.rank;
    } else {
      combo = high.rank + low.rank + (high.suit === low.suit ? 's' : 'o');
    }

    if (!filterCombos || filterCombos.length === 0 || filterCombos.includes(combo)) {
      const suitsMap: { [key: string]: string } = {
        s: '♠',
        h: '♥',
        d: '♦',
        c: '♣',
      };
      
      const handStr = `${high.rank}${suitsMap[high.suit]} ${low.rank}${suitsMap[low.suit]}`;
      return {
        hand: handStr,
        combo,
        suits: [high.suit, low.suit],
      };
    }
  }

  // Fallback
  return drawRandomHand();
}
