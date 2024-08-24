export type KeyType = {
  content: string; // A-Z、Enter、BackSpace
  state: string; // ""/picked/attempted/corrct
  isFunctionKey: boolean;
};

export type PanelData = {
  numOfPlayedGames: number;
  numOfWinGames: number;
  numOfCurrentStreak: number;
  numOfMaxStreak: number;
  latestWinRow: number;
  winRecordOfRows: number[];
};
