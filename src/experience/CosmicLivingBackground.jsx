import './cosmic-living-background.css';
import './performance-lite.css';

const BRIGHT_STAR_COUNT = 16;
const SHOOTING_STAR_COUNT = 7;
const STAR_COLORS = ['#F7FBFF', '#A9DCFF', '#C7B8FF', '#E8F4FF'];

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const starRandom = seededRandom(0xD1A57A);
const meteorRandom = seededRandom(0xC05A1C);

const BRIGHT_STARS = Array.from({ length: BRIGHT_STAR_COUNT }, (_, index) => ({
  id: index,
  left: `${4 + starRandom() * 92}%`,
  top: `${5 + starRandom() * 88}%`,
  duration: `${(3.8 + starRandom() * 5.8).toFixed(2)}s`,
  delay: `${-(starRandom() * 8).toFixed(2)}s`,
  size: `${(2 + starRandom() * 2.2).toFixed(2)}px`,
  color: STAR_COLORS[index % STAR_COLORS.length],
}));

const SHOOTING_STARS = Array.from({ length: SHOOTING_STAR_COUNT }, (_, index) => {
  const duration = 13 + meteorRandom() * 13;
  return {
    id: index,
    top: `${4 + meteorRandom() * 82}%`,
    duration: `${duration.toFixed(2)}s`,
    delay: `${-(meteorRandom() * duration).toFixed(2)}s`,
    travelY: `${(-8 + meteorRandom() * 22).toFixed(1)}vh`,
    angle: `${(-5 + meteorRandom() * 10).toFixed(1)}deg`,
    length: `${90 + Math.round(meteorRandom() * 85)}px`,
  };
});

export default function CosmicLivingBackground({ variant = 'world' }) {
  const gate = variant === 'gate';

  return (
    <div className={`cosmic-living-bg cosmic-lite-bg cosmic-dark-bg ${gate ? 'gate' : ''}`} aria-hidden="true">
      <div className="cosmic-dark-space" />
      <div className="cosmic-lite-nebula" />
      <div className="cosmic-lite-vortex" />
      <div className="cosmic-lite-stars cosmic-lite-stars-far" />
      <div className="cosmic-lite-stars cosmic-lite-stars-near" />
      <div className="cosmic-bright-stars">
        {BRIGHT_STARS.map(star => (
          <i
            key={star.id}
            className="cosmic-bright-star"
            style={{
              '--star-left': star.left,
              '--star-top': star.top,
              '--star-duration': star.duration,
              '--star-delay': star.delay,
              '--star-size': star.size,
              '--star-color': star.color,
            }}
          />
        ))}
      </div>
      <div className="cosmic-shooting-stars">
        {SHOOTING_STARS.map(meteor => (
          <i
            key={meteor.id}
            className="cosmic-shooting-star"
            style={{
              '--meteor-top': meteor.top,
              '--meteor-duration': meteor.duration,
              '--meteor-delay': meteor.delay,
              '--meteor-y': meteor.travelY,
              '--meteor-angle': meteor.angle,
              '--meteor-length': meteor.length,
            }}
          />
        ))}
      </div>
      <div className="cosmic-living-vignette" />
    </div>
  );
}
