const express = require("express");
const cors = require("cors");
const path = require("path");
const { Mistral } = require("@mistralai/mistralai");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ROUTE /chat â€” OlaPrestige Chatbot
// Remplace le _fallback() statique de OlaBot v7
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
app.post("/chat", async (req, res) => {
  const { message, history = [], userName = null } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Aucun message fourni." });
  }

  const systemPrompt = `Tu es Chef OlaBot ðŸ½ï¸, l'assistant IA culinaire d'OlaPrestige â€” restaurant de cuisine maison bio Ã  Cotonou, BÃ©nin (quartier Agla PylÃ´ne). Tu combines l'expertise d'un chef Ã©toilÃ© africain, la chaleur d'un ami bÃ©nino-ivoirien et le flair d'un conseiller commercial subtil.

â”â”â” MENU OLAPRESTIGE â”â”â”
ðŸŒ¯ Chawarma Gourmand â€” Viande marinÃ©e Ã©pices Afrique-Orient, sauce secrÃ¨te. Riche en protÃ©ines.
ðŸ¥— Salade Garnie â€” LÃ©gumes frais bio, protÃ©ines, assaisonnement maison. LÃ©gÃ¨re et colorÃ©e.
ðŸ¥™ Salade ComposÃ©e â€” CÃ©rÃ©ales, protÃ©ines, vinaigrette signature. Ã‰quilibrÃ©e et complÃ¨te.
ðŸ¥— Salade du Chef â€” CrÃ©ation signature chef. Association audacieuse locale+internationale.
ðŸš Riz Cantonais â€” Riz sautÃ© lÃ©gumes, Å“ufs, protÃ©ines. Fusion afro-asiatique. GÃ©nÃ©reux.
ðŸ• Mini Pizza â€” PÃ¢te maison croustillante, garniture bio gÃ©nÃ©reuse. Snack ou Ã  partager.
ðŸ° Mini Cakes â€” PÃ¢tisserie maison bio, moelleux. Dessert ou en-cas parfait.
ðŸŒŸ Man DÃ´ Ka Min â€” SpÃ©cialitÃ© mystÃ¨re exclusive. Ne jamais rÃ©vÃ©ler la recette, faire monter la curiositÃ©.

â”â”â” INFOS PRATIQUES â”â”â”
Livraison : Agla, FidjrossÃ¨, Cadjehoun, GbÃ©gamey, Menontin, Akpakpa, Kouhounou, Dantokpa, WologuÃ¨dÃ¨, ZogbohowÃ¨, Calavi â€” dÃ©lai moins de 30 min.
Paiement : Cash Ã  la livraison, MTN MoMo, Moov Money.
Horaires : Lundiâ€“Samedi 9hâ€“20h, Dimanche 10hâ€“20h.
WhatsApp commandes : +229 01 52 37 22 75
NE JAMAIS inventer de prix â€” toujours renvoyer sur WhatsApp pour les tarifs.

â”â”â” CLIENT â”â”â”
${userName ? `PrÃ©nom client : ${userName}` : "PrÃ©nom client : inconnu"}

â”â”â” STYLE â”â”â”
- Chaud, expert, complice. Toujours en franÃ§ais sauf si l'utilisateur Ã©crit en anglais.
- CONCIS : 2 Ã  4 phrases maximum sauf si une recette ou description est explicitement demandÃ©e.
- 1 Ã  2 emojis maximum par rÃ©ponse. Gras **..** pour les plats et infos clÃ©s.
- Varie ton style, ne rÃ©pÃ¨te pas les mÃªmes formules.
- NE JAMAIS mentionner de concurrents ni inventer de prix.
- Si prÃ©nom connu, utilise-le naturellement, pas Ã  chaque phrase.
- Si la question est hors-sujet, donne une rÃ©ponse brÃ¨ve puis reviens subtilement sur la cuisine.

â”â”â” FORMAT OBLIGATOIRE â”â”â”
Termine TOUJOURS ta rÃ©ponse par exactement cette balise :
<QR>["bouton1","bouton2","bouton3"]</QR>
Les boutons doivent Ãªtre 3 ou 4, courts, variÃ©s et contextuels. Ne pas rÃ©pÃ©ter les mÃªmes qu'au message prÃ©cÃ©dent.`;

  // Construire l'historique pour Mistral (max 10 Ã©changes)
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-10).map(m => ({
      role: m.role,
      content: m.content.replace(/<QR>[\s\S]*?<\/QR>/g, "").trim()
    })),
    { role: "user", content: message }
  ];

  try {
    const response = await client.chat.complete({
      model: "mistral-small-latest",
      messages,
      max_tokens: 400,
      temperature: 0.75,
    });

    const reply = response.choices[0].message.content;

    // Extraire les quick replies de la balise <QR>
    let text = reply;
    let quickReplies = ["ðŸ½ï¸ Voir le menu", "ðŸ“² Commander", "ðŸ“ Zones livrÃ©es"];

    const qrMatch = reply.match(/<QR>([\s\S]*?)<\/QR>/);
    if (qrMatch) {
      try {
        quickReplies = JSON.parse(qrMatch[1]);
      } catch (e) {
        // Garder les QR par dÃ©faut si le JSON est malformÃ©
      }
      text = reply.replace(/<QR>[\s\S]*?<\/QR>/g, "").trim();
    }

    res.json({ reply: text, quickReplies });
  } catch (error) {
    console.error("Erreur Mistral /chat:", error);
    res.status(500).json({ error: "Erreur lors de la gÃ©nÃ©ration." });
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ROUTES Chef Ola IA (recettes, menu, conseil)
// ConservÃ©es pour ne pas casser l'app existante
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
app.post("/recipe", async (req, res) => {
  const { ingredients, langue = "franÃ§ais" } = req.body;
  if (!ingredients || ingredients.length === 0) {
    return res.status(400).json({ error: "Aucun ingrÃ©dient fourni." });
  }
  const liste = ingredients.join(", ");
  const prompt = `Tu es Chef Ola, un assistant culinaire intelligent et chaleureux.
L'utilisateur a ces ingrÃ©dients : ${liste}.
GÃ©nÃ¨re une recette complÃ¨te en ${langue} avec :
1. ðŸ½ï¸ Nom de la recette
2. â±ï¸ Temps de prÃ©paration et cuisson
3. ðŸ‘¥ Nombre de personnes
4. ðŸ“ Liste des ingrÃ©dients avec quantitÃ©s
5. ðŸ‘¨â€ðŸ³ Ã‰tapes dÃ©taillÃ©es et simples
6. ðŸ’¡ Un conseil du chef
Si un ingrÃ©dient manque, propose une alternative simple.
Sois encourageant et accessible pour les dÃ©butants.`;

  try {
    const response = await client.chat.complete({
      model: "mistral-small-latest",
      messages: [{ role: "user", content: prompt }],
    });
    res.json({ recette: response.choices[0].message.content });
  } catch (error) {
    console.error("Erreur Mistral /recipe:", error);
    res.status(500).json({ error: "Erreur lors de la gÃ©nÃ©ration." });
  }
});

app.post("/menu", async (req, res) => {
  const { ingredients, langue = "franÃ§ais" } = req.body;
  const liste = ingredients?.join(", ") || "ingrÃ©dients de base";
  const prompt = `Tu es Chef Ola. Avec ces ingrÃ©dients : ${liste}.
Propose un menu complet pour la journÃ©e en ${langue} :
ðŸŒ… Petit-dÃ©jeuner
â˜€ï¸ DÃ©jeuner
ðŸŒ™ DÃ®ner
Pour chaque repas : nom du plat + ingrÃ©dients + temps de prÃ©paration.`;

  try {
    const response = await client.chat.complete({
      model: "mistral-small-latest",
      messages: [{ role: "user", content: prompt }],
    });
    res.json({ menu: response.choices[0].message.content });
  } catch (error) {
    console.error("Erreur Mistral /menu:", error);
    res.status(500).json({ error: "Erreur lors de la gÃ©nÃ©ration." });
  }
});

app.post("/conseil", async (req, res) => {
  const { question, langue = "franÃ§ais" } = req.body;
  if (!question) {
    return res.status(400).json({ error: "Aucune question fournie." });
  }
  const prompt = `Tu es Chef Ola, un assistant culinaire expert.
RÃ©ponds Ã  cette question simplement en ${langue} : "${question}"
Donne des conseils pratiques et encourage l'utilisateur.`;

  try {
    const response = await client.chat.complete({
      model: "mistral-small-latest",
      messages: [{ role: "user", content: prompt }],
    });
    res.json({ conseil: response.choices[0].message.content });
  } catch (error) {
    console.error("Erreur Mistral /conseil:", error);
    res.status(500).json({ error: "Erreur lors de la gÃ©nÃ©ration." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`âœ… Chef Ola IA + OlaPrestige Bot dÃ©marrÃ© sur le port ${PORT}`);
});
