/**
 * Thin wrapper around game logic functions.
 * In single-player: calls logic functions directly.
 * In multiplayer: sends WS messages so the server applies the action.
 *
 * Call `setActiveNetwork(net)` when multiplayer starts,
 * `setActiveNetwork(null)` when it ends.
 */

import {
  submitVote as _submitVote,
  onMiniGameTap as _tap,
  onMiniGameDigitTap as _digit,
  cancelMiniGame as _cancel,
  triggerEmote as _emote,
} from './logic';

interface NetworkProxy {
  sendVote(targetId: string | null): void;
  sendAction(action: string, payload?: Record<string, unknown>): void;
}

let activeNetwork: NetworkProxy | null = null;

export function setActiveNetwork(net: NetworkProxy | null): void {
  activeNetwork = net;
}

export function submitVote(voterId: string, targetId: string | null): void {
  if (activeNetwork) {
    activeNetwork.sendVote(targetId);
  } else {
    _submitVote(voterId, targetId);
  }
}

export function onMiniGameTap(): void {
  if (activeNetwork) {
    activeNetwork.sendAction('minigame_tap');
    _tap(); // also run locally for immediate UI feedback
  } else {
    _tap();
  }
}

export function onMiniGameDigitTap(digit: number): void {
  if (activeNetwork) {
    activeNetwork.sendAction('minigame_digit', { digit });
    _digit(digit);
  } else {
    _digit(digit);
  }
}

export function cancelMiniGame(): void {
  if (activeNetwork) {
    activeNetwork.sendAction('minigame_cancel');
  } else {
    _cancel();
  }
}

export function triggerEmote(playerId: string, emote: string): void {
  if (activeNetwork) {
    activeNetwork.sendAction('emote', { emote });
    // local emote still fires so the player sees their own immediately
  }
  _emote(playerId, emote);
}
