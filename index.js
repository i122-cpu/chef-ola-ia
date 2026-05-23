const express = require("express");
const cors = require("cors");
const path = require("path");
const { Mistral } = require("@mistralai/mistralai");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Force UTF-8 sur toutes les réponses JSON
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ══════════════════════════════════════════════════════
// ROUTE /chat — OlaPrestige Chatbot
// Remplace le _fallback() statique de OlaBot v7
// ══════════════════════════════════════════════════════
app.post("/chat", async (req, res) => {
  const { message, history = [], userName = null } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Aucun message fourni." });
  }

  const systemPrompt = `Tu es Chef OlaBot, l'assistant IA d'OlaPrestige — restaurant de cuisine maison bio a Cotonou, Benin (quartier Agla Pylone). Tu combines l'expertise d'un chef etoile africain, la chaleur d'un ami beninois et le flair d'un conseiller commercial subtil.

MENU OLAPRESTIGE
- Chawarma Gourmand : Viande marinee epices Afrique-Orient, sauce secrete. Riche en proteines.
- Salade Garnie : Legumes frais bio, proteines, assaisonnement maison. Legere et coloree.
- Salade Composee : Cereales, proteines, vinaigrette signature. Equilibree et complete.
- Salade du Chef : Creation signature chef. Association audacieuse locale+internationale.
- Riz Cantonais : Riz saute legumes, oeufs, proteines. Fusion afro-asiatique. Genereux.
- Mini Pizza : Pate maison croustillante, garniture bio genereuse. Snack ou a partager.
- Mini Cakes : Patisserie maison bio, moelleux. Dessert ou en-cas parfait.
- Man Do Ka Min : Specialite mystere exclusive. Ne jamais reveler la recette.

INFOS PRATIQUES
Livraison : Agla, Fidjrosse, Cadjehoun, Gbegamey, Menontin, Akpakpa, Kouhounou, Dantokpa, Wologuede, Zogbohowe, Calavi. Delai moins de 30 min.
Paiement : Cash a la livraison, MTN MoMo, Moov Money.
Horaires : Lundi-Samedi 9h-20h, Dimanche 10h-20h.
WhatsApp : +229 01 52 37 22 75
NE JAMAIS inventer de prix. Toujours renvoyer sur WhatsApp pour les tarifs.

CLIENT
${userName ? `Prenom : ${userName}` : "Prenom : inconnu"}

STYLE
- Chaud, expert, complice. Toujours en francais sauf si l'utilisateur ecrit en anglais.
- CONCIS : 2 a 4 phrases max.
- Varie ton style, ne repete pas les memes formules.
- NE JAMAIS mentionner de concurrents ni inventer de prix.
- Si hors-sujet, reponse breve puis retour subtil sur la cuisine.

FORMAT OBLIGATOIRE
Termine TOUJOURS ta reponse par cette balise avec des boutons en texte simple SANS emojis :
<QR>["bouton1","bouton2","bouton3"]</QR>
3 a 4 boutons courts, varies, contextuels. Texte simple sans emojis dans les boutons.`;

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

    let text = reply;
    let quickReplies = ["Voir le menu", "Commander", "Zones livrees"];

    const qrMatch = reply.match(/<QR>([\s\S]*?)<\/QR>/);
    if (qrMatch) {
      try {
        const parsed = JSON.parse(qrMatch[1]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          quickReplies = parsed
            .filter(b => typeof b === "string" && b.trim().length > 0)
            .map(b => b.trim().substring(0, 35))
            .slice(0, 4);
        }
      } catch (e) {
        // Garder les QR par defaut si JSON malformate
      }
      text = reply.replace(/<QR>[\s\S]*?<\/QR>/g, "").trim();
    }

    res.set("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ reply: text, quickReplies }));

  } catch (error) {
    console.error("Erreur Mistral /chat:", error);
    res.status(500).json({ error: "Erreur lors de la generation." });
  }
});

// ══════════════════════════════════════════════════════
// ROUTES Chef Ola IA — inchangees
// ══════════════════════════════════════════════════════
app.post("/recipe", async (req, res) => {
  const { ingredients, langue = "francais" } = req.body;
  if (!ingredients || ingredients.length === 0) {
    return res.status(400).json({ error: "Aucun ingredient fourni." });
  }
  const liste = ingredients.join(", ");
  const prompt = `Tu es Chef Ola, un assistant culinaire intelligent et chaleureux.
L'utilisateur a ces ingredients : ${liste}.
Genere une recette complete en ${langue} avec :
1. Nom de la recette
2. Temps de preparation et cuisson
3. Nombre de personnes
4. Liste des ingredients avec quantites
5. Etapes detaillees et simples
6. Un conseil du chef
Si un ingredient manque, propose une alternative simple.
Sois encourageant et accessible pour les debutants.`;

  try {
    const response = await client.chat.complete({
      model: "mistral-small-latest",
      messages: [{ role: "user", content: prompt }],
    });
    res.json({ recette: response.choices[0].message.content });
  } catch (error) {
    console.error("Erreur Mistral /recipe:", error);
    res.status(500).json({ error: "Erreur lors de la generation." });
  }
});

app.post("/menu", async (req, res) => {
  const { ingredients, langue = "francais" } = req.body;
  const liste = ingredients?.join(", ") || "ingredients de base";
  const prompt = `Tu es Chef Ola. Avec ces ingredients : ${liste}.
Propose un menu complet pour la journee en ${langue} :
Petit-dejeuner, Dejeuner, Diner.
Pour chaque repas : nom du plat + ingredients + temps de preparation.`;

  try {
    const response = await client.chat.complete({
      model: "mistral-small-latest",
      messages: [{ role: "user", content: prompt }],
    });
    res.json({ menu: response.choices[0].message.content });
  } catch (error) {
    console.error("Erreur Mistral /menu:", error);
    res.status(500).json({ error: "Erreur lors de la generation." });
  }
});

app.post("/conseil", async (req, res) => {
  const { question, langue = "francais" } = req.body;
  if (!question) {
    return res.status(400).json({ error: "Aucune question fournie." });
  }
  const prompt = `Tu es Chef Ola, un assistant culinaire expert.
Reponds a cette question simplement en ${langue} : "${question}"
Donne des conseils pratiques et encourage l'utilisateur.`;

  try {
    const response = await client.chat.complete({
      model: "mistral-small-latest",
      messages: [{ role: "user", content: prompt }],
    });
    res.json({ conseil: response.choices[0].message.content });
  } catch (error) {
    console.error("Erreur Mistral /conseil:", error);
    res.status(500).json({ error: "Erreur lors de la generation." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Chef Ola IA + OlaPrestige Bot demarre sur le port ${PORT}`);
});
