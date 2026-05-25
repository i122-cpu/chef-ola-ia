const express = require("express");
const cors = require("cors");
const path = require("path");
const { Mistral } = require("@mistralai/mistralai");

const app = express();
app.use(cors());
app.use(express.json());

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

// ✅ ROUTES AVANT le static middleware
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/app", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "app.html"));
});

// ✅ Static middleware APRES les routes
app.use(express.static(path.join(__dirname, "public")));

app.post("/recipe", async (req, res) => {
  const { ingredients, langue } = req.body;
  if (!ingredients || ingredients.length === 0) {
    return res.status(400).json({ error: "Aucun ingrédient fourni." });
  }
  const liste = ingredients.join(", ");
  const lang = langue || "français";
  const prompt = `
Tu es Chef Ola, un assistant culinaire intelligent et chaleureux.
L'utilisateur a ces ingrédients : ${liste}.
Génère une recette complète en ${lang} avec :
1. 🍽️ Nom de la recette
2. ⏱️ Temps de préparation et cuisson
3. 👥 Nombre de personnes
4. 📝 Liste des ingrédients avec quantités
5. 👨‍🍳 Étapes détaillées et simples
6. 💡 Un conseil du chef
Si un ingrédient manque, propose une alternative simple.
  `;
  try {
    const response = await client.chat.complete({
      model: "mistral-small-latest",
      messages: [{ role: "user", content: prompt }],
    });
    res.json({ recette: response.choices[0].message.content });
  } catch (error) {
    console.error("Erreur Mistral:", error);
    res.status(500).json({ error: "Erreur lors de la génération." });
  }
});

app.post("/menu", async (req, res) => {
  const { ingredients, langue } = req.body;
  const liste = ingredients?.join(", ") || "ingrédients de base";
  const lang = langue || "français";
  const prompt = `
Tu es Chef Ola. Avec ces ingrédients : ${liste}.
Propose un menu complet pour la journée en ${lang} :
🌅 Petit-déjeuner
☀️ Déjeuner
🌙 Dîner
Pour chaque repas : nom du plat + ingrédients + temps de préparation.
  `;
  try {
    const response = await client.chat.complete({
      model: "mistral-small-latest",
      messages: [{ role: "user", content: prompt }],
    });
    res.json({ menu: response.choices[0].message.content });
  } catch (error) {
    console.error("Erreur Mistral:", error);
    res.status(500).json({ error: "Erreur lors de la génération." });
  }
});

app.post("/conseil", async (req, res) => {
  const { question, langue } = req.body;
  if (!question) {
    return res.status(400).json({ error: "Aucune question fournie." });
  }
  const lang = langue || "français";
  const prompt = `
Tu es Chef Ola, un assistant culinaire expert.
Réponds à cette question simplement en ${lang} : "${question}"
Donne des conseils pratiques et encourage l'utilisateur.
  `;
  try {
    const response = await client.chat.complete({
      model: "mistral-small-latest",
      messages: [{ role: "user", content: prompt }],
    });
    res.json({ conseil: response.choices[0].message.content });
  } catch (error) {
    console.error("Erreur Mistral:", error);
    res.status(500).json({ error: "Erreur lors de la génération." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Chef Ola IA démarré sur le port ${PORT}`);
});
