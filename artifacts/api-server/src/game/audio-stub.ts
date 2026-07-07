// Server-side audio stub — Web Audio API is browser-only.
// All methods are deliberate no-ops so game logic runs safely in Node.js.

const audioStub = {
  init() {},
  play(_name: string) {},
  startGurgle() {},
  stopGurgle() {},
};

export const audio = audioStub;
export type SoundName = string;
