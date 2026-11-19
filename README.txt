VIXARIA MIX STUDIO 2.0 — PROTOTYP PWA

Wdrożone:
- lokalna baza IndexedDB,
- automatyczne zachowywanie projektów,
- przechowywanie oryginalnych plików audio i animacji,
- kolejność utworów, crossfade, wyrównanie poziomu,
- kodowanie mixu do MP3 przez lamejs (biblioteka pobierana przy pierwszym użyciu i cache'owana przez service worker),
- zapisywanie pliku wynikowego w projekcie do czasu pobrania,
- próba renderowania MP4 przez MediaRecorder + canvas + Web Audio, tylko jeśli przeglądarka deklaruje obsługę MP4,
- po uruchomieniu pobierania plik wynikowy jest usuwany z projektu po 4 sekundach; źródła i ustawienia pozostają.

Instalacja:
1. Wgraj cały katalog na hosting statyczny z HTTPS.
2. Otwórz URL w Chrome Android, poczekaj na pierwsze załadowanie.
3. Zainstaluj przez menu Chrome > Dodaj do ekranu głównego / Zainstaluj.
4. Pierwszy eksport MP3 wymaga internetu, aby pobrać bibliotekę lamejs. Service worker spróbuje zachować ją do użycia offline.

WAŻNE OGRANICZENIA PROTOTYPU:
- To prototyp do testów, nie gwarantuje renderowania długich setów na każdym Androidzie.
- Kodowanie MP3 dekoduje i miksuje cały zestaw w pamięci; bardzo długie pliki mogą przekroczyć pamięć telefonu.
- Eksport MP4 zależy od MediaRecorder i obsługi MP4 w konkretnej wersji Chrome/Android. Jeśli przeglądarka nie deklaruje MP4, eksport jest blokowany zamiast zapisywać WebM pod fałszywym rozszerzeniem.
- Renderowanie filmu odbywa się w czasie rzeczywistym; telefon musi pozostać włączony, a aplikacja na pierwszym planie.
- Nie ma jeszcze możliwości wznowienia renderowania MP4 od miejsca przerwania.
- MP4 przez MediaRecorder może mieć różną zgodność/parametry zależnie od urządzenia. Przetestuj krótki klip przed pełnym mixem.
- Projekt i pliki źródłowe pozostają lokalnie w pamięci przeglądarki. Wyczyść dane witryny = ryzyko utraty projektów. Warto robić kopie plików źródłowych.
- PWA wymaga HTTPS dla service workera i instalacji.

WERSJA 2.1 — POPRAWKA ANDROID:
- Import plików audio nie wymaga już wcześniejszego dekodowania przez AudioContext; odczyt długości jest wykonywany przez element audio HTML, a plik dodawany jest do projektu.
- Przycisk wyboru plików korzysta z przezroczystego pola pliku, aby poprawić obsługę dotyku w Chrome Android.
