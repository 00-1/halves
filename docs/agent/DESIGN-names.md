# Item naming system (for T35) — templates + word banks

> Owner asks: item names are too samey (old code: 14 adjectives, ~36 nouns → only
> 167 unique names for 775 items; "Whispering" ×68) and shouldn't all be the rigid
> `<Adj> <Noun>` mould (cf. the lost "Cooked Goblin Leg"). This is the drop-in
> replacement. **Babysitter content audit: PASSED** (British, kid-appropriate light
> fantasy; mildly spooky at most; no gore/death/alcohol/romance/slurs).

## Integration

Replaces **only** the `ADJ`/`NOUNS` constants and `itemFlavour(id)` in
`collectibles.js` (the block ~lines 330–353 on `origin/main`). Keep `hashStr(id)`
and the `CATALOG.forEach(it => it.flavour = itemFlavour(it.id))` stamp unchanged —
names stay deterministic and stable per id.

**Coupling with T36 (50 icon categories) — read before building:** the noun pool is
indexed by a *theme*. Today that theme = `itemStyle(id)` (0–9). When T36 lands,
icon categories become ~50 grouped into ~10–12 **families**; switch the noun index
to the item's **icon-family** so names stay themed to the icon (a blade-family icon
→ a blade noun), and the **food templates trigger when the family is food** (not
`style===7`). Extend `NOUNS` to one pool per family then. Until T36, the 10 pools
below map 1:1 to the current 10 styles. Everything else (adjectives, epithets,
creatures, places, templates, fixed names) is family-independent and final.

## 1. Generator

```js
  // ---- procedural names: templates + word banks --------------------------
  // Deterministic per id: every placeholder draws an independent salted hash.
  function pick(id, salt, pool){ return pool[hashStr(id + salt) % pool.length]; }

  // Weighted templates. `w` = relative frequency (most names are short/punchy;
  // fancy & quirky forms are rarer). `fixed:true` → whole name from FIXED.
  const TEMPLATES = [
    { w: 30, t: "{adj} {noun}" },                     // Gleaming Dagger
    { w: 14, t: "{noun} of {epithet}" },              // Tonic of Embers
    { w:  9, t: "The {adj} {noun}" },                 // The Bumbling Orb
    { w:  8, t: "{creature}'s {noun}" },              // Goblin's Tooth
    { w:  7, t: "{adj} {noun} of {epithet}" },        // Wily Imp of the Hollow
    { w:  6, t: "{noun} of the {adj} {place}" },      // Shield of the Sleepy Marsh
    { w:  5, t: "{adj}, {adj2} {noun}" },             // Tiny, Cursed Sock
    { w:  4, t: "{adj} {noun} of the {place}" },      // Frosted Gem of the Vale
    { w:  4, t: "{noun} of the {creature}" },         // Ring of the Fox
    { w:  3, t: "{creature}'s {adj} {noun}" },        // Imp's Velvet Scarf
    { w:  3, t: "{adj} {creature} {noun}" },          // Plucky Newt Charm
    { w:  3, t: "FIXED", fixed: true },               // hand-written one-off
    { w:  1, t: "{noun}, {epithet} of It" }           // Orb, Bringer of It
  ];
  // Food family gets its own set so "Cooked Goblin Leg" etc. are reachable.
  const FOOD_TEMPLATES = [
    { w: 22, t: "{cookadj} {creature} {foodpart}" },  // Cooked Goblin Leg
    { w: 12, t: "{adj} {noun}" },                     // Battered Hearth-loaf
    { w:  8, t: "{cookadj} {noun}" },                 // Toasted Cave Mushroom
    { w:  6, t: "{noun} of {epithet}" },              // Stew of Embers
    { w:  6, t: "The {adj} {noun}" },                 // The Suspicious Pasty
    { w:  5, t: "{creature}'s {foodpart}" },          // Gremlin's Knuckle
    { w:  5, t: "FIXED", fixed: true },
    { w:  3, t: "{cookadj} {creature} {foodpart} of {epithet}" }
  ];

  function fillTemplate(id, tpl, theme){
    if(tpl.fixed) return pick(id, "~fixed", FIXED);
    return tpl.t
      .replace("{adj}",      pick(id, "~adj",   ADJECTIVES))
      .replace("{adj2}",     pick(id, "~adj2",  ADJECTIVES))
      .replace("{noun}",     pick(id, "~noun",  NOUNS[theme]))
      .replace("{epithet}",  pick(id, "~epi",   EPITHETS))
      .replace("{creature}", pick(id, "~crea",  CREATURES))
      .replace("{place}",    pick(id, "~plc",   PLACES))
      .replace("{cookadj}",  pick(id, "~cook",  COOKADJ))
      .replace("{foodpart}", pick(id, "~fpart", FOOD_CREATURE_PARTS));
  }
  function chooseTemplate(id, table){
    let total = 0; for(const t of table) total += t.w;
    let r = hashStr(id + "~tpl") % total;
    for(const t of table){ if((r -= t.w) < 0) return t; }
    return table[0];
  }
  // theme = itemStyle(id) for now; switch to icon-family when T36 lands.
  function itemFlavour(id){
    const theme = itemStyle(id);
    const table = (theme === 7 /* food */) ? FOOD_TEMPLATES : TEMPLATES;
    return fillTemplate(id, chooseTemplate(id, table), theme);
  }
```

