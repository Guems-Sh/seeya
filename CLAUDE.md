# CLAUDE.md — SeeYa

> **Make plans happen.**
> SeeYa est une app web (mobile-ready) qui permet d'organiser des sorties entre amis en quelques taps — en mode planifié ou last-minute.

---

## 1. Vision produit

Le problème central : organiser une sortie entre amis génère trop de friction (messages, coordination, incertitude sur le mood). Résultat : les sorties n'ont pas lieu.

SeeYa résout ça en deux modes :
- **Planifié** : je renseigne mes créneaux dispo + mood pour la semaine. L'app trouve les moments communs avec mes amis.
- **Last-minute** : "je sors dans 1h, qui est chaud ?" → notif push instantanée à ses cercles.

---

## 2. Stack technique

| Couche | Choix | Raison |
|--------|-------|--------|
| Frontend | Next.js 14 (App Router) | Web maintenant, base React réutilisable pour React Native ensuite |
| Styling | Tailwind CSS | Rapide, responsive mobile-first par défaut |
| Backend / BDD | Supabase | Auth + PostgreSQL + Realtime + Storage en un seul outil |
| Auth | Magic Link (Supabase) | 0 friction, partageable dans un groupe WhatsApp |
| Notifs push web | Web Push API + Service Worker | Compatible navigateur, upgradable mobile |
| Carte | Mapbox GL JS | Carte interactive Paris, clustering, localisation floue |
| Déploiement | Vercel | CI/CD automatique depuis GitHub |
| Langage | TypeScript strict | Partout, sans exception |

---

## 3. Structure du projet

```
seeya/
├── app/                        # Next.js App Router
│   ├── (auth)/
│   │   ├── login/              # Page magic link
│   │   └── callback/           # Supabase auth callback
│   ├── (app)/
│   │   ├── layout.tsx          # Layout principal (sidebar + bottom nav)
│   │   ├── page.tsx            # Carte interactive (home)
│   │   ├── create/             # Créer un event
│   │   ├── events/             # Liste filtrée des events
│   │   ├── inbox/              # Events confirmés de l'user
│   │   └── profile/            # Profil + préférences
│   └── api/
│       ├── notifications/      # Web Push endpoints
│       └── matching/           # Logique de matching créneaux
├── components/
│   ├── ui/                     # Composants atomiques (Button, Card, Badge…)
│   ├── map/                    # MapView, EventPin, LocationPicker
│   ├── events/                 # EventCard, EventForm, MoodPicker
│   ├── circles/                # CircleSelector, FriendList
│   └── notifications/          # NotifBanner, PushPermissionPrompt
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Supabase browser client
│   │   ├── server.ts           # Supabase server client (RSC)
│   │   └── types.ts            # Types générés depuis le schéma DB
│   ├── matching.ts             # Algorithme de matching créneaux
│   ├── push.ts                 # Web Push helpers
│   └── utils.ts
├── hooks/
│   ├── useUser.ts
│   ├── useEvents.ts
│   ├── useCircles.ts
│   └── useMatching.ts
├── public/
│   └── sw.js                   # Service Worker pour notifs push
├── supabase/
│   ├── migrations/             # Migrations SQL versionnées
│   └── seed.sql
└── CLAUDE.md                   # Ce fichier
```

---

## 4. Modèle de données (Supabase / PostgreSQL)

### `profiles`
```sql
id              uuid PRIMARY KEY REFERENCES auth.users
first_name      text NOT NULL
last_name_init  text NOT NULL          -- Initiale du nom ex: "D."
avatar_url      text
bio             text                   -- Optionnel, max 100 chars
preferred_arrondissements  int[]       -- ex: [11, 10, 3]
preferred_moods  mood_type[]
usual_availability  availability_type  -- 'weekday_evenings' | 'weekends' | 'both'
is_online       boolean DEFAULT true   -- Mode hors-ligne
location_sharing  boolean DEFAULT true -- Localisation floue activée
created_at      timestamptz DEFAULT now()
```

### `circles`
```sql
id          uuid PRIMARY KEY
owner_id    uuid REFERENCES profiles
name        text NOT NULL
type        circle_type  -- 'proches' | 'collegues' | 'connaissances' | 'custom'
created_at  timestamptz DEFAULT now()
```

### `circle_members`
```sql
circle_id   uuid REFERENCES circles
profile_id  uuid REFERENCES profiles
PRIMARY KEY (circle_id, profile_id)
```

