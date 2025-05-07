import { hexSuffix } from "$lib/utils";

export class Color {
  /** The primary color. */
  public readonly primary: string;
  /** The shadow color. */
  public readonly shadow: string;
  /** The color index. */
  public readonly index: number;

  /** Create a new color for a given player index. */
  constructor(color: [string, string] | number) {
    if (typeof color === "number") {
      this.index = color;
      switch (color) {
        case 0: // red
          this.primary = "#f87171";
          this.shadow = "#c92828";
          break;
        case 1: // blue
          this.primary = "#60a5fa";
          this.shadow = "#2563eb";
          break;
        case 2: // green
          this.primary = "#22d65e";
          this.shadow = "#27b857";
          break;
        case 3: // yellow
          this.primary = "#fcd34d";
          this.shadow = "#d4b44a";
          break;
        case 4: // purple
          this.primary = "#c460fa";
          this.shadow = "#a225eb";
          break;
        case 5: // brown
          this.primary = "#a85325";
          this.shadow = "#914a24";
          break;
        case 6: // pink
          this.primary = "#fc2eff";
          this.shadow = "#d937db";
          break;
        default:
          this.primary = "#000000";
          this.shadow = "#333333";
          break;
      }
    } else {
      this.primary = color[0];
      this.shadow = color[1];
      this.index = -1;
    }
  }

  /** Gives the color opacity.
   *
   * @param f The opacity factor, from 0 to 1.
   * @returns A new color with the given opacity.
   */
  opacity(f: number) {
    return new Color([this.primary + hexSuffix(f), this.shadow + hexSuffix(f)]);
  }
}

export class Player {
  public score: number;
  public active: number;
  public color: Color;

  /** Construct a new player.
   *
   * @param index The player index.
   * @param score The player score.
   * @param active The player's active status.
   */
  constructor(index: number, score: number, active: number) {
    this.score = score;
    this.active = active;
    this.color = new Color(index);
  }
}
