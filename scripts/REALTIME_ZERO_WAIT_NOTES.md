# Realtime zero-wait

Este lote remove ordenação entre clientes baseada em relógio local para música e mapa ativo, aplica atualização otimista no cliente emissor, aquece chunks de navegação em idle e ajusta o movimento do battlemap para aproximadamente 30 Hz mantendo os limites conservadores de concorrência/slots.

Princípio: estado confirmado do Firestore é autoritativo entre computadores; `Date.now()` pode identificar eventos, mas nunca decidir se uma atualização remota é velha ou nova.