### `slots` (créneaux dispo)
```sql
id          uuid PRIMARY KEY
user_id     uuid REFERENCES profiles
date        date NOT NULL
start_time  time NOT NULL
end_time    time NOT NULL
moods       mood_type[]   -- ['biere', 'cafe', 'restau'…]
is_recurring  boolean DEFAULT false
recurrence_days  int[]   -- [1,3,5] = lun, mer, ven
expires_at  timestamptz  -- Nettoyage auto des vieux créneaux
created_at  timestamptz DEFAULT now()
```

### `events`
```sql
id              uuid PRIMARY KEY
creator_id      uuid REFERENCES profiles
title           text
mood            mood_type NOT NULL
type            event_type   -- 'planned' | 'spontaneous'
status          event_status -- 'open' | 'confirmed' | 'cancelled'
date            date
start_time      time
end_time        time
arrondissement  int
location_name   text          -- Nom du lieu (optionnel)
location_url    text          -- Lien Google Maps / site (optionnel)
location_coords point         -- lat/lng précis (optionnel)
location_fuzzy  point         -- Coords floues pour la carte publique
max_participants int
target_circles  uuid[]        -- Cercles notifiés
created_at      timestamptz DEFAULT now()
```

### `event_participants`
```sql
event_id    uuid REFERENCES events
profile_id  uuid REFERENCES profiles
status      participant_status  -- 'invited' | 'confirmed' | 'declined'
joined_at   timestamptz DEFAULT now()
PRIMARY KEY (event_id, profile_id)
```

### `matches`
```sql
id              uuid PRIMARY KEY
user_a          uuid REFERENCES profiles
user_b          uuid REFERENCES profiles
slot_a          uuid REFERENCES slots
slot_b          uuid REFERENCES slots
overlap_start   timestamptz
overlap_end     timestamptz
shared_moods    mood_type[]
notified        boolean DEFAULT false
created_at      timestamptz DEFAULT now()
```

### `invitations`
```sql
id          uuid PRIMARY KEY
created_by  uuid REFERENCES profiles
token       text UNIQUE NOT NULL   -- Token du magic link d'invitation
circle_id   uuid REFERENCES circles  -- Cercle auto-rejoint à l'inscription
expires_at  timestamptz
used_at     timestamptz
```

### Enums SQL
```sql
CREATE TYPE mood_type AS ENUM ('cafe', 'biere', 'cine', 'restau', 'balade', 'sport');
CREATE TYPE circle_type AS ENUM ('proches', 'collegues', 'connaissances', 'custom');
CREATE TYPE event_type AS ENUM ('planned', 'spontaneous');
CREATE TYPE event_status AS ENUM ('open', 'confirmed', 'cancelled');
CREATE TYPE participant_status AS ENUM ('invited', 'confirmed', 'declined');
CREATE TYPE availability_type AS ENUM ('weekday_evenings', 'weekends', 'both');
```

---

## 5. Fonctionnalités MVP — périmètre strict

### ✅ Dans le MVP
- Auth magic link (email)
- Onboarding : profil + préférences (moods, arrondissements, dispo habituelle)
- Invitation amis via lien unique (token) → auto-link dans un cercle
- Gestion des cercles : Proches / Collègues / Connaissances (catégories prédéfinies)
- Créneaux dispo : horaires libres, répétables ou non, multi-moods
- Événement planifié : titre, mood, date/heure, lieu (arrondissement requis, adresse optionnelle), cercles cibles, nb max participants
- Événement spontané : mood + "je sors dans X min" → notif push immédiate aux cercles
- Carte interactive Paris (Mapbox) : pins des events, localisation floue (style Snapchat), filtres matin/après-midi/soir
- Matching de créneaux : calcul overlap, notification uniquement après acceptation mutuelle
- Mode hors-ligne (l'user n'apparaît pas dans les matchings ni sur la carte)
- Inbox : events où l'user est inscrit (confirmés, en attente, passés)
- Notifications push web : matching trouvé, plan spontané, confirmation/annulation
- Détail d'un event : organisateur, participants, mood, lieu, lien externe si fourni

### ❌ Hors MVP (v2+)
- Système de points / gamification
- Cercles custom (premium)
- Events publics / offre B2B (venues, restau, bars)
- Intégration Google Calendar
- App mobile native (React Native / Expo)
- Chat in-app
- Statistiques sociales

