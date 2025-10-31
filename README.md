# Ermot

Ermot : télécommande PC depuis mobile — contrôle souris, clavier, multimédia et volume facilement !

Ermot est une application Electron qui transforme votre téléphone en télécommande pour votre PC. Elle permet de contrôler la souris, le clavier, le multimédia, le volume et certaines actions système (verrouiller, veille, redémarrer, éteindre) depuis un navigateur mobile.

Ce dépôt contient :
- le code source de l'application Electron (`src/main` et `src/renderer`),
- un client web mobile (`mobile-client.html`) utilisé depuis le téléphone,
- la configuration de packaging (`forge.config.js`) pour produire des installateurs via Electron Forge.

---

## 1 — Installation & Utilisation

📥 Consultez [RELEASE_NOTES.md](RELEASE_NOTES.md) pour les instructions d'installation et d'utilisation détaillées.

---

## 2 — Quick start pour développeurs

Pré-requis : Node.js 18+, npm

Installer les dépendances :
```bash
npm install
```

Démarrer en développement (live reload) :
```bash
npm run dev
```

Compiler les styles (Tailwind) :
```bash
npm run prestart
```

Packager / créer des installateurs (Electron Forge) :
```bash
npm run package    # empaquette l'app
npm run make       # crée les installateurs (out/make)
```

Les artifacts sont générés dans `out/make`.

---

## 3 — Structure principale du projet

```
src/
 ├─ main/          # code du processus principal (server, qrcode, socket, autoLaunch...)
 └─ renderer/      # interface utilisateur
mobile-client.html  # client web mobile (QR scanner + UI)
forge.config.js     # configuration Electron Forge
package.json        # scripts & dépendances
```

---

## 4 — Fichiers importants

- `src/main/qrcode.js` : détection IP locale et génération du QR code.
- `src/main/mobileServer.js` : serveur web servant le client mobile.
- `src/main/socket.io.js` : logique Socket.IO (volume, souris, clavier, media, système).
- `src/main/logger.js` : logger central avec mode `minimal` configurable dans `config.js`.
- `src/main/autoLaunch.js` : helper pour lancer l'app au démarrage utilisateur.

---

## 5 — Aide rapide & dépannage

- Si le QR code n'apparaît pas : attendez 1–2s, ouvrez la console (Ctrl+Shift+I) et regardez les messages.
- Impossible de se connecter depuis le mobile : assurez-vous que le mobile et le PC sont sur le même réseau Wi‑Fi et que le port 9000 n'est pas bloqué.
- Problèmes avec RobotJS : installez les dépendances natives requises (Linux/macOS).

---

## 6 — Release et distribution

Pour publier les installateurs sur GitHub, utilisez la page Releases et attachez les fichiers générés (`Setup.exe`, `RELEASES`, `*.nupkg`, `checksums-sha256.txt`, etc.). Ne commitez pas les binaires dans le dépôt source.

---

## Licence

ISC