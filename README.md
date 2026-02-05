
# Tournoi Live (Vercel + Supabase)

Ce projet déploie une API et un petit front pour gérer un tournoi (poules + finales) en se basant sur Supabase (PostgreSQL) et des fonctions serverless Vercel.

## Pré‑requis
1. Un projet Supabase (gratuit). Récupérez `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`.
2. Dans Vercel → *Settings → Environment Variables*, ajoutez :
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Endpoints
- `GET /api/live` : retourne `{ matchs, poules }` pour l’affichage public.
- `POST /api/setup` : (admin) crée un tournoi à partir d'une config et des équipes par poule.
- `POST /api/score` : (admin) enregistre un score, propage les qualifiés, renvoie `{ matchs, poules }`.
- `POST /api/finales` : (admin) génère les phases finales et les ajoute au planning.

## Tester rapidement
- Ouvrez `/` : affiche le live.
- Ouvrez `/admin.html` : page d’admin minimaliste (setup, saisie des scores, finales).

## Schéma SQL minimal (à exécuter dans Supabase → SQL Editor)
```sql
create table if not exists config (
  param text primary key,
  value text
);

create table if not exists equipes (
  id serial primary key,
  nom text not null,
  poule text not null
);

create table if not exists matchs (
  id text primary key,
  heure text,
  terrain integer,
  poule text,
  equipe1 text,
  equipe2 text,
  score1 integer,
  score2 integer,
  source1 text,
  source2 text
);

create index if not exists idx_matchs_poule on matchs(poule);
create index if not exists idx_matchs_heure on matchs(heure);
```

## Remarques
- Ce projet n’utilise pas `DB_JSON` car le calcul est rapide côté API.
- Vous pouvez renforcer la sécurité (auth Supabase, RLS) une fois tout fonctionnel.
