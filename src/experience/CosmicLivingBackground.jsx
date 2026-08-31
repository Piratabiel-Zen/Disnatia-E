import './cosmic-living-background.css';
import './performance-lite.css';

export default function CosmicLivingBackground({ variant = 'world' }) {
  const gate = variant === 'gate';

  return (
    <div className={`cosmic-living-bg cosmic-lite-bg ${gate ? 'gate' : ''}`} aria-hidden="true">
      <div className="cosmic-lite-nebula" />
      <div className="cosmic-lite-stars" />
      {!gate && <div className="cosmic-lite-water" />}
      <div className="cosmic-living-vignette" />
      {!gate && <>
        <div className="cosmic-side-rail cosmic-side-rail-left"><i/><i/><i/></div>
        <div className="cosmic-side-rail cosmic-side-rail-right"><i/><i/><i/></div>
      </>}
    </div>
  );
}
