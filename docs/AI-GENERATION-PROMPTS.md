## Prompts IA – Génération Nothly (décembre 2025)

### Objectif
Formaliser les instructions utilisées par l’API `POST /api/ai` pour générer fiches et quiz alignés avec la vision “Nothly lit ton PDF, en fait des fiches, te fait réviser, et garde tout à jour quand le document change”.

---

### Mode `fiche`
- **Rôle** : créer une fiche de révision hiérarchique fidèle au texte source.
- **Langue** : français uniquement.
- **Structure imposée (JSON)** :
  ```json
  {
    "documentTitle": "string",
    "summary": "string",
    "learningObjectives": ["string"],
    "sections": [
      {
        "title": "string",
        "summary": "string",
        "keyIdeas": ["string"],
        "definitions": [
          {
            "term": "string",
            "meaning": "string"
          }
        ],
        "examples": ["string"]
      }
    ],
    "revisionTips": ["string"]
  }
  ```
- **Contraintes** :
  - 3 à 6 sections.
  - `learningObjectives` = verbes d’action (“Comprendre…”, “Identifier…”).
  - `definitions` : tableau vide si rien à signaler.
  - `revisionTips` : conseils actionnables et courts.
  - Aucun texte hors JSON.


### Mode `quiz`
- **Rôle** : fournir un quiz mixant QCM, vrai/faux et complétion pour réviser immédiatement.
- **Langue** : français uniquement.
- **Structure imposée (JSON)** :
  ```json
  {
    "documentTitle": "string",
    "recommendedSessionLength": 6,
    "questions": [
      {
        "id": "string",
        "type": "multiple_choice",
        "prompt": "string",
        "options": ["string"],
        "answer": "string",
        "explanation": "string",
        "tags": ["string"]
      }
    ]
  }
  ```
- **Contraintes** :
  - 6 à 8 questions au total.
  - Au moins 3 `multiple_choice` (4 options).
  - ≥1 `true_false` & ≥1 `completion`.
  - `explanation` : justification en ≤2 phrases.
  - `tags` : section + difficulté (ex. `["section:intro", "difficulty:easy"]`).
  - `recommendedSessionLength` : entier (minutes).


### Métadonnées optionnelles
L’appel peut transmettre `metadata` (titre du document, section, niveau, etc.). Elles sont intégrées dans le message utilisateur pour contextualiser la génération.

---

### Modes simples
- `improve`, `correct`, `translate`, `summarize` restent textuels et ne retournent pas de JSON.


### Paramètres modèle
- Modèle : `gpt-4o-mini`.
- Température :
  - modes structurés (`fiche`, `quiz`) : 0.4
  - modes textuels : 0.7
- `response_format: { type: "json_object" }` activé pour les modes structurés.