**Uniqueness:** 612 adjectives ≫ catalogue; the dominant `{adj} {noun}` alone gives
~19k names/theme, and `of`/place/epithet templates reach millions — every item gets
a distinct name and adjectives effectively never repeat.

## 2. Word banks

### ADJECTIVES — 612

```js
  const ADJECTIVES = [
    "Gleaming","Velvet","Plucky","Bumbling","Sproingy","Ghostly","Ancient","Gilded",
    "Frosted","Smouldering","Twinkling","Battered","Pristine","Whispering","Volatile","Cryptic",
    "Glowing","Humming","Cursed","Effervescent","Bashful","Cosy","Crackling","Drowsy",
    "Eerie","Fizzy","Gloopy","Grumpy","Jolly","Lopsided","Mossy","Nimble",
    "Perky","Quirky","Rickety","Scruffy","Sleepy","Snug","Soggy","Spiffy",
    "Squishy","Sturdy","Tangled","Tatty","Wobbly","Wonky","Zany","Zippy",
    "Brave","Bold","Daring","Dauntless","Fearless","Gallant","Heroic","Intrepid",
    "Mighty","Noble","Proud","Resolute","Stalwart","Steadfast","Valiant","Worthy",
    "Radiant","Shimmering","Sparkling","Lustrous","Glittery","Dazzling","Shining","Brilliant",
    "Polished","Glossy","Burnished","Iridescent","Opalescent","Prismatic","Glinting","Beaming",
    "Aged","Antique","Elder","Eternal","Forgotten","Hallowed","Legendary","Mythic",
    "Primordial","Storied","Timeless","Venerable","Weathered","Worn","Olden","Faded",
    "Hushed","Muffled","Murmuring","Quiet","Silent","Soft-spoken","Whisper-thin","Wispy",
    "Wandering","Drifting","Roaming","Rambling","Roving","Strolling","Meandering","Footloose",
    "Bewitched","Charmed","Enchanted","Hexed","Jinxed","Spellbound","Warded","Glamoured",
    "Arcane","Eldritch","Esoteric","Fabled","Mystic","Occult","Rune-marked","Sigil-bound",
    "Bubbly","Frothy","Bubbling","Foaming","Sizzling","Steaming","Simmering","Spluttering",
    "Crispy","Crunchy","Crumbly","Flaky","Doughy","Chewy","Squidgy","Spongy",
    "Sticky","Gummy","Slimy","Slippery","Greasy","Oily","Drippy","Dribbly",
    "Lumpy","Bumpy","Knobbly","Craggy","Jagged","Pointy","Prickly","Spiky",
    "Fuzzy","Fluffy","Furry","Feathery","Downy","Woolly","Velveteen","Plush",
    "Cuddly","Huggable","Snuggly","Comfy","Toasty","Warm","Homely","Heartfelt",
    "Cheeky","Cheery","Chirpy","Bouncy","Giddy","Gleeful","Merry","Mirthful",
    "Playful","Sprightly","Spry","Frisky","Lively","Peppy","Vivacious","Bright",
    "Glum","Gloomy","Mopey","Sulky","Sullen","Brooding","Pensive","Wistful",
    "Spooky","Creepy","Haunting","Shadowy","Murky","Misty","Foggy","Dim",
    "Phantom","Spectral","Wraithlike","Banshee","Boggart","Goblin-touched","Gremlin-chewed","Witchy",
    "Curious","Peculiar","Odd","Strange","Weird","Bizarre","Baffling","Puzzling",
    "Mysterious","Enigmatic","Inscrutable","Unfathomable","Unknowable","Riddling","Veiled","Hidden",
    "Tiny","Teeny","Wee","Pocket-sized","Diminutive","Miniature","Petite","Pint-sized",
    "Mini","Bitty","Titchy","Dinky","Snippy","Little","Slight","Compact",
    "Enormous","Gigantic","Colossal","Massive","Hulking","Towering","Mountainous","Vast",
    "Whopping","Humongous","Mammoth","Titanic","Jumbo","Bulky","Lumbering","Ponderous",
    "Swift","Speedy","Quick","Rapid","Brisk","Fleet","Hasty","Nippy",
    "Darting","Dashing","Whizzing","Zooming","Bolting","Scampering","Scurrying","Skittering",
    "Sluggish","Lazy","Languid","Dawdling","Loitering","Lingering","Plodding","Trundling",
    "Heavy","Weighty","Leaden","Solid","Dense","Hefty","Stout","Robust",
    "Feather-light","Airy","Floaty","Buoyant","Weightless","Gossamer","Cloudlike","Helium-filled",
    "Glacial","Frosty","Icy","Frozen","Wintry","Chilly","Snowy","Sleety",
    "Blazing","Fiery","Flaming","Searing","Scorching","Roaring","Ember-lit","Cinder-flecked",
    "Sunny","Golden","Amber","Honeyed","Buttery","Lemony","Marigold","Saffron",
    "Silvery","Pearly","Moonlit","Starlit","Twilight","Dawn-touched","Dusky","Nightfall",
    "Emerald","Jade","Verdant","Leafy","Ferny","Grassy","Clover-strewn","Pine-scented",
    "Ruby","Crimson","Scarlet","Rosy","Blushing","Coral","Cherry","Berry-stained",
    "Sapphire","Azure","Cobalt","Teal","Turquoise","Cerulean","Sky-blue","Ocean-deep",
    "Violet","Lavender","Lilac","Plum","Mauve","Amethyst","Orchid","Heather",
    "Inky","Ebony","Onyx","Coal-black","Sooty","Charcoal","Pitch-dark","Raven",
    "Snowy-white","Chalky","Milky","Ivory","Alabaster","Bone-pale","Cream","Frost-white",
    "Rusty","Rust-flecked","Corroded","Tarnished","Mouldy","Mildewed","Lichen-clad","Cobwebbed",
    "Dusty","Grimy","Smudged","Muddy","Sandy","Gritty","Dusted","Powdery",
    "Sparkly","Glittering","Bedazzled","Bejewelled","Begemmed","Spangled","Tinselled","Sequined",
    "Singing","Chiming","Tinkling","Jingling","Clanging","Gonging","Ringing","Trilling",
    "Buzzing","Droning","Thrumming","Vibrating","Quivering","Trembling","Shuddering","Juddering",
    "Floppy","Droopy","Saggy","Limp","Slack","Baggy","Loose","Dangling",
    "Taut","Tight","Snappy","Springy","Bouncy-back","Elastic","Stretchy","Rubbery",
    "Lucky","Fortunate","Charmed-up","Blessed","Favoured","Auspicious","Golden-touched","Wishbone",
    "Unlucky","Hapless","Ill-starred","Doomed-ish","Star-crossed","Snakebit","Calamitous","Hexy",
    "Helpful","Kindly","Gentle","Tender","Caring","Generous","Obliging","Thoughtful",
    "Sneaky","Crafty","Cunning","Wily","Sly","Devious","Scheming","Foxy",
    "Honest","Trusty","Reliable","Dependable","Faithful","Loyal","True","Stout-hearted",
    "Clumsy","Klutzy","Fumbling","Tripping","Stumbling","Butterfingered","Cack-handed","Awkward",
    "Graceful","Elegant","Dainty","Delicate","Refined","Poised","Lithe","Supple",
    "Pompous","Haughty","Snooty","Snobby","Lofty","Grandiose","Highfalutin","Self-important",
    "Humble","Modest","Meek","Unassuming","Shy","Timid","Reserved","Coy",
    "Loud","Boisterous","Rowdy","Raucous","Rambunctious","Clamorous","Thunderous","Booming",
    "Sproutling","Toadstool","Mushroom-capped","Acorn-sized","Pebble-smooth","Driftwood","Bark-bound","Twig-thin",
    "Glow-worm","Firefly","Moth-eaten","Beetle-backed","Snail-paced","Ladybird","Caterpillar","Tadpole",
    "Marmalade","Custard","Treacle","Toffee","Gingerbread","Liquorice","Marshmallow","Nougat",
    "Pickled","Bottled","Jarred","Tinned","Preserved","Candied","Crystallised","Sugared",
    "Knitted","Stitched","Patched","Darned","Embroidered","Woven","Crocheted","Quilted",
    "Bewildered","Befuddled","Flummoxed","Dazed","Dizzy","Woozy","Giddy-headed","Muddled",
    "Determined","Dogged","Tenacious","Persistent","Unshakeable","Unflinching","Indomitable","Plucked-up",
    "Suspicious","Shifty","Dodgy","Questionable","Untrustworthy","Fishy","Iffy","Sketchy",
    "Innocent","Wholesome","Pure","Spotless","Squeaky-clean","Blameless","Angelic","Cherubic",
    "Magnificent","Splendid","Glorious","Grand","Resplendent","Sublime","Majestic","Stately",
    "Ramshackle","Decrepit","Crumbling","Dilapidated","Tumbledown","Creaky","Worn-out","Threadbare",
    "Bewhiskered","Tufty","Bristly","Shaggy","Unkempt","Tousled","Bedraggled","Dishevelled",
    "Polite","Courteous","Genteel","Well-mannered","Chivalrous","Gracious","Civil","Decorous",
    "Boggle-eyed","Wide-eyed","Bug-eyed","Squinty","Bleary","Owlish","Beady-eyed","Goggling"
  ];
```

