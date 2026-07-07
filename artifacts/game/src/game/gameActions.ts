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
  submitSkipDiscussion as _submitSkipDiscussion,
  onMiniGameTap as _tap,
  onMiniGameDigitTap as _digit,
  onMiniGameChoice as _choice,
  onMiniGameTaxiTap as _taxiTap,
  onMiniGameWireSource as _wireSource,
  onMiniGameWireSocket as _wireSocket,
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

export function submitSkipDiscussion(voterId: string): void {
  if (activeNetwork) {
    activeNetwork.sendAction('skip_discussion', { voterId });
    _submitSkipDiscussion(voterId);
  } else {
    _submitSkipDiscussion(voterId);
  }
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

export function onMiniGameChoice(index: number): void {
  if (activeNetwork) {
    activeNetwork.sendAction('minigame_choice', { index });
    _choice(index);
  } else {
    _choice(index);
  }
}

export function onMiniGameTaxiTap(): void {
  if (activeNetwork) {
    activeNetwork.sendAction('minigame_taxi_tap');
    _taxiTap();
  } else {
    _taxiTap();
  }
}

export function onMiniGameWireSource(colorIndex: number): void {
  if (activeNetwork) {
    activeNetwork.sendAction('minigame_wire_source', { colorIndex });
    _wireSource(colorIndex);
  } else {
    _wireSource(colorIndex);
  }
}

export function onMiniGameWireSocket(socketPos: number): void {
  if (activeNetwork) {
    activeNetwork.sendAction('minigame_wire_socket', { socketPos });
    _wireSocket(socketPos);
  } else {
    _wireSocket(socketPos);
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
