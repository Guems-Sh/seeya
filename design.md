# Design System SeeYa

## Thème
Light brutalist — fond blanc, bordures noires épaisses, accent lime néon.

## Couleurs
| Token | Valeur | Usage |
|-------|--------|-------|
| Background | `#FFFFFF` | Fond de page |
| Surface/Card | `#FFFFFF` | Cartes, panneaux |
| Surface Alt | `#F5F5F5` | Inputs, zones neutres |
| Border | `#000000` 2px | Toutes les bordures |
| Border Light | `#E5E5E5` | Séparateurs internes |
| Text Primary | `#000000` | Titres, contenu |
| Text Secondary | `#666666` | Labels, sous-titres |
| Text Muted | `#888888` | Métadonnées, hints |
| Text Faint | `#AAAAAA` | Placeholders, états vides |
| Accent Lime | `#CCFF00` | CTA principal, chips actifs, online dot |
| Inactive | `#CCCCCC` | Offline dot, états désactivés |

## Typography
- Font: Geist Sans (system-ui fallback)
- Headings: `font-black uppercase tracking-tight`
- Labels: `font-black uppercase tracking-widest text-[10px]–text-xs`
- Body: `font-bold`
- Tout en majuscules pour les éléments d'UI

## Composants

### Button Primary
```
border-2 border-black bg-[#CCFF00] py-3 px-6
font-black uppercase tracking-widest text-black
shadow-[4px_4px_0_0_#000] hover:shadow-none transition-all
```

### Button Secondary
```
border-2 border-black bg-white py-3 px-4
font-black uppercase tracking-widest text-black
hover:bg-black hover:text-white transition-colors
```

### Button Danger (hover)
```
border-2 border-black → hover:border-red-500 hover:bg-red-500 hover:text-white
```

### Input / Select
```
border-2 border-black bg-white px-4 py-4
font-bold text-black placeholder:text-[#AAAAAA]
outline-none focus:border-[#CCFF00] transition-colors
```

### Card
```
border-2 border-black bg-white p-4
```
Active/expanded: `shadow-[4px_4px_0_0_#CCFF00]`

### Chip (toggle)
- Active: `border-2 border-black bg-[#CCFF00] text-black`
- Inactive: `border-2 border-black bg-white text-black hover:bg-[#F5F5F5]`

### Tab (box style)
- Active: `border-2 border-black bg-black text-white`
- Inactive: `border-2 border-black bg-white text-black hover:bg-[#F5F5F5]`

### Toggle (switch)
- On: `border-2 border-black bg-[#CCFF00]`, dot `bg-black border-black`
- Off: `border-2 border-black bg-white`, dot `bg-[#CCCCCC] border-[#CCCCCC]`

### Badge
- Lime: `border-2 border-black bg-[#CCFF00] text-black`
- Dark: `border-2 border-black bg-black text-white`

## Navigation (Bottom — Mobile)
5 items: CARTE, CERCLES, DROP, INBOX, MOI

```
bg-white border-t-2 border-black
```

- DROP (centre): `h-10 w-10 bg-black text-white border-2 border-black` avec `+`
- Active regular: `bg-black text-white`
- Inactive: `bg-white text-[#888888]`

## Spacing
- Padding page: `px-4 pt-6 pb-28`
- Gap cartes: `gap-3`
- Border width: `2px` partout

## Shadows (brutalist)
- CTA: `shadow-[4px_4px_0_0_#000]` → `hover:shadow-none`
- Card active: `shadow-[4px_4px_0_0_#CCFF00]`

## Pages clés
- **DROP A PIN** (`/create`): "DROP A PIN" grand titre noir, 2 cartes PLANNED/RIGHT NOW, form avec inputs noirs
- **INBOX** (`/inbox`): Tabs box-style PENDING/CONFIRMED/PAST (noir = actif), cards avec badges lime
- **MOI** (`/profile`): Identité + toggles statut + chips moods/quartiers + lien d'invitation
- **CERCLES** (`/circles`): Tabs box-style + CircleCards expandables + InviteModal
- **CARTE** (`/`): Mapbox Paris + filtres horaires + pins events

## Breakpoints
- Mobile first: 375px
- Tablet: 768px
- Desktop: 1024px (sidebar latérale)
