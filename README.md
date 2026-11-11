# KNIGHTSLIT.IO - Multiplayer Battle Royale

Multiplayerová aréna s ještěrkami, online režimem a lokální hrou pro dva hráče.

---

## 🚀 Jak hru nahrát na GitHub a spustit online ZDARMA

Aby si hru mohl kdokoliv otevřít z celého světa na mobilu nebo počítači a fungoval vám online multiplayer bez nutnosti cokoliv instalovat:

### Krok 1: Nahrání na GitHub
1. Vytvoř si na [GitHub.com](https://github.com) nový prázdný repozitář (např. `knightslit`).
2. V terminálu ve složce projektu spusť:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Knightslit.io"
   git branch -M main
   git remote add origin https://github.com/TVOJE_JMENO/knightslit.git
   git push -u origin main
   ```

---

### Krok 2: Spuštění serveru zdarma na Render.com (1 kliknutí)
Pro veřejný server doporučujeme **Render.com** (je zdarma a podporuje WebSockets i Python):

1. Jdi na [render.com](https://render.com) a přihlas se přes svůj GitHub účet.
2. Klikni na tlačítko **New +** ➔ **Web Service**.
3. Vyber svůj repozitář `knightslit`.
4. Render automaticky rozpozná nastavení z přiloženého `render.yaml` (případně zkontroluj: *Runtime: Python*, *Start Command: python3 server.py*).
5. Klikni na **Deploy Web Service**.
6. Během minuty dostaneš veřejnou adresu (např. `https://knightslit.onrender.com`).

👉 **A to je vše!** Tuhle adresu pošleš kamarádovi. Když na ni kdokoliv klikne odkudkoliv, hra se načte a online multiplayer přes 4-místný kód běží okamžitě na tomto centrálním serveru!

---

## 🎮 Herní módy
- **👤 Sólo:** Klasická hra proti 20+ autonomním botům.
- **👥 2 Hráči na 1 PC:** Hráč 1 ovládá myší, Hráč 2 klávesami WASD + Mezerník na jedné sdílené obrazovce.
- **🌐 Online:** Zadejte stejný 4-místný kód a hrajte spolu přes internet.
