# Validação do lote zero-wait

- Build modular deve concluir sem marcadores ausentes.
- Música: iniciar/parar deve atualizar localmente antes do ACK e remotamente pelo snapshot, sem gate por revision/ts.
- Mapa ativo: ativar/ocultar deve atualizar localmente de imediato e todos os clientes devem aceitar a ordem do Firestore.
- Tokens: throttle de 33 ms, no máximo 2 writes em voo e 3 slots mantidos.
- Ping: canal redundante existente deve permanecer inalterado.
- Navegação: prefetch em idle e pageTurn de 160 ms.
