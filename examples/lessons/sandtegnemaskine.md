# Sandtegnemaskinen — tegn med en magnet og en kugle

Forestil dig et bord fyldt med fint sand. Under sandet gemmer der sig en lille magnet, og oven på sandet ligger en blank stålkugle. Når magneten bevæger sig, følger kuglen med — og bag sig efterlader den et fint spor i sandet. Med den rigtige bevægelse kan maskinen tegne spiraler, blomster, stjerner og mønstre, der ser ud som ren magi.

Men det er ikke magi. Det er **to motorer, to arme og en god portion matematik**. I dette forløb bygger og programmerer du din egen sandtegnemaskine, og undervejs lærer du noget, som rigtige robotarme i fabrikker bruger hver eneste dag.

## Hvad er en SCARA-robot?

Maskinen er bygget som en **SCARA-arm** (det betyder "Selective Compliance Assembly Robot Arm" — men du skal bare huske, at det er en arm med to led, ligesom din egen arm har en skulder og en albue).

- Et **skulder-led** drejer hele armen rundt.
- Et **albue-led** knækker armen på midten.

Ved at dreje de to led i forskellige vinkler kan spidsen af armen (hvor magneten sidder) nå næsten alle punkter på bordet. Det smarte er, at **begge motorer står helt stille nede ved bunden** — de bevæger sig ikke med armen. Det klarer en lille **gearkasse**, og det gør armen let og hurtig. Mere om det senere.

To **hall-sensorer** (magnetfølere) hjælper robotten med at finde sit nulpunkt, hver gang den tændes — det kaldes *homing*.

> **Det store spørgsmål i hele forløbet:** Motorerne kan kun *dreje rundt*. Hvordan i alverden tegner man så en helt **lige streg** med noget, der kun kan dreje? Det finder vi ud af i Trin 4 og 5.

---

## Trin 1: Materialer

Til hardwaredelen skal du bruge:

- Raspberry Pi Pico W
- 2 × stepmotor
- 2 × stepmotor-driver
- 2 × hall-sensor
- 2 × magnet
- 4 × kuglelejer
- Strømforsyning
- Micro-USB-adapter
- Diverse ledninger

Resten af delene (sandbord, arme, tandhjul) er laserskåret og 3D-printet — dem samler vi i Trin 7.

---

## Trin 2: Hall-sensoren (maskinens følesans)

En **hall-sensor** kan mærke en magnet **uden at røre den**. Når en magnet kommer tæt på, skifter sensorens signal fra 1 (ingen magnet) til 0 (magnet tæt på). Det er ligesom en kontakt, der trykkes ned af et usynligt tryk fra magneten.

Hvorfor er det nyttigt? Fordi robotten ikke ved, hvor den står, når den lige er tændt. Vi sætter en lille magnet fast på hver arm, og når armen drejer hen forbi hall-sensoren, *ved* robotten præcis, hvor nul er. Det bruger vi til homing i Trin 8.

| Hall-sensor | Forbundet til | Hvad den gør |
|---|---|---|
| VCC | 3V3 | Strøm |
| GND | GND | Stel |
| Signal | en GP-pin | 0 = magnet tæt på, 1 = ingen magnet |

### Afprøv din hall-sensor

Prøv dette lille program. Det læser sensoren 5 gange i sekundet og skriver i terminalen, om den kan mærke magneten. Hold en magnet hen til sensoren og se, hvad der sker.

```python
from machine import Pin
import time

# Hall-sensoren sidder på GP16 (skift til din egen pin)
hall = Pin(16, Pin.IN, Pin.PULL_UP)

while True:
    if hall.value() == 0:       # 0 = magnet tæt på
        print("MAGNET FUNDET")
    else:
        print("INGEN MAGNET")
    time.sleep(0.2)
```

Samme program i blokke ser sådan ud (du kan trække blokkene direkte ind i BIPES med knappen **Copy blocks**):

