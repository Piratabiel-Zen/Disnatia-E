import './cosmic-living-background.css';
import './performance-lite.css';
import './performance-smooth.css';

const BRIGHT_STARS = [
  ['8%','18%','4.8s','-1.2s','2px','#F7FBFF'],['17%','73%','7.1s','-4s','3px','#A9DCFF'],
  ['29%','37%','5.7s','-2s','2px','#C7B8FF'],['41%','11%','8.2s','-6s','3px','#E8F4FF'],
  ['54%','67%','6.3s','-3s','2px','#F7FBFF'],['63%','24%','4.9s','-2s','3px','#A9DCFF'],
  ['74%','82%','7.8s','-5s','2px','#C7B8FF'],['83%','43%','5.4s','-1s','3px','#E8F4FF'],
  ['91%','14%','8.7s','-7s','2px','#F7FBFF'],['96%','70%','6.8s','-3s','2px','#A9DCFF'],
];
const SHOOTING_STARS = [
  ['9%','22s','-7s','5vh','-4deg','150px','#EAF7FF'],
  ['37%','29s','-19s','-4vh','3deg','125px','#BFA8FF'],
  ['70%','35s','-11s','9vh','-2deg','165px','#7FE7FF'],
];

export default function CosmicLivingBackground({ variant = 'world', quality = 'light' }) {
  const gate = variant === 'gate';
  const immersive = quality === 'cinematic';

  return (
    <div className={`cosmic-living-bg cosmic-lite-bg cosmic-dark-bg ${gate ? 'gate' : ''} ${immersive ? 'is-immersive' : 'is-static'}`} aria-hidden="true">
      <div className="cosmic-dark-space" />
      <div className="cosmic-static-backdrop" />
      {immersive && <>
        <div className="cosmic-lite-nebula" />
        <div className="cosmic-lite-vortex" />
        <div className="cosmic-lite-stars cosmic-lite-stars-far" />
        <div className="cosmic-lite-stars cosmic-lite-stars-near" />
        <div className="cosmic-unified-starfield"><i/><i/></div>
        <div className="cosmic-bright-stars">
          {BRIGHT_STARS.map((star, index) => <i key={index} className="cosmic-bright-star" style={{'--star-left':star[0],'--star-top':star[1],'--star-duration':star[2],'--star-delay':star[3],'--star-size':star[4],'--star-color':star[5]}} />)}
        </div>
        <div className="cosmic-shooting-stars">
          {SHOOTING_STARS.map((meteor, index) => <i key={index} className="cosmic-shooting-star" style={{'--meteor-top':meteor[0],'--meteor-duration':meteor[1],'--meteor-delay':meteor[2],'--meteor-y':meteor[3],'--meteor-angle':meteor[4],'--meteor-length':meteor[5],'--meteor-color':meteor[6]}} />)}
        </div>
      </>}
      <div className="cosmic-living-vignette" />
    </div>
  );
}
