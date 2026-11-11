ROULETTE SYSTEM — APP BETA 0.2

O ZIP contém um PWA instalável no Android quando publicado em HTTPS.
Inclui catálogo JSON com 340 resultados: 150 poderes, 50 raças, 20 classes, 50 armas, 60 especializações físicas e 10 intelectuais.

FUNCIONALIDADES
- 11 roletas individuais.
- Geração completa: poder, raça, idade, classe, arma, seis especializações físicas e especialização intelectual.
- Idade sorteada após a raça.
- Ficha com nove atributos e fórmula aditiva.
- Histórico local e exportação TXT da ficha.
- Importação de catálogo JSON.

IDADE
Raças com faixa numérica fechada usam sorteio uniforme entre os limites, inclusive. Raças com longevidade aberta, imortais, artificiais ou sem envelhecimento convencional usam a faixa provisória configurável no app (padrão 1–10.000 anos; raças descritas como milenares começam em 1.000). Isso é somente uma conveniência Beta e NÃO é regra oficial definitiva.

CÁLCULO
Atributo final = atributo-base × (1 + soma dos modificadores / 100). Base de cada atributo: 100.

ATENÇÃO À AUDITORIA
- O catálogo de raças e armas não registra raridade individual em todas as entradas; a Beta conserva as probabilidades listadas, sem inventar raridade.
- Algumas probabilidades transcritas em classes e armas não totalizam 100%; o app normaliza os pesos e mostra a chance efetiva calculada.
- Modificadores percentuais explícitos são aplicados automaticamente. Condições contextuais precisam ser conferidas na descrição.
- O app não é APK nativo. É PWA instalável pelo Chrome após hospedagem HTTPS.

COMO USAR
1. Extraia o ZIP.
2. Hospede a pasta inteira em HTTPS (por exemplo, GitHub Pages).
3. Abra o endereço no Chrome Android.
4. Menu do Chrome > Instalar aplicativo ou Adicionar à tela inicial.

MODIFICADORES
O cálculo automático aplica modificadores percentuais diretos e incondicionais identificados no texto. Modificadores que dependem de contexto (por exemplo, bônus na água, durante um impacto ou sob determinada condição) ficam fora do atributo-base calculado e continuam descritos na ficha/entrada para aplicação situacional.