<iframe src="https://DIN-BIPES-HOST/embed?xml=PHhtbCB4bWxucz0iaHR0cHM6Ly9kZXZlbG9wZXJzLmdvb2dsZS5jb20vYmxvY2tseS94bWwiPjxibG9jayB4PSIyMCIgeT0iMjAiIHR5cGU9ImNvbnRyb2xzX3doaWxlVW50aWwiPjxmaWVsZCBuYW1lPSJNT0RFIj5XSElMRTwvZmllbGQ%2BPHZhbHVlIG5hbWU9IkJPT0wiPjxibG9jayB0eXBlPSJsb2dpY19ib29sZWFuIj48ZmllbGQgbmFtZT0iQk9PTCI%2BVFJVRTwvZmllbGQ%2BPC9ibG9jaz48L3ZhbHVlPjxzdGF0ZW1lbnQgbmFtZT0iRE8iPjxibG9jayB0eXBlPSJjb250cm9sc19pZiI%2BPG11dGF0aW9uIGVsc2U9IjEiPjwvbXV0YXRpb24%2BPHZhbHVlIG5hbWU9IklGMCI%2BPGJsb2NrIHR5cGU9ImxvZ2ljX2NvbXBhcmUiPjxmaWVsZCBuYW1lPSJPUCI%2BRVE8L2ZpZWxkPjx2YWx1ZSBuYW1lPSJBIj48YmxvY2sgdHlwZT0ibWFjaGluZS5QaW4uZ2V0VmFsdWUiPjx2YWx1ZSBuYW1lPSJwaW4iPjxzaGFkb3cgdHlwZT0icGlub3V0Ij48ZmllbGQgbmFtZT0iUElOIj4xNjwvZmllbGQ%2BPC9zaGFkb3c%2BPC92YWx1ZT48ZmllbGQgbmFtZT0iUFVMTCI%2BUGluLlBVTExfVVA8L2ZpZWxkPjwvYmxvY2s%2BPC92YWx1ZT48dmFsdWUgbmFtZT0iQiI%2BPGJsb2NrIHR5cGU9Im1hdGhfbnVtYmVyIj48ZmllbGQgbmFtZT0iTlVNIj4wPC9maWVsZD48L2Jsb2NrPjwvdmFsdWU%2BPC9ibG9jaz48L3ZhbHVlPjxzdGF0ZW1lbnQgbmFtZT0iRE8wIj48YmxvY2sgdHlwZT0idGV4dF9wcmludCI%2BPHZhbHVlIG5hbWU9IlRFWFQiPjxibG9jayB0eXBlPSJ0ZXh0Ij48ZmllbGQgbmFtZT0iVEVYVCI%2BTUFHTkVUIEZVTkRFVDwvZmllbGQ%2BPC9ibG9jaz48L3ZhbHVlPjwvYmxvY2s%2BPC9zdGF0ZW1lbnQ%2BPHN0YXRlbWVudCBuYW1lPSJFTFNFIj48YmxvY2sgdHlwZT0idGV4dF9wcmludCI%2BPHZhbHVlIG5hbWU9IlRFWFQiPjxibG9jayB0eXBlPSJ0ZXh0Ij48ZmllbGQgbmFtZT0iVEVYVCI%2BSU5HRU4gTUFHTkVUPC9maWVsZD48L2Jsb2NrPjwvdmFsdWU%2BPC9ibG9jaz48L3N0YXRlbWVudD48bmV4dD48YmxvY2sgdHlwZT0idXRpbWVfc2xlZXBfbXMiPjx2YWx1ZSBuYW1lPSJwSW4iPjxzaGFkb3cgdHlwZT0ibWF0aF9udW1iZXIiPjxmaWVsZCBuYW1lPSJOVU0iPjIwMDwvZmllbGQ%2BPC9zaGFkb3c%2BPC92YWx1ZT48L2Jsb2NrPjwvbmV4dD48L2Jsb2NrPjwvc3RhdGVtZW50PjwvYmxvY2s%2BPC94bWw%2B&lock=1" width="100%" height="240" frameborder="0"></iframe>

