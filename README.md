# siz-migrate-to-ghost
Permet de migrer les données (stories) depuis notre datastore mongo vers un post Ghost.

# Utilisation
Ghost ne gère pas pour le moment, officiellement, d'authent stateless par token. Mais on peut quand même bricoler un truc: Après un login correct à l'inteface (/ghost) , en inspectant les requêtes sortantes, on observe un en-tête `Authentication: Bearer ABCDEF123123.....ACFBF` réutilisable.

On lance le script d'import en positionnant les variables d'environnement:
 - AUTH_TOKEN est la valeur suivant Bearer dans l'en-tête cité plus haut.
 - MONGO_URI et GHOST_URL sont respectivement les informations relatives à mongo et ghost.

# Éxécution
npm install
`AUTH_TOKEN=  GHOST_URL=http://localhost:2368/  MONGO_URI=mongodb://localhost:27017/siz node migrate.js`
