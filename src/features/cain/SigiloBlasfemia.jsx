/**
 * SIGILOS DAS BLASFÊMIAS
 *
 * Uma marca por blasfêmia, desenhada aqui — a arte do livro não é nossa para
 * copiar. Cada uma é um diagrama do que o poder faz, não um desenho da cena:
 * traço fino, geometria, no máximo um ponto cheio. Tudo em currentColor, para
 * que a marca herde a cor do cartão em qualquer tema da mesa.
 */

const TRACO = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.3,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

/* Cada entrada devolve só o conteúdo do <svg>: o invólucro é comum. */
const DESENHOS = {
  /* Tensão: um plano reto de força, com um corte limpo atravessando. */
  tensao: (
    <>
      <path d="M8 24h48M8 40h48" {...TRACO} />
      <path d="M32 6v52" {...TRACO} strokeDasharray="3 4" />
      <path d="M22 32h20" {...TRACO} />
      <circle cx="32" cy="32" r="3.2" fill="currentColor" stroke="none" />
    </>
  ),
  /* Ardência: o feixe sai de um ponto e atravessa tudo o que está no caminho. */
  ardencia: (
    <>
      <circle cx="18" cy="32" r="6" {...TRACO} />
      <path d="M24 32h34" {...TRACO} />
      <path d="M38 22v20M48 25v14" {...TRACO} />
      <path d="M18 14v6M18 44v6M8 32H2" {...TRACO} opacity=".55" />
    </>
  ),
  /* Fluxo: a espiral do tempo com o retorno marcado contra a corrente. */
  fluxo: (
    <>
      <path d="M32 10a22 22 0 1 1-15.6 37.6" {...TRACO} />
      <path d="M22 44l-5.6 3.6L20 53" {...TRACO} />
      <path d="M32 20a12 12 0 1 0 8.5 20.5" {...TRACO} opacity=".6" />
      <circle cx="32" cy="32" r="2.4" fill="currentColor" stroke="none" />
    </>
  ),
  /* Vetor: velocidade emprestada — a flecha sai do anel e o freio fica atrás. */
  vetor: (
    <>
      <circle cx="20" cy="32" r="9" {...TRACO} />
      <path d="M29 32h26l-7-6M55 32l-7 6" {...TRACO} />
      <path d="M8 26l5 6-5 6" {...TRACO} opacity=".55" />
    </>
  ),
  /* Portão: dois lugares lado a lado, costurados por uma fenda. */
  portao: (
    <>
      <rect x="7" y="13" width="20" height="38" rx="2" {...TRACO} />
      <rect x="37" y="13" width="20" height="38" rx="2" {...TRACO} />
      <path d="M27 32h10" {...TRACO} strokeDasharray="2 3" />
      <path d="M32 18v-6M32 52v6" {...TRACO} opacity=".5" />
    </>
  ),
  /* Sufoco: a coisa perde o que tinha de próprio e se desfaz em pontos. */
  sufoco: (
    <>
      <path d="M12 14h40v36H12z" {...TRACO} strokeDasharray="7 5" />
      <circle cx="26" cy="28" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="38" cy="26" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="32" cy="38" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="43" cy="37" r="1.6" fill="currentColor" stroke="none" opacity=".6" />
      <circle cx="21" cy="38" r="1.6" fill="currentColor" stroke="none" opacity=".6" />
    </>
  ),
  /* Sussurro: a sombra à parte, que vai onde você vai e sabe mais. */
  sussurro: (
    <>
      <path d="M24 20a6 6 0 1 1 12 0 6 6 0 0 1-12 0M20 54v-14a10 10 0 0 1 20 0v14" {...TRACO} />
      <path d="M44 54V38a10 10 0 0 0-6-9.2" {...TRACO} strokeDasharray="3 3" opacity=".75" />
      <circle cx="47" cy="19" r="4" {...TRACO} strokeDasharray="2 3" opacity=".75" />
    </>
  ),
  /* Edit: a grade da realidade com uma célula trocada por outra. */
  edit: (
    <>
      <path d="M10 10h44v44H10z" {...TRACO} />
      <path d="M10 25h44M10 39h44M25 10v44M39 10v44" {...TRACO} opacity=".45" />
      <path d="M25 25h14v14H25z" fill="currentColor" stroke="none" opacity=".85" />
      <path d="M43 18l8-8" {...TRACO} />
    </>
  ),
  /* Vínculo: o que está preso a você, e a coleira que o prende. */
  vinculo: (
    <>
      <circle cx="19" cy="32" r="8" {...TRACO} />
      <circle cx="45" cy="32" r="8" {...TRACO} strokeDasharray="3 3" />
      <path d="M27 32h10" {...TRACO} />
      <path d="M19 24v-9M45 40v9" {...TRACO} opacity=".55" />
      <circle cx="19" cy="32" r="2.2" fill="currentColor" stroke="none" />
    </>
  ),
  /* Palácio: a casa que existe por dentro, e o tulpa que mora nela. */
  palacio: (
    <>
      <circle cx="32" cy="32" r="23" {...TRACO} opacity=".5" />
      <path d="M18 34l14-12 14 12v16H18z" {...TRACO} />
      <path d="M28 50V40h8v10" {...TRACO} />
      <circle cx="32" cy="29" r="2" fill="currentColor" stroke="none" />
    </>
  ),
  /* Assombração: o fio cortado, e o que continua depois do corte. */
  assombracao: (
    <>
      <path d="M8 32h18" {...TRACO} />
      <path d="M38 32h18" {...TRACO} strokeDasharray="3 4" />
      <path d="M26 22l12 20M38 22L26 42" {...TRACO} />
      <circle cx="32" cy="32" r="2.4" fill="currentColor" stroke="none" />
    </>
  ),
  /* Simpatia: ressonância — o toque que faz o objeto responder em círculos. */
  simpatia: (
    <>
      <circle cx="40" cy="32" r="6" {...TRACO} />
      <circle cx="40" cy="32" r="13" {...TRACO} opacity=".65" />
      <circle cx="40" cy="32" r="20" {...TRACO} opacity=".35" />
      <path d="M4 32h10" {...TRACO} />
      <circle cx="18" cy="32" r="2.6" fill="currentColor" stroke="none" />
    </>
  ),
};

export default function SigiloBlasfemia({ sigilo, tamanho = 64 }) {
  const desenho = DESENHOS[sigilo];
  if (!desenho) return null;
  return (
    <svg
      className="blasf-sigilo"
      viewBox="0 0 64 64"
      width={tamanho}
      height={tamanho}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      {desenho}
    </svg>
  );
}

export { DESENHOS as SIGILOS_DISPONIVEIS };