**Prøv selv:**

- Hvor langt væk kan sensoren mærke magneten? Prøv at flytte magneten langsomt tættere på.
- Vend magneten om. Virker den stadig? (Hall-sensorer mærker kun den ene pol!)
- Kan du få sensoren til at tænde den indbyggede LED i stedet for at skrive i terminalen?

---

## Trin 3: Stepmotoren (præcise skridt)

En almindelig motor snurrer bare rundt — du kan ikke styre præcist, hvor langt den drejer. En **stepmotor** er anderledes: den drejer i små, nøjagtige **trin** (steps). Tæller du trinene, ved du *præcis*, hvor langt og hvilken vej motoren har drejet.

Vores motorer tager **4096 trin på én hel omgang**. Det betyder, at ét trin kun er ca. **0,09 grader** — det er ufatteligt præcist, og det er lige netop dét, der gør, at maskinen kan tegne pæne mønstre.

Stepmotoren styres ikke direkte af Pico'en — imellem sidder en **driver**, der leverer den kraftige strøm, motoren har brug for. Pico'en sender bare små signaler ("tag et trin frem", "tag et trin tilbage"), og driveren klarer resten.

### Afprøv din stepmotor

Gå ind i kategorien **Sandtegnemaskine** og installér testscriptet. Kør det og hold øje med motoren:

- Drejer den begge veje?
- Kan du høre/se de enkelte trin?
- Hvad sker der, hvis du beder om 4096 trin? (Et helt omdrejning!)

**Prøv selv:** Sæt et lille stykke tape på motorakslen som en viser. Bed motoren om at tage 1024 trin. Hvor meget er det af en hel omgang? (Tip: 1024 ÷ 4096 = ?)

---

## Trin 4: Kinematik — fra vinkler til position

Nu kommer den vigtigste idé i hele maskinen. **Kinematik** er læren om, hvordan ting bevæger sig — her: hvordan de to motorvinkler bestemmer, *hvor* pennen havner.

Når du kender **skuldervinklen** og **albuevinklen**, kan du regne dig frem til, hvor pennen er. Det kaldes **forlæns kinematik** ("jeg kender vinklerne — hvor er pennen?").

Tænk på din egen arm: drejer du skulderen og bøjer albuen i bestemte vinkler, ender din hånd ét bestemt sted. Robotten er præcis ligesådan — bare med to motorer i stedet for muskler.

Prøv det selv herunder. Træk i de to skydere (**skuldervinkel** og **albuevinkel**) og se, hvordan pennen (det røde punkt) flytter sig. Den grå cirkel viser alt det, pennen kan nå — robottens **arbejdsområde**.

<iframe src="https://DIN-MATERIALE-HOST/scara.html" width="100%" height="540" frameborder="0"></iframe>

**Prøv selv:**

- Kan du få pennen helt ud til kanten af den grå cirkel? Hvad skal albuevinklen være? (Tip: armen skal være helt strakt.)
- Kan du nå det samme punkt på *to* forskellige måder? (Det kan robotten faktisk ofte — "albue op" og "albue ned".)
- Hvilke punkter kan pennen **ikke** nå, selvom de er inden for cirklen?

Den lille matematik bag (du behøver ikke kunne den udenad):

```
albue-punkt:  E = ( L1·cos(skulder),            L1·sin(skulder) )
pen-punkt:    P = ( Ex + L2·cos(skulder+albue),  Ey + L2·sin(skulder+albue) )
```

`L1` og `L2` er længden af de to arme. `cos` og `sin` er to knapper på lommeregneren, der laver en vinkel om til et punkt på en cirkel.

---

## Trin 5: Fra drejning til streg

Her er gåden fra begyndelsen: motorerne kan kun **dreje**, men vi vil tegne en **lige streg**. Hvordan?

