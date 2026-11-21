VIXARIA MIX STUDIO 2.6 – AUDIO REACTIVE IMAGE

Nowość: po wybraniu statycznego obrazu można włączyć pulsowanie skali obrazu zależne od poziomu sygnału audio, powolne przybliżanie oraz pulsowanie różowej poświaty. Ustawienia efektów są dostępne w punkcie 3 i dotyczą trybu statycznego obrazu.

Silnik szybkiego eksportu MP4 wykorzystuje Mediabunny + WebCodecs (AVC/H.264 i AAC), z preferencją kodowania sprzętowego. Poziom audio jest analizowany z buforów audio podczas przygotowania ścieżki, a efekt jest nanoszony na kolejne klatki Full HD.

WAŻNE OGRANICZENIA:
- To nowa funkcja wymagająca testu na telefonie. Składnia JavaScript została sprawdzona, ale nie potwierdzono jeszcze poprawności wizualnej i wydajności na urządzeniu użytkownika.
- Pulsowanie reaguje na poziom głośności/energii sygnału, nie na rozpoznawanie tempa/BPM ani dokładne wykrywanie uderzeń basu.
- Efekty audio-reactive są w szybkim silniku WebCodecs. Tryb zgodnościowy MediaRecorder może nie odtwarzać tych samych efektów.
- Długie pliki wymagają obsługi window.showSaveFilePicker w Chrome, aby strumieniować MP4 bezpośrednio na dysk i ograniczyć zużycie RAM.
- Jeśli API zapisu nie jest dostępne, tryb buforowy jest ograniczony do 5 minut; dla krótkich filmów aplikacja może wrócić do eksportu MediaRecorder w czasie rzeczywistym.
- Biblioteka Mediabunny jest pobierana z jsDelivr, więc pierwszy eksport wymaga internetu.
- Szybkość zależy od dekodera, enkodera H.264, temperatury i obciążenia telefonu.
- Zachowano projekty, pliki źródłowe i silnik zgodnościowy.

Pliki należy umieścić bezpośrednio w głównym katalogu repozytorium GitHub Pages. Nie umieszczać tu prywatnych plików MP3/MP4.
