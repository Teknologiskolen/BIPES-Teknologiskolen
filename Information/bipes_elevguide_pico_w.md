# Raspberry Pi Pico W med BIPES — elevguide (blokke)

> Denne guide er BIPES-udgaven af *Raspberry Pi Pico W Guide*. I stedet for at skrive
> Python i Thonny bygger du programmerne med **blokke** i BIPES, og kører dem på din
> Pico W direkte fra browseren. Indholdet følger trin 5–20 fra den oprindelige guide,
> men starter med at forbinde over USB og forklare **program-** og **runtime-tilstand**.
>
> Hver opgave viser: **Mål**, hvilke **blokke** du skal bruge, og et **interaktivt blok-eksempel**
> (indlejret direkte fra BIPES), som du kan kopiere ind i dit eget projekt.
>
> Bloknavnene står som de hedder i værktøjskassen (på engelsk). Forklaringerne er på dansk.
>
> **Til redaktøren:** Alle blok-eksempler indlejres fra ÉT delt BIPES-projekt
> (`examples/lessons/pico_w_guide_blocks.xml`). Del projektet offentligt i BIPES, og erstat
> `SHARE_ID` i alle `<iframe>`-adresser nedenfor med projektets del-id. Hvert eksempel vælges
> med `block=<nr>`.

---

## Del 0: Kom i gang med BIPES

### Du skal bruge
- En computer med **Chrome** eller **Edge** (de understøtter USB-forbindelse fra browseren).
- En **Raspberry Pi Pico W** med MicroPython-firmware (samme firmware som i Thonny-guiden, trin 1–4). Mangler den firmware, så installér den først via Thonny eller hold **BOOTSEL** inde, sæt den i USB og kopiér `.uf2`-filen over.
- Et **USB-kabel**.

### Forbind Pico W over USB (seriel)
1. Åbn BIPES-IDE'en i browseren og gå til **Blocks**-siden.
2. Sæt Pico W i computeren med USB.
3. Klik på **forbind**-knappen (USB-/stik-ikonet) i topbjælken, vælg den serielle port der dukker op, og bekræft. Nu er Pico'en forbundet.

### Terminalen = den serielle REPL (svarer til Thonny's "Shell")
Nederst/på siden har BIPES en **terminal**. Den er din **serielle REPL** — præcis som "Shell" i Thonny:
- Alt hvad dit program **printer**, vises her.
- Du kan skrive små MicroPython-kommandoer direkte, fx `print("hejsa")` + Enter.

Prøv det: skriv `print("hejsa")` i terminalen og tryk Enter — Pico'en svarer `hejsa`. Det beviser at forbindelsen virker (svarer til trin 12–13 i Thonny-guiden).

### To tilstande: Program og Runtime
Det vigtigste at forstå i BIPES er, at der er **to forskellige måder** at tale med robotten på:

| | **Program-tilstand** | **Runtime-tilstand** |
|---|---|---|
| Bruges til | uploade, **køre**, **stoppe** og nulstille programmer | **styre og overvåge** robotten **mens** programmet kører |
| Kanaler | USB seriel REPL, Bluetooth REPL, WiFi OTA | USB seriel, Bluetooth, WiFi (MQTT) |
| Værktøj | værktøjskassen + Kør/Stop + terminal | **Dashboard** (knapper, målere, grafer) |

**Tommelfingerregel:** REPL'en (terminalen) er til at *programmere* med. **Dashboardet** er til at *styre* med, mens programmet kører. Vi bruger USB/seriel hele vejen i trin 5–20 og åbner først Bluetooth/WiFi + dashboard i Del 3.

### Sådan kører du et program
1. Byg blokkene i værktøjskassen.
2. BIPES laver automatisk MicroPython-kode ud fra blokkene (du kan se den i kode-fanen).
3. Klik **Kør** — koden køres på Pico'en over seriel.
4. Følg med i **terminalen**. Et program der kører i en uendelig løkke stoppes med **Stop**.

