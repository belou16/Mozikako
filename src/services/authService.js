/**
 * MOZIKAKO — Auth Service
 * Handles OAuth2 flows for Spotify and Apple Music
 */

const SPOTIFY_AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const SCOPES = [
  "user-read-currently-playing",
  "user-read-recently-played",
  "user-read-playback-state",
  "user-top-read",
  "user-modify-playback-state",
  "streaming",
  "user-read-email",
  "user-read-private",
  "playlist-read-private"
];

export const spotifyAuth = {
  loginUrl: `${SPOTIFY_AUTH_ENDPOINT}?client_id=${import.meta.env.VITE_SPOTIFY_CLIENT_ID}&redirect_uri=${encodeURIComponent(import.meta.env.VITE_SPOTIFY_REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES.join(" "))}&response_type=token&show_dialog=true`,
};

export const deezerAuth = {
  loginUrl: `https://connect.deezer.com/oauth/auth.php?app_id=${import.meta.env.VITE_DEEZER_APP_ID}&redirect_uri=${encodeURIComponent(import.meta.env.VITE_DEEZER_REDIRECT_URI)}&perms=basic_access,email,offline_access,manage_library,delete_library&response_type=token`,
};

export const authUtils = {
  getParamsFromUrl: () => {
    // Support hash (Spotify) and search (Deezer)
    const source = window.location.hash || window.location.search;
    return source
      .substring(1)
      .split("&")
      .reduce((initial, item) => {
        if (item) {
          let parts = item.split("=");
          initial[parts[0]] = decodeURIComponent(parts[1]);
        }
        return initial;
      }, {});
  }
};

export const appleAuth = {
  // Apple MusicKit implementation
  init: async () => {
    if (window.MusicKit) {
      return await window.MusicKit.configure({
        developerToken: import.meta.env.VITE_APPLE_MUSIC_DEV_TOKEN,
        app: {
          name: 'Mozikako',
          build: '1.0.0'
        }
      });
    }
  }
};