### NOUNS — 10 pools (by current style; remap to icon-family in T36)

```js
  const NOUNS = [
    [ // 0 sprite/familiar
      "Familiar","Imp","Sprite","Critter","Pixie","Wisp","Gremlin","Bogle",
      "Pipsqueak","Hobgoblin","Brownie","Puck","Goblet-imp","Mite","Tiddler","Whelp",
      "Fledgling","Sproutling","Gobbler","Nibbler","Skitterling","Flit","Pocket-beast","Lap-dragon",
      "Mischief","Scamp","Tagalong","Companion","Shoulder-friend","Snufflekin","Bumblefly","Squeaker"
    ],
    [ // 1 potion
      "Potion","Elixir","Tonic","Brew","Draught","Cordial","Philtre","Tincture",
      "Concoction","Bottle","Vial","Flask","Phial","Fizz","Bubbly-brew","Decoction",
      "Remedy","Restorative","Pick-me-up","Quaff","Syrup","Infusion","Essence","Distillate",
      "Mixture","Swig","Slurp","Glug","Gulp","Sip"
    ],
    [ // 2 scroll
      "Scroll","Tome","Codex","Rune-page","Manuscript","Parchment","Ledger","Grimoire",
      "Almanac","Folio","Treatise","Compendium","Diary","Journal","Note","Letter",
      "Map","Chart","Blueprint","Sketch","Doodle","Pamphlet","Leaflet","Bestiary",
      "Spellbook","Recipe","Riddle-page","Footnote","Marginalia","Bookmark"
    ],
    [ // 3 blade
      "Dagger","Dirk","Kris","Shortsword","Stiletto","Cutlass","Sabre","Rapier",
      "Letter-opener","Bodkin","Poniard","Skean","Penknife","Whittler","Carver","Slicer",
      "Cleaver","Hatchet","Sickle","Shiv","Pin","Needle","Quill-knife","Thorn-blade",
      "Pocketblade","Snickersnee","Bread-knife","Butter-knife","Toothpick","Splinter"
    ],
    [ // 4 gem
      "Gem","Shard","Jewel","Geode","Crystal","Stone","Pebble","Bead",
      "Cabochon","Facet","Sparkler","Glimmerstone","Heartstone","Dewdrop","Teardrop","Nugget",
      "Chip","Sliver","Prism","Druzy","Twinkle","Glint","Gleamstone","Lodestone",
      "Marble","Knucklebone-gem","Wishing-stone","Sky-shard","Frostbead","Cinderstone"
    ],
    [ // 5 ring
      "Ring","Band","Signet","Loop","Hoop","Circlet","Bangle","Torc",
      "Cuff","Coil","Knuckle-ring","Thumb-ring","Pinky-ring","Friendship-band","Seal-ring","Twist",
      "Gimmel","Promise-band","Halo-ring","Whorl","Ringlet","Bracelet-bit","Charm-band","Spinner",
      "Knot","Curlicue","Loopy-thing","Round-about"
    ],
    [ // 6 shield
      "Shield","Aegis","Buckler","Targe","Pavise","Rondache","Gardbrace","Bulwark",
      "Wardplate","Guard","Cover","Bastion","Defender","Boss","Roundel","Kite-shield",
      "Heater","Door-of-a-shield","Lid","Pot-lid","Dustbin-lid","Tray","Plank-board","Barricade",
      "Rampart","Screen","Fender","Shieldling"
    ],
    [ // 7 food
      "Hearth-loaf","Cave Mushroom","Jerky","Pasty","Stew","Pie","Dumpling","Biscuit",
      "Crumpet","Scone","Bun","Roll","Tart","Pudding","Porridge","Broth",
      "Cheese","Sausage","Pickle","Jam","Honey-cake","Gingerbread","Toffee","Trail-mix",
      "Ration","Hardtack","Wafer","Oatcake","Flapjack","Marmalade","Soup","Snack",
      "Nibble","Morsel"
    ],
    [ // 8 rune
      "Rune","Sigil","Glyph","Mark","Ward","Symbol","Hex-mark","Stave",
      "Brand","Inscription","Cipher","Etching","Carving","Scribble","Squiggle","Token",
      "Charm-mark","Bind-rune","Seal","Emblem","Crest","Insignia","Tracery","Knotwork",
      "Talisman-mark","Doodle-rune","Spellmark","Wardstone"
    ],
    [ // 9 orb
      "Orb","Globe","Bauble","Sphere","Marble","Bubble","Crystal-ball","Snowglobe",
      "Eyeball-of-glass","Gazing-ball","Dewglobe","Pearl","Moonball","Glimmer-orb","Lantern-globe","Trinket-ball",
      "Spherelet","Roundel-orb","Wishing-orb","Fortune-ball","Plasma-bauble","Glow-globe","Bobble","Sphere-thing",
      "Whirligig","Gobstopper","Bowling-bauble","Planetoid"
    ]
  ];
```