---

## Del 1: Python som blokke (trin 5–8)

I de første trin lærer vi sproget at kende — uden hardware. Alt køres over seriel, og output ses i terminalen.

### Trin 5: Print og tekst

**Mål:** Få Pico'en til at skrive tekst i terminalen.

**Blokke** (kategori **Text** + **Functions/▶ Kør**):
- `print` (Text)
- tekststreng `" "` (Text)

**Sådan:** Sæt en tekststreng `"Hejsa"` ind i `print`-blokken. Kør → `Hejsa` står i terminalen.

<iframe src="https://bipes.teknologiskolen.dk/embed?uid=SHARE_ID&block=0&lock=1" width="100%" height="180" style="border:1px solid #ccc"></iframe>

**Opgave 1:** Få `print` til at skrive **to** tekststrenge. Brug `create text with`-blokken (Text) til at sætte dem sammen, fx `"Hej "` + `"verden"`.

---

### Trin 6: Variabler

**Mål:** Gemme tal og tekst i variabler og bruge dem igen.

**Blokke** (kategori **Variables**, **Math**, **Text**):
- `set [variabel] to` (Variables) — opret variabler `alder` og `fornavn`
- tal-blok `7` (Math), tekst-blok `"Anna"` (Text)
- `print` + `create text with` (Text)

**Sådan:**
1. `set alder to 7`
2. `set fornavn to "Anna"`
3. `print` af `create text with [fornavn] [" er "] [alder] [" år gammel."]`

<iframe src="https://bipes.teknologiskolen.dk/embed?uid=SHARE_ID&block=1&lock=1" width="100%" height="280" style="border:1px solid #ccc"></iframe>

> **Husk om variabelnavne:** de må ikke starte med et tal (`var40` er ok, `40var` er ikke), og må ikke have mellemrum — brug `_`, fx `bil_hastighed`.

---

### Trin 7: Betingelser og løkker

**Mål:** Få programmet til at gøre noget *bestemt*, når en betingelse er opfyldt.

**Blokke** (kategori **Logic** + **Loops**):
- `if / do` og `else` (Logic) — klik på **tandhjulet** på `if`-blokken for at tilføje `else if` (elif) og `else`
- sammenligning `[ ] = [ ]` (Logic) — kan også vælge `≠ > ≥ < ≤`
- `and` / `or` (Logic)
- `repeat while [ ] do` (Loops)

**Sådan (Batman-eksemplet):** Sæt et navn i en variabel og tjek det:

<iframe src="https://bipes.teknologiskolen.dk/embed?uid=SHARE_ID&block=2&lock=1" width="100%" height="300" style="border:1px solid #ccc"></iframe>

**Opgave 1:** Udvid betingelsen, så den også tjekker for `"batman"` med lille b (brug en `or`-blok).

**Opgave 2:** Brug `else if` (elif) til at tjekke for flere navne, fx både `Batman` og `Robin`.

**Opgave 3:** Hvordan kan man blive ved med at spørge, indtil der skrives noget bestemt? Brug en `repeat while`-løkke, hvor det indvendige køres "så længe" betingelsen er opfyldt.

---

### Trin 8: Løkker og pauser

**Mål:** Gentage kode — for altid eller et bestemt antal gange — med pauser imellem.

**Blokke** (kategori **Loops** + **Timing**):
- `repeat while true` (Loops) — svarer til `while True:`
- `count with [i] from [1] to [10] by [1]` **eller** `repeat [10] times` (Loops) — svarer til `for`-løkken
- `print` (Text)
- pause-blok (**Timing**): `sleep [1] sec` / `delay [ ] ms`

**Sådan (uendelig løkke):** en `while true`-løkke der printer og holder pause:

<iframe src="https://bipes.teknologiskolen.dk/embed?uid=SHARE_ID&block=3&lock=1" width="100%" height="220" style="border:1px solid #ccc"></iframe>

