// Réglages globaux de l'application — modifiables ici en un seul endroit.
export const APP_NAME = "Achats";
export const APP_DESCRIPTION =
  "Comparez les prix de vos fournisseurs et envoyez vos bons de commande.";

// Devise & locale d'affichage. Changer APP_CURRENCY en "MAD", "USD", "TND"… si besoin.
export const APP_LOCALE = "fr-FR";
export const APP_CURRENCY = "EUR";

// Sécurité connexion : verrouillage anti-bruteforce.
export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_LOCK_MINUTES = 15;
