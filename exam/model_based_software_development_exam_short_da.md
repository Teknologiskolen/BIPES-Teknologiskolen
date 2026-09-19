# Model-based Software Development — Skriftlig eksamen, forår 2026 (kort version, dansk)

Samme spørgsmål og svar som i `model_based_software_development_exam_short.md`, oversat til dansk.
Del 1–3 holder sig til maks. 10 linjer pr. svar, som i den engelske korte version. **Del 4 (det
valgte emne, Validering) er bevidst fuldt udfoldet her, ikke afkortet** — inklusiv kode og
begrundelser — da valideringen af DSL'en er kernen i den individuelle udvidelse og fortjener en
grundig forklaring på dansk. Fulde citater og eksempler for Del 1–3 findes i den fulde engelske
version.

Metamodel-diagram: https://claude.ai/code/artifact/5f93db4e-a493-4239-a572-0a6f003a3169

---

## Del 0 — Problemet

BIPES omdanner MicroPython-hardwarebiblioteker til Blockly-blokke til undervisning. Fire
artefakter (UI, Python-generator, toolbox-indgang og selve biblioteket) blev tidligere
synkroniseret manuelt pr. blok og kunne divergere. Problemet: modellér "et bibliotek eksponeret
som blokke" som ét domænekoncept, så hvert artefakt genereres fra én autoritativ beskrivelse.

---

## Del 1 — Metamodellering

### Sp. 1 — Egenskaber

Category(name, color) — hvor i toolboxen. Class(className, instanceMode, instanceName,
methodRef) — hvilket kørende objekt et kald rammer, og hvor mange der kan eksistere (singleton
vs. multiple, adresseret via id/reference). Block(fnName, label, kind, tooltip, inline,
isConstructor) — hvad symbolet kalder, og hvordan det ser ud; fnName er selve den Python-
identifikator der kaldes, ikke blot et label. Param(name, type, default, isPin, options) — hvad en
elev kan udfylde, og hvordan editoren begrænser det. I modsætning til kursets
Attribute.requirement har Param intet obligatorisk/valgfrit-flag — hver Param er altid forudfyldt.
Om argumentet reelt er påkrævet, ligger uden for denne metamodel, i Python-kilden, og genfindes
kun af Del 4's validator.

### Sp. 2 — Metamodel

Category 1--0..*Class; Category 1--0..*Block (modulniveau); Class 1--1..*Block; Block
1--0..*Param. Class.instanceMode/Block.kind/Param.type er enums (InstanceMode, BlockKind,
ParamType); Class.methodRef er MethodInstanceMode. Dette er en konceptuel metamodel, ikke en
bogstavelig gengivelse af `model.py` — en oprydning fjernede for nylig `ToolboxCategory`/
`InstanceMode`, da intet efterfølgende led læste dem; `Category`/`Class` findes slet ikke som
kode, kun `BlockSpec`/`InputSpec` overlever. Hos Fowler+ er dette en Semantic Model, med en
populationsgrænseflade (den fluente builder) og en operationel grænseflade (`emitters.py`).

---

## Del 2 — Intern DSL

### Sp. 1 — Eksempelprogrammer

`ButtonsInternal` (singleton-klasse, statement+value-blokke, pin-param, dropdown, standardværdi)
og `HCSR04Internal` (multiple/key_input-instansiering — den ene egenskab Program A ikke afprøver).
Sammen dækker de alle egenskaber fra Del 1. Begge blev kørt og giver output byte-identisk med de
rigtige `.blockdef`-filer — netop den testmetode Fowler+ anbefaler til to DSL'er der deler én
Semantic Model: at tjekke om de populerer den ens.

### Sp. 2 — Værtssprogsmekanisme

Tre navngivne Fowler+-mønstre, ikke et ad hoc-design. `.param().param()`-kædning er Method
Chaining. Sekvensen af `hub.block(...)`-kald i `build()` er en Function Sequence — normalt
risikabelt (kræver globale funktioner/tilstand), men nedarvning fra `BlockInternalDSL` er Object
Scoping: kald opløses mod `self`/`hub`, aldrig globale variable, præcis Fowlers løsning på den
risiko. De fluente builder-klasser er en Expression Builder, bevidst adskilt fra Semantic Model'en
(`BlockSpec`/`InputSpec`), efter Fowlers egen anbefaling.

### Sp. 3 — Intern eller ekstern?

Ekstern, af en grund specifik for dette problem: `fnName`/`className` er bogstavelige Python-
identifikatorer generatoren kalder direkte, så en definitionsfil skal være tro mod præcis én
ting — biblioteket. At parse tekst til ren data (ingen udført kode, ingen objektidentitet) er hvad
der gør det sikkert at lade AST-validatoren (Del 4) køre automatisk ved hver serverstart; den
interne DSL ville kræve at importere og udføre vilkårlig Python blot for at læse sine blokke.
Fowler+'s konklusion er "ingen generel fordel begge veje" — men at dele én Semantic Model gjorde
det billigt at bygge begge, hvilket er den reelle grund til at begge findes.