Svaret er et af de smarteste tricks i robotteknik: **vi snyder ved at dele stregen op i mange små stykker (segmenter).** I hvert delepunkt regner robotten ud, hvilke vinkler motorerne skal stå i (det kaldes **invers kinematik** — "jeg kender punktet, hvilke vinkler skal jeg bruge?"). Mellem to delepunkter drejer motorerne bare jævnt.

Med **få** segmenter buer pennen mærkbart mellem punkterne — stregen bliver krum. Med **mange** segmenter bliver buerne så små, at stregen ser helt ret ud.

Prøv det herunder. Træk i skyderen **Antal segmenter** og se forskellen mellem den streg, vi *ønsker* (grå, stiplet), og den vej robotten *faktisk* tegner (rød):

<iframe src="https://DIN-MATERIALE-HOST/segments.html" width="100%" height="470" frameborder="0"></iframe>

**Prøv selv:**

- Sæt antallet til **1**. Hvor krum bliver "stregen"?
- Hvor mange segmenter skal der til, før den røde vej ligner den grå streg? (Der findes ikke ét rigtigt svar — det handler om, hvor pænt det skal være.)
- Hvad koster det at have rigtig mange segmenter? (Tip: robotten skal regne og bevæge sig mere — det tager tid.)

Det allerbedste: i blokkene har `move_line`-blokken netop et felt, der hedder **segments**. Det er præcis den skyder, du lige har leget med — nu i den rigtige robot:

```python
robot.move_line(20, 10, segments=500)   # 500 små stykker -> meget lige streg
robot.move_line(20, 10, segments=5)     # 5 stykker -> tydeligt krum
```

---

## Trin 6: Gearkassen — hvorfor motorerne står stille

På de fleste robotarme sidder den ene motor ude på "albuen" og kører med rundt. Det gør armen tung og langsom. Vores maskine er klogere: **begge motorer står helt stille nede ved bunden**, og en lille **gearkasse** med tandhjul fører bevægelsen videre ud til albuen.

Fordele:

- **Let arm:** når motorerne ikke kører med, vejer den bevægelige del næsten ingenting → hurtigere og pænere tegninger.
- **Mere præcist:** den tunge del bliver stående, så der vrikker ikke noget.

En lille ulempe ved tandhjul hedder **slør** (backlash): når motoren skifter retning, er der et lillebitte "dødt" stykke, før tandhjulene griber fat den anden vej. Derfor har robottens kode et tal for slør (`backlash_deg`), så den kan regne det med. Og derfor er **homing** (Trin 8) så vigtig — robotten skal kende sit præcise nulpunkt.

---

## Trin 7: Byg maskinen

Nu skal delene samles. Følg videoen og byg roligt — og **test undervejs**: kør hall-sensor-testen (Trin 2) og stepmotor-testen (Trin 3) på hver motor, før du bygger videre. Det er meget nemmere at finde en fejl nu end til sidst.

*(Samleguide og video — undervejs.)*

Gode råd undervejs:

- Slib kanterne på tappene, før du sætter dem i bund- og toppladen.
- Sæt magneterne på armene, så de drejer tæt forbi hall-sensorerne (men ikke rører dem).
- Hold styr på, hvilken motor der er skulder (motor 1) og hvilken der er albue (motor 2).

---

## Trin 8: Homing — find nulpunktet

Hver gang robotten tændes, aner den ikke, hvor armene står. **Homing** løser det: robotten drejer langsomt hver arm, indtil magneten på armen passerer hall-sensoren. I det øjeblik siger robotten: *"Her er nul!"* Derfra kan den tælle alle bevægelser præcist — fordi den nu kender sit udgangspunkt.

Det er den samme idé som i Trin 5: når robotten kender nul og kan regne vinkler (kinematik), kan den ramme ethvert punkt.

Gå ind i kategorien **Sandtegnemaskine** og installér scriptet **ZerroStepper.py**. Kør det og se, hvad der sker:

