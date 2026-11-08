import mustangSvg from "../assets/mustang.svg?raw";

/**
 * The car: a stylized 1995 Mustang GT convertible (src/assets/mustang.svg),
 * inlined so its parts can animate: wheels turn, the body rides on its
 * suspension, the soft top flutters, wind streams off the windshield and the
 * road slides past. The animations live in the SVG; styles.css pauses them
 * when an app covers the home screen or "Moving background" is off.
 */
export function MustangGraphic() {
  return <div className="mustang" aria-hidden dangerouslySetInnerHTML={{ __html: mustangSvg }} />;
}
