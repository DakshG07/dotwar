/* EASING */
export function easeOutExpo(a: number, b: number, t: number): number {
  let lerp = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  return a * (1 - lerp) + b * lerp;
}

/* POINTS */
/**
 * Rotates a point clockwise theta radians around a center point.
 *
 * @param point - The point to rotate.
 * @param center - The center point around which to rotate.
 * @param theta - The angle in radians to rotate the point.
 * @returns The rotated point.
 */
export function rotPoint<T extends { x: number; y: number }>(
  point: T,
  center: { x: number; y: number },
  theta: number,
): T {
  const dx = point.x - center.x;
  const dy = point.y - center.y;

  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  const xRotated = dx * cos + dy * sin;
  const yRotated = -dx * sin + dy * cos;

  return {
    ...point,
    x: center.x + xRotated,
    y: center.y + yRotated,
  };
}

/* OTHER */
/**
 * Convert an opacity into a suffix to add to the end of an RGBA hex string.
 *
 * @param opacity - The opacity value to convert.
 */
export function hexSuffix(opacity: number): string {
  const hexOpacity = Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hexOpacity}`;
}
