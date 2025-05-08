import { hexSuffix } from "$lib/utils";

export class Color {
  /** The primary color. */
  public readonly primary: string;
  /** The shadow color. */
  public readonly shadow: string;
  /** The color index. */
  public readonly index: number;
  /** The color name. */
  public readonly name: string;

  /** Create a new color for a given player index. */
  constructor(color: [string, string] | number, name = "Unknown") {
    if (typeof color === "number") {
      this.index = color;
      switch (color) {
        case 0:
          this.primary = "#f87171";
          this.shadow = "#c92828";
          this.name = "Red";
          break;
        case 1:
          this.primary = "#60a5fa";
          this.shadow = "#2563eb";
          this.name = "Blue";
          break;
        case 2:
          this.primary = "#22d65e";
          this.shadow = "#27b857";
          this.name = "Green";
          break;
        case 3:
          this.primary = "#fcd34d";
          this.shadow = "#d4b44a";
          this.name = "Yellow";
          break;
        case 4:
          this.primary = "#c460fa";
          this.shadow = "#a225eb";
          this.name = "Purple";
          break;
        case 5:
          this.primary = "#000000";
          this.shadow = "#333333";
          this.name = "Black";
          break;
        case 6:
          this.primary = "#fc2eff";
          this.shadow = "#d937db";
          this.name = "Pink";
          break;
        default:
          this.primary = "#a85325";
          this.shadow = "#914a24";
          this.name = "Brown";
          break;
      }
    } else {
      this.primary = color[0];
      this.shadow = color[1];
      this.index = -1;
      this.name = name;
    }
  }

  /** Gives the color opacity.
   *
   * @param f The opacity factor, from 0 to 1.
   * @returns A new color with the given opacity.
   */
  opacity(f: number) {
    return new Color(
      [this.primary + hexSuffix(f), this.shadow + hexSuffix(f)],
      this.name,
    );
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
