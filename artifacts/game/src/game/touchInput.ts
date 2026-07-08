// ─── Shared mobile touch-input state ───────────────────────────────────────
// The on-screen joystick lives inside <GameCanvas>, but the crouch/sprint
// buttons live in the HUD (a sibling component mounted only during the
// "play" phase). Rather than prop-drill callbacks between them, both sides
// read/write this tiny plain-object store, and GameCanvas's RAF loop polls
// it every frame alongside keyboard state.
export const touchInput = {
  interact: false,
  sprint: false,
  crouch: false,
};

export function setTouchInteract(active: boolean): void {
  touchInput.interact = active;
}

export function setTouchCrouch(active: boolean): void {
  touchInput.crouch = active;
}

export function toggleTouchSprint(): void {
  touchInput.sprint = !touchInput.sprint;
}

/**
 * Clear all touch input flags. Call this at match lifecycle boundaries
 * (GameCanvas mount/unmount) — since this store is a module-level
 * singleton rather than component state, a toggled sprint or a crouch
 * button released outside the component (e.g. HUD unmounting mid-press
 * when the phase changes) would otherwise leak into the next match.
 */
export function resetTouchInput(): void {
  touchInput.interact = false;
  touchInput.sprint = false;
  touchInput.crouch = false;
}