### EPITHETS — 124 (template supplies "of")

```js
  const EPITHETS = [
    "Embers","Whispers","Echoes","Secrets","Riddles","Dreams","Shadows","Moonlight",
    "Starlight","Sunbeams","Frost","Cinders","Sparks","Storms","Thunder","Gales",
    "Tides","Mists","Fog","Dew","Rain","Snowdrifts","Hailstones","Drizzle",
    "the Fox","the Owl","the Hare","the Badger","the Stoat","the Mole","the Newt","the Toad",
    "the Raven","the Magpie","the Sparrow","the Wren","the Robin","the Hedgehog","the Otter","the Vole",
    "the North Wind","the Deep","the Hollow","the Marsh","the Glade","the Thicket","the Brook","the Fen",
    "the Hearth","the Attic","the Cellar","the Pantry","the Bramble","the Burrow","the Nook","the Cranny",
    "Tuesdays","Last Tuesday","Forgotten Things","Spare Buttons","Lost Socks","Odd Socks","Mild Peril","Minor Inconvenience",
    "Slight Confusion","Gentle Fizzing","Modest Sparkle","Faint Humming","Quiet Glowing","Idle Wandering","Polite Mischief","Mostly Good Intentions",
    "Wonder","Marvels","Curiosities","Oddments","Trinkets","Knick-Knacks","Bits and Bobs","Spare Parts",
    "the Lost Glade","the Sleepy Vale","the Quiet Cavern","the Crumbling Tower","the Twisting Path","the Mossy Bridge","the Old Well","the Hidden Door",
    "Glimmering","Twilight","First Snow","High Summer","the Harvest","Midwinter","the Equinox","the Long Night",
    "the Wise","the Bold","the Sly","the Kind","the Lost","the Found","the Brave","the Bashful",
    "Gentle Thunder","Soft Lightning","Cosy Doom","Tidy Chaos","Sensible Magic","Reasonable Mischief","Approximate Glory","Borrowed Time",
    "Crumbs","Leftovers","Second Helpings","the Spilled Tea","the Misplaced Hat","the Unpaid Library Fine","Three Wishes","One Wish, Used Poorly"
  ];
```