- Drejer armene langsomt, indtil de "fanger" magneten?
- Stopper de det rigtige sted?

**Prøv selv:** Hold øje med hvilken vej hver arm søger. Hvis en arm drejer den forkerte vej og aldrig finder sensoren, skal dens *homing-retning* vendes om i koden (`homing_dir_shoulder` / `homing_dir_elbow`).

---

## Trin 9: Tegn dine egne mønstre

Nu er alt klar — robotten ved, hvor den er, og kan regne sig frem til ethvert punkt. Tid til at tegne!

Robotten styres med nogle få, kraftige blokke (kategorien **Sandtegnemaskine**). Bag hver blok gemmer sig al den kinematik og segment-opdeling, du har lært om — så du kan koncentrere dig om *mønstret*:

```python
from sand_table_robot import SandTableRobot

# Opret robotten (skift pins og armlængder til dine egne)
robot = SandTableRobot(
    motor1_pins=[2, 3, 4, 5],
    motor2_pins=[6, 7, 8, 9],
    sensor_shoulder_pin=14,
    sensor_elbow_pin=15,
    L1=31.0, L2=31.0)

robot.home()                              # find nulpunktet
robot.move_line(20, 10, segments=500)     # ret streg til (20, 10)
robot.draw_spiral(max_radius=30, vindinger=10)
robot.draw_flower(max_radius=30, petals=5)
robot.off()                               # sluk motorerne
```

| Blok | Hvad den gør |
|---|---|
| `home` | Finder nulpunktet med hall-sensorerne |
| `move_line(x, y, segments)` | Tegner en ret streg til (x, y) — `segments` styrer hvor lige |
| `move_arc(...)` | Tegner en bue |
| `draw_spiral(...)` | Tegner en spiral |
| `draw_flower(...)` | Tegner en blomst |
| `run_gcode_text(...)` | Følger en tegning skrevet i **G-code** (samme "sprog" som 3D-printere og fræsere bruger) |
| `off` | Slukker motorerne, så de ikke bliver varme |

To færdige eksempler kan du åbne direkte i BIPES (de deles som projekter, ikke som indlejringer, fordi de er store programmer):

- **robot_g2** — opret, home, et par streger og en spiral.
- **robot_g3** — den samme robot, men styret med **G-code**.

### Udfordringer

**Niveau 1 — Dit eget mønster:** Kombinér `move_line` og `move_arc` til at tegne dine initialer eller en simpel figur.

**Niveau 2 — Leg med segmenter:** Tegn den samme store streg med `segments=5` og bagefter `segments=500`. Kan du se forskellen i sandet? Hvornår kan det betale sig at bruge mange segmenter, og hvornår er det spild af tid?

**Niveau 3 — G-code:** Find en lille G-code-tegning på nettet (eller skriv din egen), og kør den med `run_gcode_text`. Kan du få robotten til at tegne et hus som det, du måske lavede i vækkeur-forløbet?

---

## Hvad har vi lært i hele forløbet?

Tillykke — du har bygget en rigtig tegnerobot!

**Matematik & kinematik:** Vinkler, `sin`/`cos` og hvordan to vinkler bliver til ét punkt (forlæns kinematik). Hvordan man regner den anden vej (invers kinematik). Og hvordan en **lige streg** opstår ved at dele den op i mange små **segmenter** — en kæmpe idé, som rigtige robotter bruger overalt.

**Programmering:** Løkker, betingelser, funktioner og biblioteker. At kalde færdige blokke, der gemmer svær matematik væk.

**Elektronik:** GPIO-pins, hall-sensorer som digitale indgange, og stepmotorer styret gennem drivere.

**Hardware:** En SCARA-arm med to led, en gearkasse der holder motorerne i ro, og homing med magnetfølere.

**Problemløsning:** At teste hver del for sig, før man sætter det hele sammen — og at dele et stort problem (tegn en streg) op i mange små, der er nemme at løse.
