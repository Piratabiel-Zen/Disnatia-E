import {abilityType} from '../adventure/abilityPresentation.mjs';
import './ability-type-badge.css';
export default function AbilityTypeBadge({ability, fallback='normal'}) {
 const type = abilityType(ability, fallback);
 return <span className={'ability-type-badge ability-type-'+type} data-ability-type={type}><span aria-hidden="true">{type==='passiva'?'\u25C7':type==='especial'?'\u2726':'\u25C6'}</span><b>{type==='passiva'?'Passiva':type==='especial'?'Especial':'Normal'}</b></span>;
}
