# Instruções para Agentes de Teste

Para manter a organização do projeto e evitar poluição no repositório principal, todos os scripts de teste e utilitários de simulação devem seguir este padrão:

## Localização
Todos os scripts de teste devem ser colocados na pasta `test-scripts/` na raiz do projeto.

## Gitignore
A pasta `test-scripts/` está configurada no `.gitignore` para não ser enviada ao repositório, permitindo que cada desenvolvedor tenha seus próprios scripts de teste locais.

## Padrão de Implementação
Ao criar um novo script de teste:
1. Use o sufixo `.js` (ou `.ts` se aplicável).
2. Importe as configurações de ambiente usando `dotenv`.
3. Utilize os serviços e configurações existentes em `backend/src/config/` e `backend/src/services/` para manter a consistência com o banco de dados e filas.
4. Inclua logs claros para facilitar a depuração durante a execução.

## Exemplo de Uso
Para rodar um script de teste:
```bash
node test-scripts/nome_do_script.js
```

---
*Este padrão ajuda a manter o ambiente de desenvolvimento limpo e os testes isolados da lógica de produção.*