> Programmet stopper aldrig af sig selv — tryk **Stop** for at afbryde det.

**For-løkke:** Vil du gentage et **bestemt** antal gange, så brug i stedet en `count`- eller
`repeat [10] times`-blok (Loops). Bemærk at den tæller fra 0, så 10 gentagelser giver 0–9.

**Vigtigt om pauser:** I et almindeligt program (trin 5–20) bruger du **pause-blokken** fra **Timing**. Når vi senere laver runtime-programmer med dashboard (Del 3), skal du i stedet bruge **`wait … ms`**-blokken — den holder pause *uden* at blokere robotten, så seriel/Bluetooth/WiFi stadig svarer.

---

## Del 2: Hardware med blokke (trin 9–20)

Nu kobler vi hardware på. Blokkene til pins ligger i kategorien **Machine**; sensor- og motorblokke ligger under deres egne biblioteks-kategorier.

### Trin 9: Den indbyggede lysdiode (LED)

**Mål:** Få den indbyggede LED til at blinke.

**Blokke** (kategori **Machine** + **Timing**):
- `Initialize Pin` — pin `"LED"`, mode **OUT** (gem den evt. i en variabel `led`)
- `set pin [ ] to [ ]` (skriv digital værdi: `1` = tændt/3,3V, `0` = slukket)
- `repeat while true` (Loops) + pause-blok (Timing)

**Sådan:** I en `while true`-løkke: sæt pin til `1` → pause 1 sek → sæt pin til `0` → pause 1 sek.

Blokkene er **de samme** som i **Trin 10** (se det interaktive eksempel dér) — men sæt pinnen
til `LED` i stedet for et tal.

> **Pico W vs. Pico:** På Pico **W** hedder den indbyggede LED `"LED"`. På en almindelig Pico bruges pin-nummer `25`.

**Opgave 1:** Brug i stedet en **toggle** (vend tilstand). Hvis der ikke er en toggle-blok, så læs pinnens nuværende værdi med `Read digital pin` og skriv den modsatte tilbage — så blinker den med kun ét sæt blokke i løkken.

---

### Trin 10: Lysdiode på breadboard

**Mål:** Få en **ekstern** LED på et breadboard til at blinke.

**Kredsløb:** LED i serie med en **120 Ω** modstand (brun-rød-brun). Det lange ben (+) mod **GP4** (ben 6 fra USB-enden), det andet til **GND** (ben 3).

**Blokke:** `set pin [4] to [ ]` (Machine) + pause-blok i en `while true`-løkke. **Pin 4 = GP4 =
din fysiske lysdiode på breadboardet** (ikke den indbyggede LED).

<iframe src="https://bipes.teknologiskolen.dk/embed?uid=SHARE_ID&block=4&lock=1" width="100%" height="260" style="border:1px solid #ccc"></iframe>

---

### Trin 11: Knap

**Mål:** Læse et tryk på en knap.

**Kredsløb:** Knap på **GP3**. Enten med en ekstern **10 kΩ** pull-up modstand (brun-sort-orange), eller — nemmere — med Pico'ens **indbyggede** pull-up/pull-down.

**Blokke — metode A (rå, kategori Machine):**
- `Initialize Pin` pin `3`, mode **IN**, evt. **Pull** = PULL_DOWN (eller PULL_UP)
- `Read digital pin [3]` brugt i en `if`-blok
- `repeat while true`

Pull-up: tryk giver `0` → tjek `Read digital pin == 0`. Pull-down: tryk giver `1` → tjek `== 1`.

<iframe src="https://bipes.teknologiskolen.dk/embed?uid=SHARE_ID&block=5&lock=1" width="100%" height="280" style="border:1px solid #ccc"></iframe>

**Blokke — metode B (bibliotek Buttons, anbefalet):**
- `Create Button Hub` (én gang)
- `Add` button — **Pin** `3`, **Pull**
- `Was Pressed [3]` (sand én gang per tryk) eller `Is Down [3]` (sand mens den holdes)

