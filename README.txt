ROULETTE SYSTEM — APP BETA 0.3

Esta versão apresenta roletas circulares individuais. Escolha uma categoria, abra a roleta e toque em GIRAR ROLETA. Cada categoria é sorteada separadamente. A idade é sorteada junto com a raça. Quando as 11 categorias forem concluídas, a ficha é montada.

ARQUIVOS PRINCIPAIS
- index.html: tela do aplicativo
- styles.css: visual e animações
- app.js: sorteios, roletas e ficha
- catalogo-oficial.json: catálogo integrado com 340 resultados
- manifest.webmanifest e sw.js: suporte PWA

PUBLICAÇÃO NO GITHUB PAGES
Envie os arquivos diretamente para a raiz do repositório. O arquivo index.html precisa estar na raiz, ao lado de app.js, styles.css, catalogo-oficial.json, manifest.webmanifest, sw.js e icon.svg.
Em Settings > Pages, selecione Deploy from a branch, branch main, pasta /(root).

NOTA SOBRE A ROLETA
Cada fatia corresponde a um item. O tamanho da fatia acompanha o peso/probabilidade cadastrado, então os resultados não têm necessariamente a mesma chance. Em categorias muito grandes, a lista completa abaixo da roleta permite consultar todos os nomes com clareza.

IDADE
As faixas explícitas cadastradas para cada raça são usadas diretamente. Para raças sem intervalo numérico fechado, a faixa configurável da Beta continua provisória.

A ficha usa atributo-base 100 e a fórmula oficial registrada. Modificadores condicionais não são aplicados automaticamente ao atributo-base.
