/**
 * The car: a 1995 Mustang GT convertible illustration, cut out of its white
 * background into two layers (public/art/, made by tools/cutout_car.py):
 * the ground shadow stays put while the car gently rides on its suspension,
 * and a soft light glint sweeps across the paint now and then (masked to the
 * car's shape). styles.css pauses this with the motion toggle and while an
 * app covers the home screen.
 */
export function MustangGraphic() {
  return (
    <div className="mustang" aria-hidden>
      <img className="mustang-shadow" src="/art/mustang-shadow.webp" alt="" draggable={false} />
      <div className="mustang-body">
        <img className="mustang-car" src="/art/mustang-car.webp" alt="" draggable={false} />
        <div className="mustang-glint" />
      </div>
    </div>
  );
}
