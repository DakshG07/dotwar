/**
 * An animatable value, which smoothly inerpolates between set values using the provided interpolation function.
 */
export class Animator<T> {
  /**
   * The interpolation curve.
   * Changing this during runtime may cause unexpected results.
   */
  curve: (a: T, b: T, t: number) => T;

  /** Current Animator position. */
  private _current: T;
  /** Previous Animator position. */
  private _prev: T;
  /** Target Animator position. */
  private _target: T;
  /** Duration of the current animation. */
  private _duration: number;
  /** Elapsed time of the current animation. */
  private _elapsed: number;
  /**
   * Whether the animation is finished or not.
   * Essentially stored so we don't need to keep checking the duration manually.
   */
  private _finished: boolean;
  /** All enabled animators. */
  private static animators: Animator<any>[] = [];

  /**
   * Creates an Animator instance.
   * @param initial - The initial value.
   * @param curve - The function to interpolate between current and target values.
   *   - `a` - The initial value.
   *   - `b` - The target value.
   *   - `t` - The interpolation progress (from 0-1).
   */
  constructor(initial: T, curve: (a: T, b: T, t: number) => T) {
    this._target = initial;
    this._current = initial;
    this._prev = initial;
    this._duration = 0;
    this._elapsed = 0;
    this._finished = true;
    this.curve = curve;
    this.enable();
  }

  /** Animate to the new target value.
   * @param newTarget The target to animate to.
   * @param time The time of the animation in milliseconds.
   */
  animateTo(newTarget: T, time: number) {
    this._finished = false;
    this._prev = this._current;
    this._target = newTarget;
    this._duration = time;
    this._elapsed = 0;
  }

  /** Get the target value. */
  get target(): T {
    return this._target;
  }

  /** Get the current interpolated value. */
  get value(): T {
    return this._current;
  }

  /**
   * Update the current value.
   * @param deltaTime - The time elapsed since the last update in milliseconds.
   */
  update(deltaTime: number) {
    if (this._finished || this._elapsed + deltaTime >= this._duration) {
      this._current = this._target;
      this._finished = true;
      return;
    }
    const progress = Math.min(1, (this._elapsed + deltaTime) / this._duration);
    this._current = this.curve(this._prev, this._target, progress);
    this._elapsed += deltaTime;
  }

  /** Disables an Animator, removing it from the list of animators to update. */
  disable() {
    Animator.animators = Animator.animators.filter(
      (animator) => animator !== this,
    );
  }

  /** Enables an Animator, re-adding it to the list of animators to update. */
  enable() {
    Animator.animators.push(this);
  }

  /** Updates all enabled animators. */
  static updateAll(deltaTime: number) {
    Animator.animators.forEach((animator) => animator.update(deltaTime));
  }
}