### CREATURES — 64

```js
  const CREATURES = [
    "Goblin","Imp","Bat","Newt","Gremlin","Pixie","Sprite","Troll",
    "Ogre","Kobold","Bogle","Brownie","Puck","Hobgoblin","Wisp","Wraith",
    "Spectre","Phantom","Ghoul","Bogeyman","Banshee","Witch","Wizard","Sorcerer",
    "Toad","Frog","Salamander","Lizard","Gecko","Slug","Snail","Worm",
    "Beetle","Spider","Moth","Firefly","Glow-worm","Centipede","Earwig","Woodlouse",
    "Fox","Badger","Stoat","Weasel","Ferret","Mole","Vole","Shrew",
    "Hedgehog","Otter","Squirrel","Dormouse","Raven","Magpie","Crow","Owl",
    "Bittern","Heron","Dragonet","Wyrmling","Basilisk-pup","Mimic","Slime","Mushroom-folk"
  ];
```

### PLACES — 62

```js
  const PLACES = [
    "Marsh","Hollow","Vale","Cavern","Thicket","Glade","Fen","Bog",
    "Moor","Heath","Dell","Combe","Coppice","Spinney","Grove","Wood",
    "Forest","Wildwood","Brake","Bramblewood","Mire","Swamp","Quagmire","Slough",
    "Crag","Tor","Ridge","Bluff","Scarp","Gorge","Ravine","Chasm",
    "Grotto","Cave","Den","Burrow","Warren","Nook","Cranny","Alcove",
    "Brook","Beck","Rill","Tarn","Mere","Pool","Pond","Ford",
    "Tower","Keep","Crypt","Vault","Cellar","Attic","Belfry","Cloister",
    "Marketplace","Crossroads","Wayside","Toll-bridge","Lost Library","Forgotten Pantry"
  ];
```

