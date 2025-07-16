// Page blocks (blockly)
Blockly.Msg["LOGIC"] = "Logik";
Blockly.Msg["LOOPS"] = "Løkker";
Blockly.Msg["MATH"] = "Matematik";
Blockly.Msg["TEXT"] = "Tekst";
Blockly.Msg["LISTS"] = "Lister";
Blockly.Msg["VARIABLES"] = "Variable";
Blockly.Msg["FUNCTIONS"] = "Funktioner";
Blockly.Msg["TIMING"] = "Tidstagning";
Blockly.Msg["MACHINE"] = "Maskine";
Blockly.Msg["PINS"] = "Pins";
Blockly.Msg["MICROCONTROLLER"] = "Mikrocontroller";
Blockly.Msg["DISPLAYS"] = "Skærme";
Blockly.Msg['SENSORS'] = "Sensorer";
Blockly.Msg['OUTPUTS'] = "Aktuatorer";
Blockly.Msg['SOUNDS'] = "Lyde";
Blockly.Msg['COMM'] = "Kommunikation";
Blockly.Msg['TEMP_HUMI'] = "Temperatur og Fugtighed";
Blockly.Msg['PRESS'] = "Tryk";
Blockly.Msg['FILES'] = "Filer";
Blockly.Msg['NET'] = "Netværk og Internet";
Blockly.Msg['CONTROL'] = "Styring";
Blockly.Msg['SIMULATE'] = "Simulering";
Blockly.Msg['IMU'] = "Inertimåling";
Blockly.Msg['AIR'] = "Luftkvalitet";
Blockly.Msg['INSTALL_LIBRARY'] = "Installer bibliotek";
Blockly.Msg['DOCUMENTATION'] = "Dokumentation";
Blockly.Msg['DOCUMENTATION_HOW'] = "Dokumentation og hvordan man tilslutter";
Blockly.Msg['LOAD_EXAMPLE'] = "Indlæs eksempel";

