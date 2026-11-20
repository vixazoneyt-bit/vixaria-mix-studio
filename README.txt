VIXARIA MIX STUDIO 2.4 – FAST RENDER (EKSPERYMENTALNY)

Nowy tryb eksportu MP4 wykorzystuje Mediabunny + WebCodecs (AVC/H.264 i AAC), z preferencją kodowania sprzętowego. Klatki animacji są pobierane z pliku źródłowego i zapisywane z własnymi znacznikami czasu, bez nagrywania ekranu w czasie rzeczywistym.

WAŻNE OGRANICZENIA:
- To wersja testowa. Składnia JavaScript została sprawdzona, ale nie została jeszcze przetestowana na telefonie użytkownika.
- Długie pliki wymagają obsługi window.showSaveFilePicker w Chrome, aby strumieniować MP4 bezpośrednio na dysk i uniknąć ogromnego zużycia RAM.
- Jeśli API zapisu nie jest dostępne, tryb buforowy jest ograniczony do 5 minut; dla krótkich filmów aplikacja może wrócić do eksportu MediaRecorder w czasie rzeczywistym.
- Biblioteka Mediabunny jest pobierana z jsDelivr, więc pierwszy eksport wymaga internetu.
- Szybkość zależy od dekodera animacji, enkodera H.264, temperatury i obciążenia telefonu. Brak gwarancji renderowania szybszego niż czas rzeczywisty.
- Zachowano projekt, pliki źródłowe i stary silnik zgodnościowy.

Pliki należy umieścić bezpośrednio w głównym katalogu repozytorium GitHub Pages. Nie umieszczać tu prywatnych plików MP3/MP4.