Det giver renere blokke og klarer "afhopning" (debounce) for dig.

**Opgave (tænkeopgave):** Byg om, så du i stedet kan bruge `if button.value() == 1`. (Skift mellem pull-up og pull-down — se hint i original-guiden.)

**Opgave:** Brug knappen til at **tænde/slukke** den eksterne LED fra trin 10. Tip: brug toggle.

**Ekstraopgave:** Knappen tænder LED'en, som automatisk slukker **5 sekunder** senere.

---

### Trin 12: Lyssensor (LDR) — analog input

**Mål:** Læse en **analog** værdi og styre LED-lysstyrken med den.

**Baggrund:** En LDR ændrer modstand efter lys. Pico'ens analoge indgange er **ADC0 (GP26)**, **ADC1 (GP27)**, **ADC2 (GP28)**. De omsætter 0–3,3 V til et tal **0–65535**. LDR'en sættes i en spændingsdeler med en fast **10 kΩ** modstand.

**Blokke** (kategori **Machine**):
- `Read RPI Pico ADC Input` på pin **26** → tal 0–65535
- `PWM` opret på pin **4**, sæt **frekvens** 1000, sæt **Duty Cycle** (0–65535)
- `repeat while true` + variabel til den læste værdi

<iframe src="https://bipes.teknologiskolen.dk/embed?uid=SHARE_ID&block=6&lock=1" width="100%" height="300" style="border:1px solid #ccc"></iframe>

**Opgave A:** Dæk for LDR'en (helt mørkt). Hvilken værdi får du i terminalen?
**Opgave B:** Lys på den. Hvilken værdi nu?

**Opgave (tænkeopgave):** Få LED'en til at lyse **kraftigere jo mørkere** der bliver. Tip: sæt duty til `65535 - ldr_value`.

---

### Trin 13: Potentiometer

**Mål:** Som LDR'en, men med et potentiometer (en drejelig variabel modstand / spændingsdeler).