---

## Del 3 — Ekstern DSL

### Sp. 1 — EBNF

```
BlockdefFile  ::= "module" IDENT CategoryDef*
CategoryDef   ::= "category" STRING "{" (ClassDef | FunctionBlock)* "}"
ClassDef      ::= "class" IDENT "as" ("singleton"|"multiple") "{" FunctionBlock* "}"
FunctionBlock ::= "block" IDENT ("kind""="...)? ("{" ParamDef* "}")?
ParamDef      ::= "param" IDENT ("type""="...)? ("default""="...)? "pin"?
```
Hver regel er præcis én klasse fra Del 1; indlejringen afspejler containment. I Xtext er denne
sammenhæng bogstavelig — metamodellen udledes af grammatikken, ikke designet separat.

### Sp. 2 — Venstrerekursion

En regel udvider sig selv som første symbol (`Expr::=Expr'+'Term|Term`). Xtexts ANTLR/LL(*)-
topdown-parser kan ikke acceptere dette — den rekurserer uendeligt uden at konsumere input, så
Xtext afviser det ved grammatikopbygning. Relevant her fordi en beregnet `default`-værdi på en
Param (ikke blot en literal) ville kræve præcis denne form. Løsning: venstrefaktorisér til
`Term (({Add.left=current}'+'|{Sub.left=current}'-') right=Term)*` — `current` pakker det allerede
parsede subtræ ind og genopbygger det venstreassociative træ i hånden. `*` giver
venstreassociativitet, `?` ville give højre (Bettinis eget `SJAssignment` bruger `?` af netop
denne grund). Præcedens følger af hvilken regel der pakker hvilken, ikke af et prioritetstal.

### Sp. 3 — Kodegenerering

Xtexts generator (`IGenerator2.doGenerate`) kaldes af frameworket, ikke direkte — "Hollywood-
princippet" — og kun når en model ingen valideringsfejl har. Xtend-templates fletter literal
tekst med beregnede værdier; dette spejler `python_generator.py`s template-strenge med
`{param}`-pladsholdere, substitueret af `emitters.py`. Det genererede sprog er MicroPython,
fastlagt af hardwaren uanset hvilket værktøj der bygger DSL'en. Produktionen bruger textX frem for
Xtext fordi det omgivende system allerede er Python — en JVM-toolchain ville tilføje endnu en
runtime uden gevinst her, da intet IDE-plugin er nødvendigt. Xtext ville være mere idiomatisk til
Del 4's emne specifikt, da krydsreferencer er first-class dér.

---

## Del 4 — Valgt emne: Validering

Validering tjekker det en grammatik ikke kan: om noget er *meningsfuldt*, ikke blot velformet.
`.blockdef` accepterer `block get_year` uanset om `get_year` findes på klassen — syntaks og
semantik er forskellige spørgsmål. `ds1302.blockdef` havde seks blokke til metoder der ikke
længere fandtes, i brug i to toolboxes og seks elevprojekter; kørslen af tjekket fandt dette
øjeblikkeligt. Følger Bettinis "løs grammatik, streng validering"-princip direkte.

### Sp. 2 — Implementering

`library_introspect.py` parser biblioteket med `ast` (importerer det aldrig) og tjekker eksistens
+ arity, ikke navnelighed på params — `sand_table_robot.blockdef`s `motor_shoulder` mapper
positionelt til det rigtige `motor_shoulder_pins`, så navne er kun labels. Koblet ind som en
advarsel, ikke en hård fejl. Fandt ds1302-fejlen; rettet ved at genskabe de seks metoder. En anden
validator (`blockly_toolbox_generator` i `app.py`) tjekker dubletnøgler i toolboxen på tværs af
filer, samme multimap-mønster som Bettinis `NamesAreUniqueValidator`; fandt otte reelle
kollisioner, heriblandt to helt døde legacy-filer der overskyggede deres levende erstatninger —
slettet efter bekræftet nul resterende referencer.

### Sp. 3 — Udfordringer

At erkende at arity, ikke navnelighed, er det eneste sunde tjek — det oplagte første design
(kræv at navne matcher) ville afvise korrekte, allerede udrullede definitioner. Tjekket forbliver
bevidst ufuldstændigt: positionel binding betyder at en forfatter kunne bytte to params om i
forkert rækkefølge uden at noget opdager det, medmindre metamodellen udvides med en eksplicit
`from=`-binding. Den anden validators sværere problem var anderledes: at opdage en kollision er
let, at afgøre hvilken side der er forældet er det ikke — den handler kun når et uafhængigt tjek
(intet andet refererer denne fil) er entydigt, og forbliver ellers kun diagnostisk.
