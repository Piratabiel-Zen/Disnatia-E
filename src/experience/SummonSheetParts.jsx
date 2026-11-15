// Peças visuais das invocações, na mesma linguagem da ficha de personagem:
// atributos em trilha de pontos com bônus, habilidades em linha com selo de
// tipo, dano e custo. Usadas na ficha do necromante e na mini ficha do mapa,
// para que a criatura tenha a mesma cara nos dois lugares.
import { ATTRS } from '../data/gameData';
import AbilityTypeBadge from './AbilityTypeBadge';
import './summon-sheet-parts.css';

const attrBonus = value => Math.floor((Number(value) || 0) / 2);
const DOTS = 16;

export function SummonAttrRows({ source = {}, onChange, compact = false }) {
  const editable = typeof onChange === 'function';
  return (
    <div className={`summon-attr-rows${compact ? ' is-compact' : ''}`}>
      {ATTRS.map(attr => {
        const value = Math.max(0, Number(source[attr.key] || 0));
        const bonus = attrBonus(value);
        return (
          <div key={attr.key} className="summon-attr-row" style={{ '--attr-color': attr.color }}>
            <span className="summon-attr-label">{attr.label}</span>
            <div className="summon-attr-dots" role={editable ? 'group' : 'img'} aria-label={`${attr.label}: ${value}`}>
              {Array.from({ length: DOTS }).map((_, index) => {
                const filled = index < value;
                if (!editable) return <i key={index} className={filled ? 'is-on' : ''} />;
                return (
                  <button
                    key={index}
                    type="button"
                    className={filled ? 'is-on' : ''}
                    aria-label={`${attr.label} ${index + 1}`}
                    onClick={() => onChange(attr.key, filled ? (index === value - 1 ? index : index + 1) : index + 1)}
                  />
                );
              })}
            </div>
            <span className="summon-attr-value">{value}</span>
            <span className={`summon-attr-bonus${bonus > 0 ? ' has-bonus' : ''}`}>{bonus > 0 ? `+${bonus}` : '—'}</span>
          </div>
        );
      })}
      {!compact && <div className="summon-attr-note">a cada 2 pontos = +1 bônus</div>}
    </div>
  );
}

export function SummonAbilityRow({ action, color = '#A855F7', disabled = false, onUse, useLabel = 'Usar', children }) {
  const type = action.tipoHab || 'normal';
  const cost = Math.max(0, Math.min(3, Number(action.custo ?? 1)));
  const passive = type === 'passiva';
  return (
    <article className={`summon-ability-row ability-row type-${type}`} data-ability-tier={type} style={{ '--ability-color': color }}>
      <div className="summon-ability-main">
        <div className="summon-ability-title">
          {type !== 'normal' && <span className="summon-ability-spark" aria-hidden="true">✦</span>}
          <b>{action.nome || action.name || 'Habilidade'}</b>
          <AbilityTypeBadge ability={action} fallback={type} />
          {action.dano && <span className="summon-ability-damage">⚔ {action.dano}</span>}
        </div>
        {(action.desc || action.descricao) && <p>{action.desc || action.descricao}</p>}
      </div>
      <div className="summon-ability-side">
        {!passive && <span className="summon-ability-cost">{cost} VC</span>}
        {!passive && onUse && (
          <button type="button" className="ability-use-button" data-ability-tier={type} disabled={disabled} onClick={onUse}>
            ⚡ {useLabel}
          </button>
        )}
        {children}
      </div>
    </article>
  );
}