**Blokke:** Helt som trin 12 — `Read RPI Pico ADC Input` på pin **26** + `PWM` på pin **4**.
Brug samme blok-eksempel (potentiometeret sættes blot på ADC-pinnen i stedet for LDR'en):

<iframe src="https://bipes.teknologiskolen.dk/embed?uid=SHARE_ID&block=6&lock=1" width="100%" height="300" style="border:1px solid #ccc"></iframe>

**Opgave:** Lav i stedet et program, hvor potentiometeret styrer **hvor hurtigt** LED'en blinker (brug den læste værdi som pause-tid i en blinke-løkke).

---

### Trin 14: Linjesensor

**Mål:** Læse en analog IR-linjesensor (skelner hvid/sort overflade).

**Kredsløb:** Sensoren har 3 ben (`+`, `O`, `-`). Det analoge signal `O` læses på en ADC-pin.

**Blokke:** `Read RPI Pico ADC Input` på pin **26**, print værdien hver 100 ms (pause-blok i ms).

<iframe src="https://bipes.teknologiskolen.dk/embed?uid=SHARE_ID&block=7&lock=1" width="100%" height="240" style="border:1px solid #ccc"></iframe>

> Prøv at bevæge sensoren hen over hvidt og sort papir og se forskellen i tallene.

---

### Trin 15: Pico Robotics board fra Kitronik

**Mål:** Gøre klar til at styre motorer og servoer.

Robotics-boardet styrer DC-motorer og servoer og forsyner både Pico og motorer med strøm. Pico'en monteres direkte ned i boardet.

**Bibliotek:** Brug af boardet kræver biblioteket `PicoRobotics` på enheden (se **Del 5**).

**Blokke** (kategori **Robotics board / Kitronik**):
- `Create the Kitronik Robotics board` → placeres øverst, før motor-/servo-blokkene.

Du ser `Create the Kitronik Robotics board`-blokken i de næste eksempler (Trin 16 og 17), hvor
den står som den første blok.

---

### Trin 16: DC-motor

**Mål:** Styre en DC-motor frem og tilbage med en hastighed (0–100).

**Kredsløb:** Motor i en motor-udgang på boardet, batteriforsyning på, power-switch tændt.

**Blokke** (Kitronik):
- `Create the Kitronik Robotics board` (`board`)
- `Motor On` — **Motor** `1`, retning (`"f"`/`"r"`), hastighed `0–100`
- `Motor Off` — **Motor** `1`
- `repeat while true` + pause i ms

<iframe src="https://bipes.teknologiskolen.dk/embed?uid=SHARE_ID&block=8&lock=1" width="100%" height="320" style="border:1px solid #ccc"></iframe>

**Opgave 1:** Få motoren til at køre fremad med hastighed **25**.
**Opgave 2:** Få motoren til at skifte mellem at køre fremad og baglæns.
**Opgave 3:** Få motoren til langsomt at skrue op fra 0 til 100. Tip: brug en løkke med en variabel, der tæller op og styrer hastigheden.

---

### Trin 17: Servomotor

**Mål:** Stille en servo i bestemte vinkler (0–180°).

**Blokke** (Kitronik):
- `Create the Kitronik Robotics board` (`board`)
- `Servo Write` — **Servo** `1`, vinkel `0`/`90`/`180`
- `repeat while true` + pause

<iframe src="https://bipes.teknologiskolen.dk/embed?uid=SHARE_ID&block=9&lock=1" width="100%" height="380" style="border:1px solid #ccc"></iframe>

**Opgave:** Få servoen til at bevæge sig **flydende** mellem 0 og 180°. Tip: en `count`-løkke der tæller vinklen op (og ned) ét grad ad gangen med en lille pause.

---

### Trin 18: NeoPixel og LED-strip

**Mål:** Styre farve på NeoPixels (RGB-lysdioder i en kæde).

**Bibliotek:** Kræver `neopixel`-biblioteket på enheden (se **Del 5**). Data-ben på **GP28**.

**Blokke** (kategori **NeoPixel**):
- `Create Neopixel` — antal LED'er, **State Machine** `0`, **Pin** `28` → gem i `pixels`
- farve-blok (RGB)
- `Brightness` (1–255)
- `Set Pixel` — **Pixel Num**, farve, **How Bright**
- `Show` (opdatér strippen — kald altid efter du har sat pixels)

<iframe src="https://bipes.teknologiskolen.dk/embed?uid=SHARE_ID&block=10&lock=1" width="100%" height="420" style="border:1px solid #ccc"></iframe>

**Opgave 1:** Lav et program hvor de 2 NeoPixels skifter mellem **gul** og **grøn**, så den ene er gul mens den anden er grøn — og omvendt.

**LED-strip:** Mange LED-strips bruger samme slags NeoPixels (fx **WS2812B**) og kan erstatte de enkelte pixels. Datarækkefølgen kan variere — for WS2812B er den **GRB**, som angives som sidste parameter i `Create Neopixel`.

**Opgave 2:** Test LED-strippen ved at sætte antal LED'er og farverækkefølge (`"GRB"`) rigtigt.

---

### Trin 19: Sonarsensor (ultralyd, HC-SR04)

**Mål:** Måle afstand til ting med ultralyd.

**Bibliotek:** Kræver `hcsr04`-biblioteket på enheden (se **Del 5**). Pins: **Trig** og **Echo** (her 2 og 3).

**Blokke** (kategori **HC-SR04**):
- `Create HCSR04` — **Trigger Pin** `2`, **Echo Pin** `3` → gem i `sensor`
- `Distance Cm`
- `repeat while true` + print + pause

<iframe src="https://bipes.teknologiskolen.dk/embed?uid=SHARE_ID&block=11&lock=1" width="100%" height="280" style="border:1px solid #ccc"></iframe>

**Opgave (afstands-trafiklys):** Kombinér med NeoPixels (trin 18). Skriv et program der lyser:
- **rødt** hvis afstanden < 10 cm,
- **gult** hvis afstanden er mellem 10 og 20 cm,
- **grønt** hvis afstanden > 20 cm.

Blokke: `Distance Cm` i en variabel → `if / else if / else` (Logic) → `Set Pixel` + `Show` med den rigtige farve.

Færdigt eksempel:

<iframe src="https://bipes.teknologiskolen.dk/embed?uid=SHARE_ID&block=12&lock=1" width="100%" height="520" style="border:1px solid #ccc"></iframe>

---

### Trin 20: Biblioteker på enheden

I Thonny henter man et bibliotek (`.py`-fil) og bruger **"Save copy to Raspberry Pi Pico"** for at lægge det på enheden. I BIPES hører biblioteks-blokkene med til platformen, men den tilhørende `.py`-fil skal **ligge på Pico'en**, før blokkene virker:

- **Kitronik PicoRobotics** → `PicoRobotics.py`
- **NeoPixel** → `neopixel.py`
- **HC-SR04** → `hcsr04.py`
- **BIPES runtime** → `bipes_runtime.py` (nødvendig til Del 3 — runtime/dashboard)

I BIPES lægges disse på enheden via **enheds-/fil-værktøjet** (send/gem fil på enheden over USB). Læg dem på, før du kører programmerne i trin 15–19.

> Samme biblioteker som original-guiden:
> - Kitronik: https://github.com/KitronikLtd/Kitronik-Pico-Robotics-Board-MicroPython
> - NeoPixel: https://github.com/blaz-r/pi_pico_neopixel
> - HC-SR04: https://github.com/rsc1975/micropython-hcsr04

---

## Del 3: Runtime, dashboard og trådløs styring

Indtil nu har vi *kørt* programmer og kigget på print i terminalen. Nu vil vi **styre og overvåge** robotten **mens** den kører — det er **runtime-tilstand**, og det foregår på **Dashboardet**.

### Hvorfor ikke bare REPL'en?
Når robotten kører i en uendelig løkke, er REPL'en optaget eller utilgængelig. Derfor bruger dashboardet **ikke** REPL'en til at styre med — det bruger en **runtime-besked-protokol**. Det samme gælder uanset om du er på USB, Bluetooth eller WiFi.

### Runtime-blokkene (kategori med "On Start / On Message …")
Du bygger et runtime-program ved at fortælle eksplicit, hvad der skal ske ved hver hændelse:

| Blok | Hvad den gør |
|---|---|
| **On Start** `Do …` | Kører **én gang** ved start. Sæt en sikker tilstand (fx motorer slukket). |
| **On Message** `[Navn] , [Værdi]` `Do …` | Kører for **hver kommando** der kommer ind (dashboard-knap/-skyder eller en anden enhed). Tjek **Navn** og handl på **Værdi**. |
| **On Connect** / **On Disconnect** `Do …` | Når browseren forbinder / falder fra. Programmet kører videre. |
| **On Stop** `Do …` | Kører når programmet stoppes (Stop-knap, watchdog, exit). Sæt en sikker tilstand her. |
| **wait `[ ]` ms** | Pause i en løkke **uden** at blokere — seriel/BT/WiFi forbliver i live. Brug denne i runtime-løkker. |
| **Send to dashboard** `[Navn] = [værdi]` | Send telemetri. En måler/graf bundet til **Navn** opdateres live. |
| **Serial Send** `[tekst]` | Send en rå tekstlinje til terminalen. |

> **Vigtigt:** Samme `On Message`-logik virker ens over seriel, Bluetooth og WiFi. Du skifter kun **start-blokken** (se nedenfor) — resten af programmet er det samme.

### A) Runtime over USB / seriel

**Mål:** Styre robotten fra dashboardet over USB.

Byg et program:
1. **On Start** → sikker tilstand (fx `Motor Off`).
2. **On Message** → tjek `Navn`: hvis `"drive"` → kør motorer med `Værdi`; hvis `"stop"` → `Motor Off`.
3. En løkke (async) der sender telemetri: **Send to dashboard** `"afstand" = Distance Cm` + **wait 200 ms**.
4. Afslut programmet med **`Run program over USB / Serial`** (placeres til sidst).

Kør programmet, og **åbn Dashboard**. Tilføj en **knap** der sender `drive`, og en **måler/graf** bundet til `afstand`. Nu styrer du robotten uden at røre koden.

> Mønstret svarer til `runtime_demo.py`: `On Start` = sikker tilstand, `On Message` = kommando-modtager, løkken sender telemetri.

### B) Runtime over Bluetooth (BLE)

**Mål:** Trådløs RF-agtig styring (joystick/knapper) + telemetri.

Det er **samme program** som i A — men afslut med **`Run Program Over Bluetooth Named [PicoW-Robot]`** i stedet for serial-blokken. Dashboardet forbinder så over Bluetooth, og dine `On Message`/`Send to dashboard`-blokke virker uændret.

**Sikkerheds-timeout (vigtigt for robotter):** Hvis der ikke kommer en drive-kommando i fx 300–500 ms, så **stop motorerne**. Lav det ved at gemme tidspunktet for sidste kommando i `On Message` og tjekke det i løkken — så kører robotten ikke videre, hvis forbindelsen falder ud.

### C) Runtime over WiFi (MQTT)

**Mål:** Styre over WiFi via dashboardet (MQTT).

Igen **samme program**, men afslut med **`Run Program Over WiFi`** eller **`Start Over WiFi (From Secrets)`**. Den læser WiFi-navn/-kode (og broker) fra en `secrets.json` på enheden. Dashboardet taler så med robotten over MQTT — samme `On Message`/`Send to dashboard`.

---

## Del 4: Upload af ny kode trådløst

I **program-tilstand** kan ny kode komme på Pico'en ad tre veje:

### Over USB (seriel REPL)
Standard: byg blokke → **Kør** (lægger programmet som `blocks.py` og starter det).

### Over Bluetooth
Når robotten kører som **Bluetooth runtime-enhed** (Del 3B), holder den forbindelsen åben til både styring **og** fil-håndtering. BIPES kan da uploade et nyt `blocks.py` **over Bluetooth** — som en trådløs programmeringskabel. Du behøver ikke USB-kablet for at lægge nyt program på.

### Over WiFi (OTA — Over The Air)
Med blokken **`Apply OTA Update From [URL]`** henter enheden et nyt program over HTTP, gemmer det som `blocks.py` og **genstarter** ind i det. For at undgå at ødelægge det sidste virkende program sker det i trin: hent som `.tmp` → tjek checksum → byt om til `blocks.py` → genstart.

> **Bemærk:** *Biblioteker* (fx `bipes_runtime.py`) kan **ikke** installeres over WiFi — de skal lægges på over **USB** første gang (se Del 5). OTA opdaterer kun selve programmet.

---

## Hurtig oversigt: Thonny → BIPES

| Thonny | BIPES |
|---|---|
| Skrive Python i editoren | Trække **blokke** i værktøjskassen |
| **Shell** | **Terminal** (seriel REPL) |
| **Run (F5)** | **Kør** (genererer kode + kører over seriel) |
| **Stop** | **Stop** |
| `print(...)` ses i Shell | `print`-blok ses i terminalen |
| `import machine` / `Pin` / `ADC` / `PWM` | **Machine**-kategorien |
| `import PicoRobotics` / `neopixel` / `hcsr04` | biblioteks-kategorierne (Kitronik / NeoPixel / HC-SR04) |
| (intet) | **Dashboard** + runtime-blokke (On Start / On Message / Send to dashboard) |
| "Save copy to Raspberry Pi Pico" | enheds-/fil-værktøjet (send fil til enheden) |
| (intet) | trådløs upload: Bluetooth + WiFi **OTA** |
