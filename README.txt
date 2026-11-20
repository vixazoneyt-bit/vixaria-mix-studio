VIXARIA MIX STUDIO 2.2 — POPRAWKA EKSPORTU

Zachowuje funkcje wersji 2.1: projekty IndexedDB, źródłowe pliki audio, kolejność utworów, crossfade, normalizację, eksport MP3 i animację.

Poprawki:
- nowy identyfikator cache service workera, aby Chrome pobrał aktualne pliki;
- poprawiona obsługa kończenia eksportu MP4 i sprzątania zasobów;
- eksport MP4 pozostaje w projekcie po wygenerowaniu;
- pobranie MP3 nie usuwa go z projektu przed ukończeniem MP4;
- roboczy MP3 jest usuwany dopiero po pobraniu MP3 i wygenerowaniu filmu MP4;
- błędy eksportu pokazują komunikat, a projekt i źródła pozostają zachowane.

OGRANICZENIA:
- MP4 nadal renderowany jest w czasie rzeczywistym przez MediaRecorder; mix 60 minut wymaga około 60 minut renderowania.
- Telefon musi pozostać włączony, Chrome na pierwszym planie.
- To poprawka stabilności prototypu, nie szybki eksport 60–90 minut.
- Nie umieszczaj prywatnych utworów ani projektów w publicznym repozytorium.
