/**
 * A BUSCA QUE ESPERA O DEDO PARAR
 *
 * Sem isto, cada tecla refiltra a lista inteira e redesenha tudo. Em
 * "lanterna" são oito passadas, das quais sete ninguém chegou a ler — e no
 * celular do primo, com a lista de fichas aberta, cada passada é um quadro
 * perdido. A letra aparece com atraso e a digitação parece travada.
 *
 * 180ms é o intervalo que some para quem digita e já basta para juntar as
 * teclas de uma palavra. Acima de ~250ms a lista começa a parecer lenta;
 * abaixo de ~120ms quase não há o que juntar.
 *
 * O termo imediato volta junto porque o CAMPO precisa dele: o que se adia
 * é o filtro, nunca a letra na tela. Adiar a letra é o bug que este tipo
 * de código costuma introduzir.
 */
import { useEffect, useState } from 'react';

export const ESPERA_PADRAO = 180;

export function useBuscaAdiada(valor, espera = ESPERA_PADRAO) {
  const [adiado, setAdiado] = useState(valor);

  useEffect(() => {
    /* Campo esvaziado volta na hora: quem apaga quer ver a lista inteira
       de volta imediatamente, e esperar aí parece travamento. */
    if (!valor) { setAdiado(valor); return undefined; }
    const t = setTimeout(() => setAdiado(valor), espera);
    return () => clearTimeout(t);
  }, [valor, espera]);

  return adiado;
}

export default useBuscaAdiada;