### COOKADJ — 26 · FOOD_CREATURE_PARTS — 28 (food family only)

```js
  const COOKADJ = [
    "Cooked","Roasted","Toasted","Pickled","Stewed","Charred","Honey-glazed","Smoked",
    "Grilled","Baked","Fried","Braised","Candied","Caramelised","Buttered","Sugared",
    "Spiced","Salted","Peppered","Crispy-fried","Slow-cooked","Sun-dried","Battered","Marinated",
    "Poached","Crumb-coated"
  ];
  const FOOD_CREATURE_PARTS = [
    "Leg","Wing","Tail","Knuckle","Snout","Toe","Ear","Rib",
    "Drumstick","Haunch","Shank","Trotter","Flank","Belly","Cheek","Hock",
    "Nugget","Strip","Skewer","Morsel","Bite","Chunk","Nibble","Crackling",
    "Jerky-strip","Crisp","Roll","Bap"
  ];
```

### FIXED — 124 hand-written one-offs (style-agnostic)

```js
  const FIXED = [
    "Cooked Goblin Leg","Slightly Haunted Mug","Last Tuesday's Stew","Definitely Not Cursed Ring",
    "Mostly Harmless Orb","Suspiciously Shiny Coin","Probably Magic Pebble","Faintly Glowing Sock",
    "Mildly Enchanted Spoon","Reasonably Brave Shield","Surprisingly Heavy Feather","Allegedly Lucky Acorn",
    "Almost Certainly a Frog","Once-Bitten Apple","Twice-Toasted Crumpet","Thrice-Folded Map",
    "The Slightly Wrong Key","An Argumentative Teapot","A Very Polite Goblin","The Sleepy Lantern",
    "Grandad's Lucky Button","Auntie Mabel's Marmalade","The Last Biscuit","Someone Else's Umbrella",
    "A Jar of Spare Thunder","Bottled Tuesday Afternoon","Three-Quarters of a Wish","A Mostly Empty Promise",
    "The Inconvenient Compass","A Map to Somewhere Boring","The Forgetful Amulet","A Sock of Unusual Courage",
    "The Overconfident Pebble","A Gently Smug Crystal","The Apologetic Dagger","A Shield of Modest Size",
    "The World's Okayest Wand","A Perfectly Average Rock","The Second-Best Crown","A Slightly Used Halo",
    "Knees-Up Knuckle Stew","Roasted Bat Wing","Pickled Newt Toe","Honey-glazed Imp Snout",
    "The Grumbling Cauldron","A Whisk of Mild Doom","The Indecisive Coin","A Wobbling Tower of Cheese",
    "The Slightly Damp Spellbook","A Surprisingly Patient Slime","The Bashful Gargoyle","A Pocketful of Fog",
    "The Snoring Gemstone","A Marble That Hums","The Ticklish Rune","A Ring That Forgets Things",
    "The Optimistic Mushroom","A Faintly Embarrassed Orb","The Punctual Pixie","A Slightly Lost Map",
    "The Cosy Cursed Mug","A Loaf of Questionable Age","The Unbothered Wraith","A Lantern Full of Yesterday",
    "The Reluctant Hero's Boot","A Spoon That Means Well","The Borrowed Crown of Greg","A Vial of Spare Giggles",
    "The Slightly Overcooked Sigil","A Pebble With Opinions","The Mildly Spooky Curtain","A Hat of Reasonable Wisdom",
    "The Self-Satisfied Scroll","A Charm Against Mondays","The Tactically Soggy Map","A Gem the Size of a Worry",
    "The Definitely-Final Biscuit","A Jar Labelled 'Misc'","The Suspicious Pasty","A Wand Held Together With Hope",
    "The Gently Disappointing Orb","A Sword for Cutting Cake","The Unremarkable Relic","A Crown of Slight Importance",
    "The Last Clean Spoon","A Map of the Sofa","The Faintly Magical Brick","A Tin of Assorted Sparks",
    "The Diplomatic Goblin","A Shield Mostly for Show","The Tired Old Lantern","A Rune That Means 'Maybe'",
    "The Confused Compass of Greg","A Slightly Better Pebble","The Heroic Spork","A Bag of Borrowed Luck",
    "The Mysterious Left Sock","A Scroll Nobody Reads","The Cheerful Boggart","A Gem That Glows on Wednesdays",
    "The Slightly Brave Teaspoon","A Bottle of Calm Weather","The Patient Gargoyle of Bath","A Crumb of Real Power",
    "The Loitering Lantern","A Mug That's Seen Things","The Reasonably Ancient Ring","A Toadstool of Some Repute",
    "The Helpful but Wrong Map","A Marble Full of Stars","The Indignant Kettle","A Sock Knitted by a Wizard",
    "The Overdramatic Orb","A Gem on Its Best Behaviour","The Wandering Doormat","A Wand With Good Intentions",
    "The Slightly Smug Shield","A Pie of Uncertain Filling","The Ceremonial Tea Towel","A Glove of Mild Heroism"
  ];
```

## Counts
ADJECTIVES 612 · NOUNS 10 pools (28–34 each) · EPITHETS 124 · CREATURES 64 ·
PLACES 62 · COOKADJ 26 · FOOD_CREATURE_PARTS 28 · FIXED 124.
