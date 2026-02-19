# 🎵 Mozikako

**Mozikako** est une application musicale minimaliste et puissante qui centralise vos recherches sur Spotify, YouTube et iTunes. Écoutez des extraits, créez des mix intelligents via IA et gérez votre bibliothèque en un seul endroit.

## 🚀 Lancement Rapide (Windows)

Double-cliquez simplement sur :
👉 **`Lancer_Mozikako.bat`**

Cela va :
1. Installer les dépendances nécessaires (la première fois).
2. Lancer le serveur local.
3. Ouvrir l'application dans une fenêtre dédiée.

## ✨ Fonctionnalités

- **Recherche Universelle** : Accédez instantanément aux titres d'iTunes et aux vidéos YouTube.
- **Lecteur Audio Intégré** : Écoutez les extraits de 30 secondes (via iTunes) avec une interface premium.
- **Smart Mix (IA)** : Générez des playlists instantanées basées sur votre "vibe" (Focus, Chill, Party, Energy).
- **Design Apple Minimalist** : Une interface sombre, fluide et optimisée pour mobile et desktop.
- **Bibliothèque Personnelle** : Likez vos morceaux préférés pour les retrouver plus tard.
- **PWA Ready** : Installable sur votre téléphone ou PC comme une application native.

## 🛠️ Commandes Développeur

Si vous préférez utiliser le terminal :

```bash
# Installation
npm install

# Développement
npm run dev

# Construction (Production)
npm run build

# Android (Nécessite Android Studio)
npx cap sync android
npx cap open android
```

## 📱 Android & Publication

L'application est configurée avec **Capacitor**. Pour générer l'APK :
1. `npm run build`
2. `npx cap sync android`
3. Ouvrez le dossier `android` dans Android Studio et générez le "Signed Bundle/APK".

---
*Fait avec ❤️ pour une expérience musicale sans frontières.*