var Msg = {
  // Pages names
'PageBlocks':'Blokke',
'PageDevice':'Enhed',
'PageFiles':'Filer',
'PageNotification':'Beskeder',
'PageProject':'Projekter',
'PagePrompt':'Konsol',
'PageDashboard':'Dashboard',
'PageFreeboard':'Freeboard',

  // Common actions
'Download':'Download',
'Remove':'Fjern',
'Delete':'Slet',
'Write':'Skriv',
'WriteToDevice':'Skriv til enhed',
'Rename':'Omdøb',
'New':'Ny',
'Share':'Del',
'UpdateShared':'Opdater delt',
'Unshare':'Fjern deling',
'Upload':'Upload',
'Import':'Importer',
'Filename':'Filnavn',
'eg':"fx.",
Copy:'Kopiér',
ClearAll:'Ryd alt',

// Channel
NotConnectedWarning:'Ingen forbindelse oprettet til enheden.',

  // Page Files
'FileManager':'Filhåndtering',
'HideShowProjectTree':'Skjul/vis projekttræ',
'DirectoriesNotExistMapped':"Nogle mapper findes ikke eller er ikke blevet kortlagt.",
'NewFolder':'Ny mappe',
'NewFile':'Ny fil',
'UploadFile':'Upload fil',
'RemoveFolder':'Fjern mappe',
'ExecuteScript':'Kør script',
'ScriptFinishedExecuting':'Scriptet er færdigt med at køre!',
'Empty':'Tom',
'FileNotExist':"Filen findes ikke.",
'FileAlreadyExist':'Filen "{0}" findes allerede i stien "{1}".',
'FolderAlreadyExist':'Mappen "{0}" findes allerede i stien "{1}".',
'NewFilename':"Nyt filnavn",
'NewFolderName':"Nyt mappenavn",
'ProjectName':'Projektnavn',
'my_script':"min_script",
'my_examples':"mine_eksempler",
'CreatePathFileBeforeSaving':'Opret stier eller fil for "{0}" før du gemmer til projekt.',
'SaveToProject':'Gem til projekt',
'ProjectFiles':'Projektfiler',
'DeviceFiles':'Enhedsfiler',
'CouldNotRemoveFolder':'Kunne ikke fjerne mappen "{0}/{1}".',
'FolderNotEmpty':'Mappen "{0}/{1}" er ikke tom, kan ikke fjernes.',
'CreateScriptHere':'# Opret dit "{0}" script her',
WritingFile:'Skriver filen "{0}" til enhed.',

// Page Blocks
'ViewBlocksCode':'Vis/skjul blokke',
'BlocksEditAsFile':'Kopiér script og redigér',
'RunBlocks':'Kør blokke på enheden.',
'BlocksPy':'blocks.py',
  FetchingLib:'Installerer biblioteket {0}...',
  FetchingExample:'Henter eksempel {0}...',

// Page Device
'Unknown':'ukendt',
'ConnectedDevice':'Forbundet enhed',
'NotConnected':'Ikke forbundet',
'NoConnectedLong':'Ingen enhed forbundet, tilslut nedenfor!',
'NewConnection':'Ny forbindelse',
'NotSupported':'Ikke understøttet',
'ChangeTargetAnytime':'Skift projektmål når som helst',
'Disconnect':'Afbryd forbindelsen',
'GetInfo':'Hent info',
'TargetDevice':'Projektenhed',
'TargetFirmware':'Projektfirmware',
'ConnectedDevices':'Forbundne enheder',
'UsingThisDevice':'Bruger denne enhed',
'OnThisTab':'På denne fane',
'OnOtherTab':'På anden fane',
'DeviceUnresponsive':'Enheden {0} version {1} reagerer ikke, overvej at nulstille den.',
  BaudRate:'Baudrate',
'Address':'Adresse',
'Password':'Adgangskode',
'DevicePassword':'Enhedens adgangskode',
'DeviceAddress':'Enhedens adresse',
'WSWarning':'Kun wss virker i https',
'Connect':'Forbind',
'ScanDevices':'Scan enheder',
'ScanPattern':'Scan netværket for adresser som:',
'StartScan':'Start scanning',
'InvalidPrefix':'Ugyldigt netværkspræfiks',
'ScanningInfo':'Scannet {0} af {1} IP’er, fundet {2}:',
'DoneScanning':'Færdig med at scanne {0} IP’er, fundet {1}:',
ReconnectOnLost:'Genopret forbindelse hvis forbindelsen mistes',

// Status bar
'TasksRunning':'Kørende opgaver',
'StatusOngoingInput':'Modtager input',
'StatusReady':'Klar',
'StatusWorking':'Udfører {0} opgaver',
'StatusWorkingOne':'Udfører 1 opgave',
'NewWebSocket':'Ny WebSocket-forbindelse',
ChangeTheme:'Skift til mørkt/lyst tema',
'Language':'Sprog',

// Page Project
HelloUser:'Hej, ',
'YourProjects':'Dine projekter',
'SharedProjects':'Delte projekter',
'By':'Af',
'AUser':'anonym bruger',
'EditedAt':'Redigeret den',
'EmptyProject':'Tomt projekt',
'LoadMore':'Indlæs flere',
'NoOlderProjects':'Ingen ældre delte projekter',
'SharedProjectDoesNotExist':'Det delte projekt findes ikke længere',
ProjectFromURL:'Delt projekt fra link',
ClickToImport:'Tryk for at importere til dine projekter',

// Page Notification
'Forum':'Forum',
NewsAndAbout:'Nyheder og om',
NoNotification:'Der er ingen meddelelser',

// Page Prompt
'ClearConsole':'Ryd konsol',
'ResetDevice':'Nulstil enhed',
'StopExecution':'Stop udførsel',
'StopTimers':'Stop timere',
'DeviceInfo':'Enhedsinfo',
BridgeDataToEasyMQTT:'Omdiriger data til EasyMQTT',

// Page Dashboard
'DashboardName':'Dashboard-navn',
'Dashboard':'Dashboard',
'Session':'Session',
'MQTTSession':'MQTT-session',
'NewDashboard':'Nyt dashboard',
'EditData':'Rediger data',
'AddWidget':'Tilføj widget',
'EditDashboard':'Rediger dashboard',
'DismissPlugin':'Fjern widget',
'DeleteData':'Slet data',
'DownloadCSV':'Download CSV',
'DragMe':'Træk mig',

// Blocks
// Pinout
'DeviceChangedCheckPins':'Tjek pins, målenheden er ændret!',
block_delay: "forsinkelse",
seconds: "sekunder",
milliseconds: "millisekunder",
microseconds: "mikrosekunder",
ond: "på",
to: "til",
in: "i",
setpin: "Indstil output pin",
pin: "pin",
setPWMpin: "Sæt PWM Signal",
read_digital_pin: "læs digitalt input",
read_analog_pin: "læs analogt input",
show_iot: "vis på IoT-fanen",
data: "værdi",
set_rtc: "indstil dato og tid",
get_rtc: "hent dato og tid",
year: "år",
month: "måned",
day: "dag",
hour: "time",
minute: "minut",
second: "sekund",
wifi_scan: "scan wifi-netværk",
wifi_connect: "forbind til wifi-netværk",
wifi_name: "netværksnavn",
wifi_key: "nøgle/adgangskode",
easymqtt_start: "EasyMQTT Start",
easymqtt_publish: "EasyMQTT Udgiv Data",
topic: "emne",
session_id: "session ID",
file_open: "åbn fil",
file_name: "filnavn",
file_mode: "tilstand",
file_binary: "åbn i binær tilstand",
file_close: "luk fil",
file_write_line: "skriv linje til fil",
file_line: "linje",
try1: "prøv",
exp1: "undtagelse",
ntp_sync: "synkroniser dato og tid med NTP",
timezone: "tidszone",
project_info: "Projektinfo",
project_info_author: "Forfatter",
project_info_desc: "Beskrivelse",
easymqtt_subscribe: "EasyMQTT abonner på emne",
when: "når",
data_received: "modtages",
easymqtt_receive: "EasyMQTT modtag data",
relay: "relæ",
on: "tænd",
off: "sluk",
relay_on: "relæ på pin",
yes: "ja",
no: "nej",
wait_for_data: "vent på data",
dht_start: "Start DHT-sensor",
dht_measure: "opdater DHT11/22 sensor aflæsning",
dht_temp: "hent DHT11/22 temperatur",
dht_humi: "hent DHT11/22 luftfugtighed",
type: "type",
number: "nummer",
direction: "retning",
speed: "hastighed",
turn: "Drej",
degrees : "grader",
number_of : "antal",
brightness: "lysstyrke",
init: "Initialisere",
red: "rød",
green: "grøn",
blue: "blå",
set: "Sæt",
rotate: "Rotere",
left: "venstre",
right: "højre",
create: "Opret",
address: "adresse",
get_distance_from: "Få distance fra",
name: "navn",
no: "ingen",
color: "farve",
end: "Slut",
steps: "antal",
change: "Ændre",
add: "Tilføj",


//BMP180
pressure: "tryk",
temperature: "temperatur",
altitude: "højde",
bmp180_init: "Initier BMP180",

//SHT20
init_sht20: "Initier SHT20",
humidity: "luftfugtighed",

//Network
net_http_get: "HTTP GET-forespørgsel",
net_http_get_status: "HTTP-statuskode",
net_http_get_content: "HTTP-svarindhold",
net_http_server_start: "Start HTTP-webserver",
net_http_server_start_port: "Port",
net_http_server_wait: "Vent på HTTP-klient",
net_http_server_requested_page: "Anmodet webside",
net_http_server_send_response: "Send HTTP-svar",
net_http_server_send_html: "HTML",

//Splash screen
splash_welcome: "Velkommen til BIPES!",
splash_footer: "Vis ikke denne skærm igen",
splash_close: "Luk",
splash_message: "<p><b>BIPES: Blokbaseret Integreret Platform for Indlejrede Systemer</B> tillader tekst- og blokbaseret programmering for flere typer indlejrede systemer og Internet of Things-moduler ved hjælp af MicroPython, CircuitPython, Python eller Snek. Du kan oprette forbindelse, programmere, fejlfinde og overvåge flere typer af boards via netværk, USB eller Bluetooth. Se en liste over <a href=https://bipes.net.br/wp/boards/>kompatible boards her</a>. Kompatible boards inkluderer STM32, ESP32, ESP8266, Raspberry Pi Pico og endda Arduino. <p><b>BIPES</b> er fuldt <a href=https://bipes.net.br/wp/development/>open source</a> og baseret på HTML og JavaScript, så der kræves ingen softwareinstallation eller konfiguration, og du kan bruge det offline! Vi håber, at BIPES er nyttigt for dig, og at du nyder at bruge det. Hvis du har brug for hjælp, har vi nu et <a href=https://github.com/BIPES/BIPES/discussions>diskussionsforum</a>, hvor vi også poster <a href=https://github.com/BIPES/BIPES/discussions/categories/announcements>nye funktioner og meddelelser om BIPES</a>. Du er velkommen til at bruge det! Vi inviterer dig også til at bruge forummet til at give feedback og forslag til BIPES!</p><p>Nu kan du nemt indlæse MicroPython på din ESP32 eller ESP8226 til brug med BIPES: <a href=https://bipes.net.br/flash/esp-web-tools/>https://bipes.net.br/flash/esp-web-tools/</a></p><p>Se BIPES-bogen på <a href=https://bipes.net.br/wp/book-livro/>https://bipes.net.br/wp/book-livro/</a></p> <p>Tak fra BIPES-teamet!</p>"
}