---

## 6. Règles métier importantes

### Matching
- Un match n'est visible par aucune des deux parties avant acceptation mutuelle
- Un user en mode hors-ligne est invisible pour le matching
- Les matchings sont calculés côté serveur (API route) et non en temps réel pour éviter la surcharge
- Un match expire si le créneau est passé depuis plus de 2h

### Localisation
- La localisation floue = coords réelles + offset aléatoire de 300-800m
- L'offset est recalculé toutes les 30 minutes pour éviter la triangulation
- Désactivable à tout moment dans le profil
- La localisation précise n'est jamais transmise à d'autres users

### Événements spontanés
- Durée de vie par défaut : 3h après création
- Notif envoyée uniquement aux cercles sélectionnés par le créateur
- Réponse possible en 1 tap : "Chaud" / "Pas dispo" (depuis la notif, sans ouvrir l'app)

### Invitation
- Le lien d'invitation est unique par user + optionnellement lié à un cercle
- Un même email ne peut pas créer deux comptes
- Le lien expire après 7 jours ou après 10 utilisations

### Vie privée
- Un user peut voir qui a confirmé un event seulement s'il est lui-même invité
- Le matching reste privé entre les deux parties
- Aucune donnée de localisation précise n'est stockée

---

## 7. Flux utilisateur principal

```
Magic link reçu (WhatsApp / SMS)
    → Création compte (email + magic link)
    → Onboarding (prénom, initiale nom, photo optionnelle, moods favoris, arrondissements, dispo habituelle)
    → Home : Carte Paris

Depuis la carte :
    [CTA "Créer"] → Formulaire event (planifié ou spontané) → Choix des cercles → Publié
    [CTA "Rejoindre"] → Liste filtrée (moods, dispo, quartier) → Détail event → Confirmer
    [Swipe gauche ou onglet] → Inbox (mes events confirmés)

Notifications push (background) :
    → Matching trouvé → Accepter / Ignorer
    → Plan spontané d'un ami → Chaud / Pas dispo
    → Confirmation d'un participant
    → Annulation d'un event
```

---

## 8. Conventions de code

- **TypeScript strict** : `strict: true` dans tsconfig, pas de `any`
- **Composants** : Server Components par défaut, `'use client'` uniquement si interactivité nécessaire
- **Nommage** : PascalCase composants, camelCase fonctions/variables, kebab-case fichiers
- **API routes** : `/app/api/[resource]/route.ts` — toujours valider les inputs avec Zod
- **Supabase** : utiliser le client server-side dans les Server Components et API routes, client browser dans les hooks
- **Erreurs** : toujours logger côté serveur, afficher un message générique côté client
- **RLS Supabase** : Row Level Security activé sur toutes les tables — ne jamais bypasser avec le service role en dehors des migrations
- **Env vars** : toutes dans `.env.local`, jamais hardcodées. Préfixer avec `NEXT_PUBLIC_` uniquement si nécessaire côté client

---

## 9. Variables d'environnement requises

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # Server only

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=

# Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:contact@seeya.app
```

---

## 10. Commandes utiles

```bash
# Dev
npm run dev

# Générer les types Supabase
npx supabase gen types typescript --project-id [ID] > lib/supabase/types.ts

# Lancer les migrations
npx supabase db push

# Générer les clés VAPID (Web Push)
npx web-push generate-vapid-keys
```

---

## 11. Priorités de développement

1. Auth magic link + onboarding
2. Modèle de données + migrations Supabase
3. Créneaux dispo (CRUD)
4. Cercles + système d'invitation (magic link viral)
5. Création d'events (planifié + spontané)
6. Carte Mapbox + pins events
7. Matching de créneaux
8. Notifications push (Web Push API)
9. Inbox
10. Mode hors-ligne + localisation floue
11. QA mobile (responsive) + PWA manifest

---

## 12. Ce que Claude doit savoir

- **Toujours penser mobile-first** : les users utiliseront SeeYa depuis leur téléphone dans 90% des cas
- **La friction est l'ennemi** : chaque interaction doit être réductible au minimum de taps possible
- **La vie privée est un feature, pas une contrainte** : mettre en avant les contrôles de confidentialité dans l'UI
- **Paris d'abord** : tous les exemples, seeds et données de test utilisent Paris et ses arrondissements
- **Pas de dark patterns** : pas de notifications abusives, pas de faux urgences, pas de FOMO forcé
