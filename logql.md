# Logql basics

Depuis l’accueil grafana, cliquer sur Explore (la boussole a gauche)

Dans la fenêtre "log Browser" on peut entrer un requête.

Pour requêter sur des labels, il faut utiliser des {}

Les labels existants sont app, env, level, server

de l'auto completion est disponible avec ctrl + space

exemple de requête pour les logs blueway dev:

`{app="Blueway",env="DEV"}`

on execute la requête avec shift + enter

On peut choisir en haut a droite la fréquence de refresh ou passer en mode live pour voir les logs en temps reel

Pour rechercher le contenue des logs, on utilise par exemple 

`{app="Blueway",env="DEV"} |= "Svc"`

qui ramène les lignes contenant Svc, on peut ensuite par exemple suivre un ID d'exec correspondant 

`{app="Blueway",env="DEV"} |= "[EAII453389193940_4466]"`

Pour plus de detail, voir la doc LogQL https://grafana.com/docs/loki/latest/logql/