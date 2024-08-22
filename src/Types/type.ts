export type KeyType = {
  content: string; // A-Z、Enter、BackSpace
  state: string; // ""/picked/attempted/corrct
  isFunctionKey: boolean;
};
